"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRIVATE_CALLS_EVENTS = void 0;
exports.setupPrivateCallsEvents = setupPrivateCallsEvents;
const discord_js_1 = require("discord.js");
const database_1 = require("../../shared/services/database");
const logger_service_1 = require("../../shared/services/logger.service");
const private_calls_service_1 = require("./private-calls.service");
const builders_1 = require("@discordjs/builders");
const discord_js_2 = require("discord.js");
function setupPrivateCallsEvents(client) {
    logger_service_1.logger.info('📞 Módulo Private Calls: Eventos inicializados');
    client.on(discord_js_1.Events.InteractionCreate, async (interaction) => {
        try {
            await exports.PRIVATE_CALLS_EVENTS.onInteractionCreate(interaction);
        }
        catch (err) {
            logger_service_1.logger.error('[PrivateCalls] Erro no handler de interaction:', { err: err?.message, stack: err?.stack });
            // Tenta avisar o usuario se a interacao ainda estiver valida
            try {
                if (interaction.isChatInputCommand()) {
                    if (interaction.deferred || interaction.replied) {
                        await interaction.followUp({ content: '⚠️ Erro ao processar comando. Tente novamente.', ephemeral: true });
                    }
                    else {
                        await interaction.reply({ content: '⚠️ Erro ao processar comando. Tente novamente.', ephemeral: true });
                    }
                }
            }
            catch { /* interacao ja expirou — apenas loga */ }
        }
    });
    client.on(discord_js_1.Events.VoiceStateUpdate, async (oldState, newState) => {
        try {
            await exports.PRIVATE_CALLS_EVENTS.onVoiceStateUpdate(oldState, newState);
        }
        catch (err) {
            logger_service_1.logger.error('[PrivateCalls] Erro no handler de voiceState:', { err: err?.message });
        }
    });
}
exports.PRIVATE_CALLS_EVENTS = {
    name: 'PrivateCalls',
    // Command Definition
    commands: [
        new builders_1.SlashCommandBuilder()
            .setName('call')
            .setDescription('Gerencia sua call privada')
            .addSubcommand(sub => sub.setName('criar')
            .setDescription('Cria uma nova call privada'))
            .addSubcommand(sub => sub.setName('convidar')
            .setDescription('Convida um usuário para sua call')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuário a convidar').setRequired(true)))
            .addSubcommand(sub => sub.setName('expulsar')
            .setDescription('Expulsa um usuário da sua call')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuário a expulsar').setRequired(true)))
            .addSubcommand(sub => sub.setName('bloquear')
            .setDescription('Bloqueia a call para novos usuários'))
            .addSubcommand(sub => sub.setName('desbloquear')
            .setDescription('Permite que todos entrem na call'))
            .addSubcommand(sub => sub.setName('limite')
            .setDescription('Define o limite de usuários na call')
            .addIntegerOption(opt => opt.setName('quantidade').setDescription('Número máximo de usuários (0 = sem limite)').setRequired(true)))
    ],
    async onInteractionCreate(interaction) {
        if (!interaction.isChatInputCommand())
            return;
        if (interaction.commandName !== 'call')
            return;
        // CRITICO: defer ANTES de qualquer await pra nao estourar 3s do Discord.
        // Sem isso, qualquer query lenta (PG cold start, network) faz a
        // interacao expirar e o deferReply joga Unknown Interaction (10062).
        await interaction.deferReply({ ephemeral: true });
        const guildId = interaction.guildId;
        const member = interaction.member; // Cast needed for roles
        const config = await database_1.database.getGuildConfig(guildId);
        if (!config?.private_calls_enabled) {
            await interaction.editReply('❌ O sistema de calls privadas está desativado neste servidor.');
            return;
        }
        // Check Allowed Roles
        if (config.private_calls_allowed_roles && config.private_calls_allowed_roles.length > 0) {
            const hasRole = member.roles.cache.some((r) => config.private_calls_allowed_roles.includes(r.id));
            const isManager = config.private_calls_manager_role && member.roles.cache.has(config.private_calls_manager_role);
            if (!hasRole && !isManager && !member.permissions.has(discord_js_2.PermissionsBitField.Flags.Administrator)) {
                await interaction.editReply('❌ Você não tem permissão para usar este comando.');
                return;
            }
        }
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === 'criar') {
            if (!config.private_calls_category_id) {
                await interaction.editReply('❌ Categoria de calls privadas não configurada.');
                return;
            }
            const channel = await private_calls_service_1.PRIVATE_CALLS_SERVICE.createPrivateChannel(interaction.guild, member, config.private_calls_category_id);
            if (channel) {
                await interaction.editReply(`✅ Call criada com sucesso: ${channel}`);
            }
            else {
                await interaction.editReply('❌ Você já possui uma call ativa ou ocorreu um erro.');
            }
            return;
        }
        // For other commands, ensure user owns the channel (or is manager)
        let call = await database_1.database.getPrivateCallByOwner(guildId, member.id);
        if (!call) {
            await interaction.editReply('❌ Você não tem uma call ativa. Use `/call criar` primeiro.');
            return;
        }
        const channel = interaction.guild.channels.cache.get(call.channel_id);
        if (!channel) {
            await database_1.database.deletePrivateCall(call.channel_id);
            await interaction.editReply('❌ Canal não encontrado (removido do banco).');
            return;
        }
        switch (subcommand) {
            case 'convidar': {
                const userInvite = interaction.options.getUser('usuario');
                await channel.permissionOverwrites.edit(userInvite.id, {
                    Connect: true,
                    ViewChannel: true
                });
                await interaction.editReply(`✅ ${userInvite} foi convidado para a call.`);
                break;
            }
            case 'expulsar': {
                const userKick = interaction.options.getUser('usuario');
                await channel.permissionOverwrites.delete(userKick.id);
                const memberToKick = await interaction.guild.members.fetch(userKick.id).catch(() => null);
                if (memberToKick && memberToKick.voice.channelId === channel.id) {
                    await memberToKick.voice.disconnect();
                }
                await interaction.editReply(`👋 ${userKick} foi removido da call.`);
                break;
            }
            case 'bloquear':
                await channel.permissionOverwrites.edit(guildId, { Connect: false });
                await database_1.database.updatePrivateCall(channel.id, { is_open: false });
                await interaction.editReply('🔒 Call bloqueada para novos membros (apenas convidados).');
                break;
            case 'desbloquear':
                await channel.permissionOverwrites.edit(guildId, { Connect: true });
                await database_1.database.updatePrivateCall(channel.id, { is_open: true });
                await interaction.editReply('🔓 Call desbloqueada para todos.');
                break;
            case 'limite': {
                const limit = interaction.options.getInteger('quantidade');
                await channel.setUserLimit(limit);
                await database_1.database.updatePrivateCall(channel.id, { member_limit: limit });
                await interaction.editReply(`✅ Limite de usuários definido para ${limit === 0 ? 'ilimitado' : limit}.`);
                break;
            }
        }
    },
    async onVoiceStateUpdate(oldState, _newState) {
        // Handle Auto-Cleanup
        const guild = oldState.guild;
        const channelLeft = oldState.channelId;
        if (channelLeft) {
            // Check if it was a private call
            const isPrivateCall = await database_1.database.getPrivateCall(channelLeft);
            if (isPrivateCall) {
                const channel = guild.channels.cache.get(channelLeft);
                // Force cast members to any to avoid TS issue with ThreadMemberManager union
                if (channel && channel.members.size === 0) {
                    await private_calls_service_1.PRIVATE_CALLS_SERVICE.deletePrivateChannel(channelLeft, guild);
                }
            }
        }
    }
};
//# sourceMappingURL=events.js.map