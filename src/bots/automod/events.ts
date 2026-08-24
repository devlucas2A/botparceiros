import { Client, Message, PartialMessage, PermissionFlagsBits, GuildMember, TextChannel, EmbedBuilder } from 'discord.js';
import { getGuildConfig, logger, logAudit } from '../../shared/services';
import { checkProhibitedWords, checkCaps, checkFlood, checkLinks, checkWithAI, handleViolation, checkSpam, checkMassMentions, checkAccountAge } from './automod.service';
import { canUseFeature } from '../../shared/services/plan-features';

async function processMessage(message: Message | PartialMessage, isEdit: boolean = false) {
    // Ignorar bots e mensagens sem guild
    if (!message.author || message.author.bot || !message.guild || !message.content || !message.member) return;

    // Ignorar administradores (admins bypassam automod)
    if (message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

    try {
        const config = await getGuildConfig(message.guild.id);
        if (!config) return;

        // 0. Verificar Bypass Roles
        if (config.automod_bypass_roles && config.automod_bypass_roles.length > 0) {
            const hasBypassRole = config.automod_bypass_roles.some(roleId => message.member!.roles.cache.has(roleId));
            if (hasBypassRole) return;
        }

        // 1. Verificar Palavras Proibidas
        if (config.prohibited_words && config.prohibited_words.length > 0) {
            const detectedWord = checkProhibitedWords(message.content, config.prohibited_words);
            if (detectedWord) {
                logger.info(`🚨 AutoMod: Palavra proibida "${detectedWord}" detectada de ${message.author.tag}`);
                await handleViolation(message as Message, 'Palavra Proibida', detectedWord, config);
                return; // Interrompe processamento se já violou
            }
        }

        // 2. Verificar Links (Se ativado e canal não estiver ignorado)
        if (config.automod_links_enabled) {
            const isIgnoredChannel = config.automod_ignored_channels?.includes(message.channel.id);
            if (!isIgnoredChannel) {
                if (checkLinks(message.content, config.automod_link_whitelist || [])) {
                    logger.info(`🚨 AutoMod: Link não autorizado detectado de ${message.author.tag}`);
                    await handleViolation(message as Message, 'Link Proibido', 'URL não autorizada detectada', config);
                    return;
                }
            }
        }

        // 3. Verificar Menções em Massa (Anti-Mass Mention)
        if (config.automod_max_mentions && config.automod_max_mentions > 0) {
            if (checkMassMentions(message as Message, config.automod_max_mentions)) {
                logger.info(`🚨 AutoMod: Menções excessivas de ${message.author.tag}`);
                await handleViolation(message as Message, 'Menções Excessivas', `Excedeu limite de ${config.automod_max_mentions} menções`, config);
                return;
            }
        }

        // 4. Verificar Caps Lock (Se ativado)
        if (config.automod_caps_enabled) {
            if (checkCaps(message.content)) {
                logger.info(`🚨 AutoMod: Caps Lock excessivo de ${message.author.tag}`);
                await handleViolation(message as Message, 'Caps Lock Excessivo', 'Mais de 70% de maiúsculas', config);
                return;
            }
            if (checkFlood(message.content)) {
                logger.info(`🚨 AutoMod: Flood de Letras de ${message.author.tag}`);
                await handleViolation(message as Message, 'Text Flood', 'Letras repetidas excessivamente', config);
                return;
            }
        }

        // 5. Verificar Spam (APENAS MENSAGENS NOVAS)
        if (!isEdit && config.automod_spam_enabled) {
            if (checkSpam(message.author.id, message.guild.id)) {
                logger.info(`🚨 AutoMod: Spam detectado de ${message.author.tag}`);
                await handleViolation(message as Message, 'Spam', 'Mensagens muito frequentes', config);
                return;
            }
        }

        // 6. AutoMod IA (Pro/Ultimate) — Verifica plano antes de usar
        if (config.automod_ai_enabled) {
            const hasAccess = await canUseFeature(message.guild.ownerId, 'automod_ia');
            if (hasAccess) {
                const aiResult = await checkWithAI(message.content, message.guild.id);
                if (aiResult) {
                    logger.info(`🤖 AutoMod IA: ${aiResult.type} detectado de ${message.author.tag}`);
                    await handleViolation(message as Message, aiResult.type, aiResult.reason, config);
                    return;
                }
            }
        }

    } catch (error) {
        logger.error('Erro no processamento do AutoMod', { error });
    }
}

export function setupAutoModEvents(client: Client) {
    logger.info('🛡️ Módulo AutoMod: Eventos inicializados');

    client.on('messageCreate', async (message: Message) => {
        await processMessage(message, false);
    });

    client.on('messageUpdate', async (_oldMessage, newMessage) => {
        if (!newMessage.partial) {
            await processMessage(newMessage, true);
        } else {
            try {
                const fullMessage = await newMessage.fetch();
                await processMessage(fullMessage, true);
            } catch (error) {
                logger.error('Erro ao dar fetch na messageUpdate parcial do AutoMod', { error });
            }
        }
    });

    // 🛡️ Proteção Anti-Raid / Conta Nova ao entrar membro
    client.on('guildMemberAdd', async (member: GuildMember) => {
        try {
            if (member.user.bot) return;

            const config = await getGuildConfig(member.guild.id);
            if (!config || !config.antiraid_enabled) return;

            const minAgeDays = config.antiraid_min_account_age_days || 0;
            if (minAgeDays <= 0) return;

            const { isSuspicious, ageDays } = checkAccountAge(member.user.createdAt, minAgeDays);

            if (isSuspicious) {
                logger.warn(`🛡️ Anti-Raid: Conta recente detectada (${member.user.tag}, idade: ${ageDays} dias, mínimo: ${minAgeDays} dias)`);

                const action = config.antiraid_action || 'kick';
                const reason = `Anti-Raid: Conta muito recente (${ageDays} dias de criação, mínimo exigido: ${minAgeDays} dias)`;

                try {
                    await member.send(
                        `🛡️ Você foi removido do servidor **${member.guild.name}**.\n` +
                        `**Motivo:** Proteção Anti-Raid ativada. O servidor exige que sua conta tenha pelo menos **${minAgeDays} dias** de criação no Discord (sua conta tem ${ageDays} dias).`
                    ).catch(() => {});
                } catch {}

                if (action === 'ban' && member.bannable) {
                    await member.ban({ reason, deleteMessageSeconds: 0 });
                } else if (member.kickable) {
                    await member.kick(reason);
                }

                // Logar no banco
                await logAudit(
                    member.guild.id,
                    'SYSTEM',
                    'antiraid_action',
                    member.id,
                    {
                        user_tag: member.user.tag,
                        account_age_days: ageDays,
                        min_required_days: minAgeDays,
                        action
                    }
                );

                // Notificar canal de logs se configurado
                const logChannelId = config.automod_log_channel || config.automod_channel;
                if (logChannelId) {
                    const logChannel = member.guild.channels.cache.get(logChannelId) as TextChannel;
                    if (logChannel && logChannel.isTextBased()) {
                        const embed = new EmbedBuilder()
                            .setTitle('🛡️ Proteção Anti-Raid Ativada')
                            .setColor('#E11D48')
                            .addFields(
                                { name: 'Membro', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
                                { name: 'Ação', value: action === 'ban' ? 'Banido' : 'Expulso', inline: true },
                                { name: 'Idade da Conta', value: `${ageDays} dia(s) (Mínimo: ${minAgeDays} dias)`, inline: false }
                            )
                            .setFooter({ text: `ID: ${member.id}` })
                            .setTimestamp();

                        await logChannel.send({ embeds: [embed] }).catch(() => {});
                    }
                }
            }
        } catch (error) {
            logger.error('Erro no processamento de Anti-Raid ao entrar membro', { error });
        }
    });
}
