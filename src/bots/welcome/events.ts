import { Client, GuildMember, TextChannel, AttachmentBuilder, PermissionFlagsBits } from 'discord.js';
import { getGuildConfig, logger } from '../../shared/services';
import { generateBanner, generateBannerFast } from './welcome.service';
import { trackEvent } from '../../shared/services/analytics.service';

// Guarda se já registramos os listeners — defesa contra dupla
// chamada do setupWelcomeEvents() (nodemon hot-reload, importacao
// circular, etc). NAO previne 2 instancias do bot rodando.
let welcomeEventsRegistered = false;

export function setupWelcomeEvents(client: Client) {
    if (welcomeEventsRegistered) {
        logger.warn(`[Welcome] setupWelcomeEvents ja foi chamado neste processo (pid ${process.pid}), ignorando duplicata.`);
        return;
    }
    welcomeEventsRegistered = true;

    logger.info(`🌌 Módulo Welcome (pid ${process.pid}): Eventos inicializados (guildMemberAdd + guildMemberRemove)`);
    logger.info('   ℹ️ Estes eventos exigem o "SERVER MEMBERS INTENT" habilitado no Discord Developer Portal.');

    // Welcome
    client.on('guildMemberAdd', async (member: GuildMember) => {
        logger.info(`[Welcome] [pid ${process.pid}] guildMemberAdd disparou: ${member.user.tag} em ${member.guild.id}`);
        if (member.user.bot) {
            logger.info(`[Welcome] Ignorado: ${member.user.tag} e bot`);
            return;
        }

        const guildId = member.guild.id;
        trackEvent(guildId, 'member_join').catch(() => {});

        try {
            const config = await getGuildConfig(guildId);
            if (!config) {
                logger.warn(`[Welcome] Sem config para guild ${guildId} — pule ou crie no painel`);
                return;
            }
            if (!config.welcome_channel_id) {
                logger.info(`[Welcome] welcome_channel_id nao configurado para guild ${guildId}`);
                return;
            }

            // Cache + fetch fallback: cache.get pode falhar em horario de pico
            let channel: TextChannel | null = null;
            try {
                const cached = member.guild.channels.cache.get(config.welcome_channel_id);
                channel = (cached ?? await member.guild.channels.fetch(config.welcome_channel_id)) as TextChannel;
            } catch (err) {
                logger.warn(`[Welcome] Canal ${config.welcome_channel_id} nao encontrado na guild ${guildId}`, { err });
                return;
            }
            if (!channel) {
                logger.warn(`[Welcome] Canal ${config.welcome_channel_id} retornou null na guild ${guildId}`);
                return;
            }

            const botPermissions = channel.permissionsFor(member.guild.members.me!);
            const hasSend = botPermissions?.has(PermissionFlagsBits.SendMessages);
            const hasAttach = botPermissions?.has(PermissionFlagsBits.AttachFiles);
            if (!hasSend || !hasAttach) {
                logger.warn(`[Welcome] Sem permissao em #${channel.name} (guild ${guildId}): send=${hasSend} attach=${hasAttach}`);
                return;
            }

            const messageText = config.welcome_message || 'Bem-vindo {user} ao servidor!';
            let buffer: Buffer;

            // Tenta gerar o banner passando url e fonte do config
            try {
                buffer = await generateBanner(member, messageText, config.welcome_banner_url, config.welcome_font, 'welcome');
            } catch (error) {
                logger.warn('Banner completo falhou, tentando versão rápida', { error });
                buffer = await generateBannerFast(member, messageText, config.welcome_banner_url, config.welcome_font, 'welcome');
            }

            const attachment = new AttachmentBuilder(buffer, { name: 'welcome.png' });

            // Opcional: Adicionar AutoRole se configurado
            if (config.autorole_id) {
                try {
                    await member.roles.add(config.autorole_id);
                    logger.info(`AutoRole ${config.autorole_id} adicionado para ${member.user.tag}`);
                } catch (roleError) {
                    logger.warn(`Falha ao adicionar AutoRole: ${(roleError as any).message}`);
                }
            }

            // O texto real agora é o configurado pelo form, mas a img ja tem o texto.
            // Para não duplicar, podemos mandar apenas uma menção simples no corpo:
            const content = `${member}`; // Só a marcação para pingar o usuário. A arte visual já possui a mensagem!

            await channel.send({
                content: content,
                files: [attachment]
            });

            logger.info(`Welcome enviado para ${member.user.tag} em ${member.guild.name}`);

        } catch (error) {
            logger.error(`Erro no evento guildMemberAdd: ${(error as any).message}`);
        }
    });

    // Leave
    client.on('guildMemberRemove', async (member) => {
        const guildMember = member as GuildMember;
        const tag = guildMember.user?.tag || guildMember.id;
        logger.info(`[Leave] [pid ${process.pid}] guildMemberRemove disparou: ${tag} em ${guildMember.guild?.id}`);
        if (guildMember.user?.bot) {
            logger.info(`[Leave] Ignorado: ${tag} e bot`);
            return;
        }

        const guildId = guildMember.guild.id;
        trackEvent(guildId, 'member_leave').catch(() => {});

        try {
            const config = await getGuildConfig(guildId);
            if (!config) {
                logger.warn(`[Leave] Sem config para guild ${guildId}`);
                return;
            }
            if (!config.leave_channel_id) {
                logger.info(`[Leave] leave_channel_id nao configurado para guild ${guildId}`);
                return;
            }

            let channel: TextChannel | null = null;
            try {
                const cached = guildMember.guild.channels.cache.get(config.leave_channel_id);
                channel = (cached ?? await guildMember.guild.channels.fetch(config.leave_channel_id)) as TextChannel;
            } catch (err) {
                logger.warn(`[Leave] Canal ${config.leave_channel_id} nao encontrado na guild ${guildId}`, { err });
                return;
            }
            if (!channel) {
                logger.warn(`[Leave] Canal ${config.leave_channel_id} retornou null na guild ${guildId}`);
                return;
            }

            const botPermissions = channel.permissionsFor(guildMember.guild.members.me!);
            const hasSend = botPermissions?.has(PermissionFlagsBits.SendMessages);
            const hasAttach = botPermissions?.has(PermissionFlagsBits.AttachFiles);
            if (!hasSend || !hasAttach) {
                logger.warn(`[Leave] Sem permissao em #${channel.name} (guild ${guildId}): send=${hasSend} attach=${hasAttach}`);
                return;
            }

            const messageText = config.leave_message || 'Adeus {user}!';
            let buffer: Buffer;

            // Usa o mesmo banner do welcome — temos so um campo no painel
            try {
                buffer = await generateBanner(guildMember, messageText, config.welcome_banner_url, config.welcome_font, 'leave');
            } catch (error) {
                buffer = await generateBannerFast(guildMember, messageText, config.welcome_banner_url, config.welcome_font, 'leave');
            }

            const attachment = new AttachmentBuilder(buffer, { name: 'leave.png' });
            await channel.send({ files: [attachment] });

            logger.info(`Leave enviado para ${guildMember.user.tag}`);

        } catch (error) {
            logger.error(`Erro no evento guildMemberRemove: ${(error as any).message}`);
        }
    });
}
