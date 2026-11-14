"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWelcomeEvents = setupWelcomeEvents;
const discord_js_1 = require("discord.js");
const services_1 = require("../../shared/services");
const welcome_service_1 = require("./welcome.service");
const analytics_service_1 = require("../../shared/services/analytics.service");
// Guarda se já registramos os listeners — defesa contra dupla
// chamada do setupWelcomeEvents() (nodemon hot-reload, importacao
// circular, etc). NAO previne 2 instancias do bot rodando.
let welcomeEventsRegistered = false;
function setupWelcomeEvents(client) {
    if (welcomeEventsRegistered) {
        services_1.logger.warn(`[Welcome] setupWelcomeEvents ja foi chamado neste processo (pid ${process.pid}), ignorando duplicata.`);
        return;
    }
    welcomeEventsRegistered = true;
    services_1.logger.info(`🌌 Módulo Welcome (pid ${process.pid}): Eventos inicializados (guildMemberAdd + guildMemberRemove)`);
    services_1.logger.info('   ℹ️ Estes eventos exigem o "SERVER MEMBERS INTENT" habilitado no Discord Developer Portal.');
    // Welcome
    client.on('guildMemberAdd', async (member) => {
        services_1.logger.info(`[Welcome] [pid ${process.pid}] guildMemberAdd disparou: ${member.user.tag} em ${member.guild.id}`);
        if (member.user.bot) {
            services_1.logger.info(`[Welcome] Ignorado: ${member.user.tag} e bot`);
            return;
        }
        const guildId = member.guild.id;
        (0, analytics_service_1.trackEvent)(guildId, 'member_join').catch(() => { });
        (0, services_1.logAudit)(guildId, member.id, 'MEMBER_JOINED', undefined, { username: member.user.username, tag: member.user.tag }).catch(() => { });
        try {
            const config = await (0, services_1.getGuildConfig)(guildId);
            if (!config) {
                services_1.logger.warn(`[Welcome] Sem config para guild ${guildId} — pule ou crie no painel`);
                return;
            }
            if (!config.welcome_channel_id) {
                services_1.logger.info(`[Welcome] welcome_channel_id nao configurado para guild ${guildId}`);
                return;
            }
            // Cache + fetch fallback: cache.get pode falhar em horario de pico
            let channel = null;
            try {
                const cached = member.guild.channels.cache.get(config.welcome_channel_id);
                channel = (cached ?? await member.guild.channels.fetch(config.welcome_channel_id));
            }
            catch (err) {
                services_1.logger.warn(`[Welcome] Canal ${config.welcome_channel_id} nao encontrado na guild ${guildId}`, { err });
                return;
            }
            if (!channel) {
                services_1.logger.warn(`[Welcome] Canal ${config.welcome_channel_id} retornou null na guild ${guildId}`);
                return;
            }
            const botPermissions = channel.permissionsFor(member.guild.members.me);
            const hasSend = botPermissions?.has(discord_js_1.PermissionFlagsBits.SendMessages);
            const hasAttach = botPermissions?.has(discord_js_1.PermissionFlagsBits.AttachFiles);
            if (!hasSend || !hasAttach) {
                services_1.logger.warn(`[Welcome] Sem permissao em #${channel.name} (guild ${guildId}): send=${hasSend} attach=${hasAttach}`);
                return;
            }
            const messageText = config.welcome_message || 'Bem-vindo {user} ao servidor!';
            let buffer;
            // Tenta gerar o banner passando url e fonte do config
            try {
                buffer = await (0, welcome_service_1.generateBanner)(member, messageText, config.welcome_banner_url, config.welcome_font, 'welcome');
            }
            catch (error) {
                services_1.logger.warn('Banner completo falhou, tentando versão rápida', { error });
                buffer = await (0, welcome_service_1.generateBannerFast)(member, messageText, config.welcome_banner_url, config.welcome_font, 'welcome');
            }
            const attachment = new discord_js_1.AttachmentBuilder(buffer, { name: 'welcome.png' });
            // Opcional: Adicionar AutoRole se configurado
            if (config.autorole_id) {
                try {
                    await member.roles.add(config.autorole_id);
                    services_1.logger.info(`AutoRole ${config.autorole_id} adicionado para ${member.user.tag}`);
                }
                catch (roleError) {
                    services_1.logger.warn(`Falha ao adicionar AutoRole: ${roleError.message}`);
                }
            }
            // O texto real agora é o configurado pelo form, mas a img ja tem o texto.
            // Para não duplicar, podemos mandar apenas uma menção simples no corpo:
            const content = `${member}`; // Só a marcação para pingar o usuário. A arte visual já possui a mensagem!
            await channel.send({
                content: content,
                files: [attachment]
            });
            services_1.logger.info(`Welcome enviado para ${member.user.tag} em ${member.guild.name}`);
        }
        catch (error) {
            services_1.logger.error(`Erro no evento guildMemberAdd: ${error.message}`);
        }
    });
    // Leave
    client.on('guildMemberRemove', async (member) => {
        const guildMember = member;
        const tag = guildMember.user?.tag || guildMember.id;
        services_1.logger.info(`[Leave] [pid ${process.pid}] guildMemberRemove disparou: ${tag} em ${guildMember.guild?.id}`);
        if (guildMember.user?.bot) {
            services_1.logger.info(`[Leave] Ignorado: ${tag} e bot`);
            return;
        }
        const guildId = guildMember.guild.id;
        (0, analytics_service_1.trackEvent)(guildId, 'member_leave').catch(() => { });
        (0, services_1.logAudit)(guildId, guildMember.id, 'MEMBER_LEFT', undefined, { username: guildMember.user?.username, tag }).catch(() => { });
        try {
            const config = await (0, services_1.getGuildConfig)(guildId);
            if (!config) {
                services_1.logger.warn(`[Leave] Sem config para guild ${guildId}`);
                return;
            }
            if (!config.leave_channel_id) {
                services_1.logger.info(`[Leave] leave_channel_id nao configurado para guild ${guildId}`);
                return;
            }
            let channel = null;
            try {
                const cached = guildMember.guild.channels.cache.get(config.leave_channel_id);
                channel = (cached ?? await guildMember.guild.channels.fetch(config.leave_channel_id));
            }
            catch (err) {
                services_1.logger.warn(`[Leave] Canal ${config.leave_channel_id} nao encontrado na guild ${guildId}`, { err });
                return;
            }
            if (!channel) {
                services_1.logger.warn(`[Leave] Canal ${config.leave_channel_id} retornou null na guild ${guildId}`);
                return;
            }
            const botPermissions = channel.permissionsFor(guildMember.guild.members.me);
            const hasSend = botPermissions?.has(discord_js_1.PermissionFlagsBits.SendMessages);
            const hasAttach = botPermissions?.has(discord_js_1.PermissionFlagsBits.AttachFiles);
            if (!hasSend || !hasAttach) {
                services_1.logger.warn(`[Leave] Sem permissao em #${channel.name} (guild ${guildId}): send=${hasSend} attach=${hasAttach}`);
                return;
            }
            const messageText = config.leave_message || 'Adeus {user}!';
            let buffer;
            // Usa o mesmo banner do welcome — temos so um campo no painel
            try {
                buffer = await (0, welcome_service_1.generateBanner)(guildMember, messageText, config.welcome_banner_url, config.welcome_font, 'leave');
            }
            catch (error) {
                buffer = await (0, welcome_service_1.generateBannerFast)(guildMember, messageText, config.welcome_banner_url, config.welcome_font, 'leave');
            }
            const attachment = new discord_js_1.AttachmentBuilder(buffer, { name: 'leave.png' });
            await channel.send({ files: [attachment] });
            services_1.logger.info(`Leave enviado para ${guildMember.user.tag}`);
        }
        catch (error) {
            services_1.logger.error(`Erro no evento guildMemberRemove: ${error.message}`);
        }
    });
}
//# sourceMappingURL=events.js.map