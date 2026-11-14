"use strict";
/**
 * Comando /construir-servidor — fluxo completo:
 *   1. Coleta estado atual do servidor (Fase 2)
 *   2. Gera plano com IA usando opcoes (estilo/tamanho/idioma) (Fase 4)
 *   3. Mostra preview com botoes Confirmar/Regerar/Cancelar (Fase 1)
 *   4. Ao confirmar, aplica com progress streaming no embed (Fase 5)
 *   5. Persiste a geracao no DB para suporte a /desfazer-servidor (Fase 7)
 *
 * As mensagens iniciais nos canais (Fase 6) e o suporte a is_readonly/
 * writable_roles + fallback Community (Fase 3) ficam no serverBuilder.buildServer.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleConstruirServidor = handleConstruirServidor;
exports.handleServerBuilderButton = handleServerBuilderButton;
exports.handleDesfazerServidor = handleDesfazerServidor;
const discord_js_1 = require("discord.js");
const crypto_1 = require("crypto");
const services_1 = require("../../shared/services");
const server_builder_service_1 = require("../../shared/services/server-builder.service");
const ai_limit_service_1 = require("../../shared/services/ai-limit.service");
const database_1 = require("../../shared/services/database");
const PREVIEW_TTL_MS = 5 * 60 * 1000; // 5 min — tempo que o preview fica valido
const CONFIRM_PREFIX = 'srvgen';
const pendingPreviews = new Map();
function cachePreview(p) {
    const id = (0, crypto_1.randomUUID)().slice(0, 8);
    pendingPreviews.set(id, { ...p, expiresAt: Date.now() + PREVIEW_TTL_MS });
    setTimeout(() => pendingPreviews.delete(id), PREVIEW_TTL_MS).unref?.();
    return id;
}
function buildPreviewEmbed(schema, theme, options) {
    const roles = schema.roles || [];
    const categories = schema.categories || [];
    const totalChannels = categories.reduce((acc, c) => acc + (c.channels?.length || 0), 0);
    const totalMessages = categories.reduce((acc, c) => acc + (c.channels?.filter((ch) => ch.initial_message?.trim()).length || 0), 0);
    const roleList = roles
        .slice(0, 8)
        .map((r) => `• ${r.name}`)
        .join('\n');
    const categoryList = categories
        .slice(0, 6)
        .map((cat) => `**${cat.name}** — ${cat.channels?.length || 0} canais`)
        .join('\n');
    const optsLine = [
        options.estilo && `estilo: \`${options.estilo}\``,
        options.tamanho && `tamanho: \`${options.tamanho}\``,
        options.idioma && `idioma: \`${options.idioma}\``,
    ]
        .filter(Boolean)
        .join(' • ') || 'sem opcoes';
    return new discord_js_1.EmbedBuilder()
        .setTitle('🏗️ Pré-visualização do Servidor')
        .setDescription(`Tema: **${theme.slice(0, 100)}**\n${optsLine}\n\n` +
        `Pronto para criar **${roles.length} cargos**, **${categories.length} categorias** e ` +
        `**${totalChannels} canais**` +
        (totalMessages > 0 ? ` (${totalMessages} com mensagens iniciais)` : '') +
        '.')
        .addFields({
        name: `🎭 Cargos (${roles.length})`,
        value: roleList || '_nenhum_',
        inline: false,
    }, {
        name: `📂 Categorias (${categories.length})`,
        value: categoryList || '_nenhuma_',
        inline: false,
    })
        .setColor(0x5865f2)
        .setFooter({ text: 'Confirme em 5 min ou o preview expira.' });
}
function buildConfirmRow(previewId) {
    return new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId(`${CONFIRM_PREFIX}:confirm:${previewId}`)
        .setLabel('Confirmar')
        .setEmoji('✅')
        .setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder()
        .setCustomId(`${CONFIRM_PREFIX}:regen:${previewId}`)
        .setLabel('Regerar')
        .setEmoji('🔄')
        .setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder()
        .setCustomId(`${CONFIRM_PREFIX}:cancel:${previewId}`)
        .setLabel('Cancelar')
        .setEmoji('❌')
        .setStyle(discord_js_1.ButtonStyle.Secondary));
}
function buildProgressEmbed(p, theme) {
    const pct = p.total > 0 ? Math.round((p.current / p.total) * 100) : 0;
    const bar = renderBar(pct);
    const phaseEmoji = {
        roles: '🎭',
        categories: '📂',
        channels: '💬',
        messages: '📨',
        done: '✨',
    };
    return new discord_js_1.EmbedBuilder()
        .setTitle(`${phaseEmoji[p.phase]} Construindo servidor...`)
        .setDescription(`Tema: **${theme.slice(0, 80)}**\n\n` +
        `**${p.label}**\n` +
        `\`${bar}\` ${pct}% (${p.current}/${p.total})`)
        .setColor(p.phase === 'done' ? 0x57f287 : 0xfee75c);
}
function renderBar(pct, width = 20) {
    const filled = Math.round((pct / 100) * width);
    return '█'.repeat(filled) + '░'.repeat(width - filled);
}
// ═══════════════════════════════════════════════════════════════════════════
// Handler principal: /construir-servidor
// ═══════════════════════════════════════════════════════════════════════════
async function handleConstruirServidor(interaction) {
    if (!interaction.guildId || !interaction.guild) {
        await interaction.reply({ content: '❌ Use em um servidor.', ephemeral: true });
        return;
    }
    const theme = interaction.options.getString('tema', true);
    const estilo = (interaction.options.getString('estilo') ||
        undefined);
    const tamanho = (interaction.options.getString('tamanho') ||
        undefined);
    const idioma = (interaction.options.getString('idioma') ||
        undefined);
    const considerar_existente = interaction.options.getBoolean('considerar_existente') ?? true;
    const options = { estilo, tamanho, idioma };
    await interaction.deferReply({ ephemeral: false });
    // Checar limite de geracoes
    const limit = await (0, ai_limit_service_1.checkServerGenLimit)(interaction.user.id);
    if (!limit.allowed) {
        await interaction.editReply(`⚠️ Limite de gerações atingido (${limit.limit}/mês no plano **${limit.plan}**). ` +
            `Faça upgrade no painel para gerar mais servidores.`);
        return;
    }
    // Fase 2: estado atual (se solicitado)
    const existingState = considerar_existente
        ? server_builder_service_1.serverBuilder.collectExistingState(interaction.guild)
        : undefined;
    await interaction.editReply('🧠 Projetando estrutura com IA...');
    const schema = await server_builder_service_1.serverBuilder.generateServerPlan(theme, options, existingState);
    if (!schema) {
        await interaction.editReply('❌ A IA não conseguiu gerar um plano. Tente reescrever o tema.');
        return;
    }
    // Cacheia preview e mostra com botoes
    const previewId = cachePreview({
        theme,
        options,
        schema,
        userId: interaction.user.id,
        guildId: interaction.guildId,
    });
    await interaction.editReply({
        content: '',
        embeds: [buildPreviewEmbed(schema, theme, options)],
        components: [buildConfirmRow(previewId)],
    });
}
// ═══════════════════════════════════════════════════════════════════════════
// Handler de botoes (confirm/regen/cancel)
// ═══════════════════════════════════════════════════════════════════════════
async function handleServerBuilderButton(interaction) {
    const parts = interaction.customId.split(':');
    if (parts[0] !== CONFIRM_PREFIX)
        return;
    const action = parts[1];
    const previewId = parts[2];
    const preview = pendingPreviews.get(previewId);
    if (!preview) {
        await interaction.reply({
            content: '⚠️ Pré-visualização expirou. Rode `/construir-servidor` novamente.',
            ephemeral: true,
        });
        return;
    }
    if (interaction.user.id !== preview.userId) {
        await interaction.reply({
            content: '⚠️ Apenas quem invocou o comando pode confirmar.',
            ephemeral: true,
        });
        return;
    }
    if (action === 'cancel') {
        pendingPreviews.delete(previewId);
        await interaction.update({
            content: '❌ Geração cancelada.',
            embeds: [],
            components: [],
        });
        return;
    }
    if (action === 'regen') {
        await interaction.update({
            content: '🔄 Regerando estrutura...',
            embeds: [],
            components: [],
        });
        const existingState = server_builder_service_1.serverBuilder.collectExistingState(interaction.guild);
        const newSchema = await server_builder_service_1.serverBuilder.generateServerPlan(preview.theme, preview.options, existingState);
        if (!newSchema) {
            await interaction.editReply({ content: '❌ Falha ao regerar. Tente novamente.' });
            return;
        }
        pendingPreviews.delete(previewId);
        const newId = cachePreview({ ...preview, schema: newSchema });
        await interaction.editReply({
            content: '',
            embeds: [buildPreviewEmbed(newSchema, preview.theme, preview.options)],
            components: [buildConfirmRow(newId)],
        });
        return;
    }
    if (action === 'confirm') {
        pendingPreviews.delete(previewId);
        await applySchema(interaction, preview);
        return;
    }
}
async function applySchema(interaction, preview) {
    const guild = interaction.guild;
    // Throttle das edits de progress para nao bater rate limit
    // (Discord aceita ~5 edits/5s, vamos editar no maximo a cada 1.5s)
    let lastEditAt = 0;
    let pendingProgress = null;
    let editing = false;
    const flushProgress = async () => {
        if (!pendingProgress || editing)
            return;
        const now = Date.now();
        if (now - lastEditAt < 1500)
            return;
        editing = true;
        const snapshot = pendingProgress;
        pendingProgress = null;
        try {
            await interaction.editReply({
                content: '',
                embeds: [buildProgressEmbed(snapshot, preview.theme)],
                components: [],
            });
            lastEditAt = Date.now();
        }
        catch (err) {
            services_1.logger.warn('[ServerBuilder] Falha ao editar progress', { err });
        }
        finally {
            editing = false;
        }
    };
    // Tick que tenta flushar progresso a cada 1.5s
    const progressTimer = setInterval(() => { flushProgress().catch(() => { }); }, 1500);
    progressTimer.unref?.();
    await interaction.update({
        content: '',
        embeds: [
            buildProgressEmbed({ phase: 'roles', current: 0, total: preview.schema.roles?.length || 0, label: 'Iniciando...' }, preview.theme),
        ],
        components: [],
    });
    try {
        const result = await server_builder_service_1.serverBuilder.buildServer(guild, preview.schema, (p) => {
            pendingProgress = p;
        });
        clearInterval(progressTimer);
        // Forca ultima edicao com estado final
        await interaction.editReply({
            embeds: [
                buildProgressEmbed({
                    phase: 'done',
                    current: result.channel_ids.length,
                    total: result.channel_ids.length,
                    label: `Pronto! ${result.role_ids.length} cargos, ${result.category_ids.length} categorias, ${result.channel_ids.length} canais.`,
                }, preview.theme),
            ],
        });
        await (0, ai_limit_service_1.incrementServerGenUsage)(preview.userId);
        // Persiste para suporte a undo
        try {
            await (0, database_1.saveServerGeneration)((0, crypto_1.randomUUID)(), preview.guildId, preview.userId, preview.theme, preview.schema, result.role_ids, result.category_ids, result.channel_ids);
        }
        catch (err) {
            services_1.logger.warn('[ServerBuilder] Falha ao salvar geracao no DB (undo nao disponivel)', { err });
        }
        const errorNote = result.errors.length > 0
            ? `\n\n⚠️ ${result.errors.length} item(s) falharam:\n` +
                result.errors.slice(0, 5).map(e => `• ${e}`).join('\n') +
                (result.errors.length > 5 ? `\n• ... +${result.errors.length - 5}` : '')
            : '';
        await interaction.followUp({
            content: `✅ **Servidor construído!** Use \`/desfazer-servidor\` em até 24h se quiser reverter.` +
                errorNote,
            ephemeral: false,
        });
    }
    catch (error) {
        clearInterval(progressTimer);
        services_1.logger.error('Erro ao construir servidor', { error });
        const msg = String(error?.message || 'erro desconhecido').slice(0, 1800);
        await interaction.followUp({
            content: `❌ Erro durante a construção: ${msg}`,
            ephemeral: true,
        });
    }
}
// ═══════════════════════════════════════════════════════════════════════════
// /desfazer-servidor — apaga recursos da ultima geracao (Fase 7)
// ═══════════════════════════════════════════════════════════════════════════
async function handleDesfazerServidor(interaction) {
    if (!interaction.guildId || !interaction.guild) {
        await interaction.reply({ content: '❌ Use em um servidor.', ephemeral: true });
        return;
    }
    await interaction.deferReply({ ephemeral: true });
    const last = await (0, database_1.getLastServerGeneration)(interaction.guildId);
    if (!last) {
        await interaction.editReply('ℹ️ Nenhuma geração ativa para desfazer neste servidor.');
        return;
    }
    const ageMin = Math.round((Date.now() - new Date(last.created_at).getTime()) / 60000);
    if (ageMin > 24 * 60) {
        await interaction.editReply(`⚠️ A última geração tem ${Math.round(ageMin / 60)}h — limite de undo é 24h.`);
        return;
    }
    const guild = interaction.guild;
    let deleted = 0;
    let failed = 0;
    // Apagar canais primeiro, depois categorias, depois cargos
    for (const id of [...last.channel_ids, ...last.category_ids]) {
        try {
            const ch = await guild.channels.fetch(id).catch(() => null);
            if (ch) {
                await ch.delete('Undo via /desfazer-servidor');
                deleted++;
            }
        }
        catch {
            failed++;
        }
    }
    for (const id of last.role_ids) {
        try {
            const role = await guild.roles.fetch(id).catch(() => null);
            if (role) {
                await role.delete('Undo via /desfazer-servidor');
                deleted++;
            }
        }
        catch {
            failed++;
        }
    }
    await (0, database_1.markServerGenerationUndone)(last.id);
    await interaction.editReply(`✅ Desfeito! ${deleted} recursos removidos` +
        (failed > 0 ? ` (${failed} falharam — talvez já tenham sido apagados manualmente).` : '.'));
}
//# sourceMappingURL=command.js.map