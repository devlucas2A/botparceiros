"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.THEME = void 0;
exports.sendTicketPanel = sendTicketPanel;
exports.createTicketChannel = createTicketChannel;
exports.handleTicketClaim = handleTicketClaim;
exports.closeTicketProcess = closeTicketProcess;
const discord_js_1 = require("discord.js");
const services_1 = require("../../shared/services");
const analytics_service_1 = require("../../shared/services/analytics.service");
// ═══════════════════════════════════════════════════════════════════════════
// 🎨 CONSTANTES & DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════
exports.THEME = {
    colors: {
        primary: 0x5865F2,
        success: 0x2ECC71,
        danger: 0xE74C3C,
        warning: 0xF1C40F,
        info: 0x3498DB
    },
    emojis: {
        ticket: '🎫',
        close: '🔒',
        claim: '🙋‍♂️',
        star: '✨',
        warning: '⚠️',
        log: '📜',
        user: '👤',
        success: '✅',
        error: '❌',
        edit: '✏️',
        delete: '🗑️'
    }
};
// Alias internal defaults to THEME for consistency within this file
const DEFAULT_COLORS = exports.THEME.colors;
const DEFAULT_EMOJIS = exports.THEME.emojis;
const DEFAULT_BANNER = 'https://placehold.co/1200x400/1e1e2e/ffffff.png?text=CoreBot+Tickets&font=montserrat';
// ═══════════════════════════════════════════════════════════════════════════
// 🧠 LÓGICA DE SERVIÇO (Implementação Baseada no Frontend)
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Envia o painel de tickets para o canal especificado.
 * Baseado nas configurações de `TicketConfigForm.tsx` e `TicketDashboardClient.tsx`
 */
async function sendTicketPanel(channel, guildId) {
    const categories = await (0, services_1.getTicketCategories)(guildId);
    const guildConfig = await (0, services_1.getGuildConfig)(guildId);
    // Default Values (Generic - No "Nexstar" hardcoded)
    let title = 'Central de Tickets';
    let description = 'Selecione uma categoria abaixo para abrir seu ticket.';
    let banner = DEFAULT_BANNER;
    let color = DEFAULT_COLORS.primary;
    let footerText = 'Sistema de Tickets';
    // Apply DB Config (Matches TicketDashboardClient props)
    if (guildConfig) {
        services_1.logger.info(`Sending Ticket Panel for ${guildId}`, {
            db_banner: guildConfig.ticket_panel_banner_url,
            db_title: guildConfig.ticket_panel_title
        });
        if (guildConfig.ticket_panel_title)
            title = guildConfig.ticket_panel_title;
        if (guildConfig.ticket_panel_description)
            description = guildConfig.ticket_panel_description;
        if (guildConfig.ticket_panel_banner_url)
            banner = guildConfig.ticket_panel_banner_url;
        if (guildConfig.ticket_panel_color)
            color = guildConfig.ticket_panel_color;
        if (guildConfig.ticket_panel_footer)
            footerText = guildConfig.ticket_panel_footer;
    }
    else {
        services_1.logger.warn(`No GuildConfig found for ${guildId} when sending panel`);
    }
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: footerText })
        .setTimestamp();
    if (banner) {
        embed.setImage(banner);
        embed.setThumbnail(banner);
    }
    // Configuração de Componentes (Select Menu ou Botão de Aviso)
    if (categories.length === 0) {
        const warningEmbed = new discord_js_1.EmbedBuilder()
            .setColor(DEFAULT_COLORS.warning)
            .setTitle(`${DEFAULT_EMOJIS.warning} Configuração Necessária`)
            .setDescription('Nenhuma categoria de ticket foi encontrada.\n\nPor favor, crie categorias através do comando `/ticket-categoria criar` ou pelo painel web.');
        await channel.send({ embeds: [embed, warningEmbed] });
        return;
    }
    // Criação do Menu de Seleção baseado nas categorias ativas
    const options = categories.map(cat => ({
        label: cat.name,
        description: (cat.description || 'Sem descrição').substring(0, 100),
        value: cat.id,
        emoji: cat.emoji || DEFAULT_EMOJIS.ticket
    }));
    const selectMenu = new discord_js_1.StringSelectMenuBuilder()
        .setCustomId('ticket_category_select')
        .setPlaceholder('Selecione uma categoria...')
        .addOptions(options);
    const row = new discord_js_1.ActionRowBuilder().addComponents(selectMenu);
    await channel.send({ embeds: [embed], components: [row] });
}
/**
 * Cria o canal de ticket baseado na categoria selecionada.
 * Baseado na estrutura de `TicketForm.tsx` (TicketCategory)
 */
async function createTicketChannel(guild, member, categoryId) {
    const guildConfig = await (0, services_1.getGuildConfig)(guild.id);
    const categories = await (0, services_1.getTicketCategories)(guild.id);
    const category = categories.find(c => c.id === categoryId);
    if (!category)
        return "CATEGORY_NOT_FOUND";
    // Check for existing ticket
    const existingChannel = guild.channels.cache.find(ch => ch.name === `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
    if (existingChannel)
        return existingChannel.toString();
    try {
        // Hierarquia de Configuração: Categoria Específica > Configuração Global > Defaults
        // 1. Categoria Pai (Discord Category ID)
        const parentCategory = category.ticket_channel_category_id; // From TicketForm: ID da Categoria Discord
        // 2. Cargo de Suporte (Support Role ID)
        const staffRoleId = category.support_role_id || guildConfig?.staff_role_id; // From TicketForm: ID do Cargo Suporte
        // 3. Permissões
        const permissionOverwrites = [
            {
                id: guild.id,
                deny: discord_js_1.PermissionFlagsBits.ViewChannel,
                type: discord_js_1.OverwriteType.Role
            },
            {
                id: member.id,
                allow: discord_js_1.PermissionFlagsBits.ViewChannel | discord_js_1.PermissionFlagsBits.SendMessages | discord_js_1.PermissionFlagsBits.ReadMessageHistory,
                type: discord_js_1.OverwriteType.Member
            }
        ];
        if (staffRoleId) {
            permissionOverwrites.push({
                id: staffRoleId,
                allow: discord_js_1.PermissionFlagsBits.ViewChannel | discord_js_1.PermissionFlagsBits.SendMessages | discord_js_1.PermissionFlagsBits.ReadMessageHistory | discord_js_1.PermissionFlagsBits.ManageMessages,
                type: discord_js_1.OverwriteType.Role
            });
        }
        // Create Channel
        // Fix lint: explicitly type options to satisfy create
        // Check if parentCategory is a valid snowflake (17-20 digits)
        const validParent = parentCategory && /^\d{17,20}$/.test(parentCategory) ? parentCategory : undefined;
        const channelOptions = {
            name: `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
            type: discord_js_1.ChannelType.GuildText,
            parent: validParent,
            permissionOverwrites
        };
        services_1.logger.info('Creating ticket channel', {
            options: JSON.stringify(channelOptions, (_key, value) => typeof value === 'bigint' ? value.toString() : value)
        });
        const ticketChannel = await guild.channels.create(channelOptions);
        // 4. Welcome Embed Customization (From TicketForm: Título e Descrição do Embed)
        const embedTitle = category.welcome_title || `Ticket Aberto: ${category.name}`;
        let embedDesc = category.welcome_description ||
            `Olá, ${member.user}!\n\nSeu ticket foi criado na categoria **${category.name}**.\nAguarde, nossa equipe irá atendê-lo em breve.`;
        // Replace variables if configured
        embedDesc = embedDesc
            .replace(/{user}/g, `${member.user}`)
            .replace(/{category}/g, category.name);
        const ticketEmbed = new discord_js_1.EmbedBuilder()
            .setColor(category.color ? (category.color.startsWith('#') ? parseInt(category.color.replace('#', ''), 16) : DEFAULT_COLORS.primary) : DEFAULT_COLORS.primary)
            .setAuthor({
            name: `${guild.name} • Suporte ao Cliente`,
            iconURL: guild.iconURL({ extension: 'png', size: 128 }) || undefined
        })
            .setTitle(`🎫 ${embedTitle}`)
            .setDescription(`${embedDesc}\n\n>>> 💡 *Para agilizar o seu atendimento, por favor, detalhe o seu problema ou dúvida da forma mais completa possível.*`)
            .addFields({ name: `👤 Emitente`, value: `${member.user}`, inline: true }, { name: `🏷️ Departamento`, value: `\`${category.name.toUpperCase()}\``, inline: true }, { name: `\u200B`, value: `\u200B`, inline: false } // space break
        )
            .setThumbnail(member.user.displayAvatarURL({ extension: 'png', size: 256 }))
            .setFooter({ text: 'Sistema de Tickets Seguro' })
            .setTimestamp();
        // Buttons
        const closeButton = new discord_js_1.ButtonBuilder()
            .setCustomId(`close_ticket_${member.id}_${category.name}`)
            .setLabel('Encerrar Atendimento')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji(DEFAULT_EMOJIS.close);
        const claimButton = new discord_js_1.ButtonBuilder()
            .setCustomId(`claim_ticket`)
            .setLabel('Assumir Chamado')
            .setStyle(discord_js_1.ButtonStyle.Primary)
            .setEmoji('👋');
        const row = new discord_js_1.ActionRowBuilder().addComponents(closeButton, claimButton);
        const pingRole = staffRoleId ? `<@&${staffRoleId}>` : '';
        await ticketChannel.send({
            content: `${member.user} ${pingRole}`,
            embeds: [ticketEmbed],
            components: [row]
        });
        // Register in DB
        await (0, services_1.createTicket)(guild.id, ticketChannel.id, member.id, category.name);
        await (0, services_1.logAudit)(guild.id, member.id, 'TICKET_CREATED', ticketChannel.id, {
            category: category.name,
            channel_name: ticketChannel.name
        });
        (0, analytics_service_1.trackEvent)(guild.id, 'ticket_open').catch(() => { });
        return ticketChannel;
    }
    catch (error) {
        services_1.logger.error('Erro ao criar canal de ticket', { error });
        throw error;
    }
}
/**
 * Lida com o botão de assumir ticket.
 */
async function handleTicketClaim(interaction) {
    const guildConfig = await (0, services_1.getGuildConfig)(interaction.guildId);
    const member = interaction.member;
    // Check permissions
    const isStaff = member.permissions.has(discord_js_1.PermissionFlagsBits.ManageMessages)
        || (guildConfig?.staff_role_id && member.roles.cache.has(guildConfig.staff_role_id));
    if (!isStaff) {
        await interaction.reply({ content: `${DEFAULT_EMOJIS.error} Apenas a equipe pode assumir tickets!`, ephemeral: true });
        return;
    }
    const channel = interaction.channel;
    await (0, services_1.claimTicket)(channel.id, member.id);
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(DEFAULT_COLORS.success)
        .setDescription(`${DEFAULT_EMOJIS.claim} **Ticket assumido por:** ${member.user}`);
    await interaction.reply({ embeds: [embed] });
    await channel.setTopic(`Assumido por: ${member.user.tag}`).catch(() => { });
}
/**
 * Gera o transcript visual em HTML com IA e fecha o ticket.
 */
async function closeTicketProcess(channel, guild, closedBy, categoryName) {
    const messages = await channel.messages.fetch({ limit: 100 });
    const sortedMessages = [...messages.values()].reverse();
    // 1. Resumo Inteligente por IA (se disponível)
    let aiSummary = null;
    try {
        const { llmService } = await Promise.resolve().then(() => __importStar(require('../../shared/services/llm.service')));
        if (llmService && llmService.isReady() && sortedMessages.length >= 2) {
            const conversationText = sortedMessages
                .map(m => `${m.author.username}: ${m.content || '[Anexo/Mídia]'}`)
                .join('\n')
                .slice(0, 3000);
            aiSummary = await llmService.generateResponse([{ role: 'user', content: conversationText }], "Você é um assistente de suporte. Resuma este chamado de suporte em 3 tópicos curtos: 📌 Motivo, ✅ Solução/Andamento e ⭐ Sentimento do cliente.");
        }
    }
    catch (err) {
        services_1.logger.warn('Não foi possível gerar resumo de IA do ticket', { error: err });
    }
    // 2. Gerar Transcript Visual em HTML
    const { generateHtmlTranscript } = await Promise.resolve().then(() => __importStar(require('../../shared/services/transcript-generator')));
    const { saveTicketTranscript } = await Promise.resolve().then(() => __importStar(require('../../shared/services/database')));
    const transcriptId = `tr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const transcriptHtml = generateHtmlTranscript({
        guild,
        channelName: channel.name,
        closedBy,
        category: categoryName,
        summary: aiSummary,
        messages: sortedMessages
    });
    // 3. Salvar no Banco de Dados
    await saveTicketTranscript({
        id: transcriptId,
        guild_id: guild.id,
        ticket_channel_id: channel.id,
        ticket_name: channel.name,
        user_id: getTicketOwnerIdFromTopic(channel) || closedBy.id,
        closed_by_id: closedBy.id,
        category: categoryName,
        summary: aiSummary,
        transcript_html: transcriptHtml,
        message_count: sortedMessages.length
    }).catch(err => services_1.logger.error('Erro ao salvar transcript no banco', { error: err }));
    // 4. Enviar para Canal de Logs no Discord
    const guildConfig = await (0, services_1.getGuildConfig)(guild.id);
    const logChannelId = guildConfig?.ticket_logs_channel_id || guildConfig?.logs_channel_id;
    if (logChannelId) {
        const logsChannel = guild.channels.cache.get(logChannelId);
        if (logsChannel) {
            try {
                const buffer = Buffer.from(transcriptHtml, 'utf8');
                const attachment = new discord_js_1.AttachmentBuilder(buffer, { name: `transcript-${channel.name}.html` });
                const logEmbed = new discord_js_1.EmbedBuilder()
                    .setColor(exports.THEME.colors.info)
                    .setTitle(`${exports.THEME.emojis.log} Ticket Fechado & Transcrição Gerada`)
                    .addFields({ name: 'Ticket', value: channel.name, inline: true }, { name: 'Fechado por', value: `${closedBy.user} (${closedBy.user.tag})`, inline: true }, { name: 'Categoria', value: categoryName, inline: true }, { name: 'Total de Mensagens', value: `${sortedMessages.length}`, inline: true }, { name: 'ID do Transcript', value: `\`${transcriptId}\``, inline: true })
                    .setTimestamp();
                if (aiSummary) {
                    logEmbed.addFields({ name: '🤖 Resumo por IA', value: aiSummary.slice(0, 1024), inline: false });
                }
                await logsChannel.send({ embeds: [logEmbed], files: [attachment] });
            }
            catch (error) {
                services_1.logger.error('Erro ao enviar log de ticket', { error });
            }
        }
    }
    await (0, services_1.closeTicket)(channel.id);
    await (0, services_1.logAudit)(guild.id, closedBy.id, 'TICKET_CLOSED', channel.id, { category: categoryName, transcript_id: transcriptId });
    (0, analytics_service_1.trackEvent)(guild.id, 'ticket_close').catch(() => { });
    setTimeout(() => {
        channel.delete().catch(() => { });
    }, 4500);
}
function getTicketOwnerIdFromTopic(_channel) {
    // Tenta extrair ID do tópico se houver (não implementado no create, mas boa prática)
    // Fallback: Apenas retorna null
    return null;
}
//# sourceMappingURL=tickets.service.js.map