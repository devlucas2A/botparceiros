import { Client, EmbedBuilder, Message } from 'discord.js';
import { findMusicCommand } from './commands';
import { MusicCommand } from './types';
import { musicManager } from './music.manager';
import { warmupMusicSources } from './extractor';
import { logger, redisService } from '../../shared/services';

let musicEventsRegistered = false;
const claimedMessageIds = new Set<string>();

function rememberClaimedMessage(messageId: string): void {
    claimedMessageIds.add(messageId);
    if (claimedMessageIds.size > 500) {
        const oldest = claimedMessageIds.values().next().value;
        if (oldest) claimedMessageIds.delete(oldest);
    }
}

async function tryClaimMusicCommand(message: Message): Promise<boolean> {
    const isCloudInstance = Boolean(
        process.env.RENDER ||
        process.env.RENDER_SERVICE_ID ||
        process.env.RAILWAY_ENVIRONMENT ||
        process.platform !== 'win32'
    );

    // Na nuvem (Render/Linux), aguarda 500ms para que a instância local (Windows)
    // sempre vença o lock no Upstash Redis (~130ms de latência BR -> US)
    if (isCloudInstance) {
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (claimedMessageIds.has(message.id)) {
        return false;
    }

    const redis = redisService.getClient();
    if (redis) {
        try {
            const lockKey = `music:cmd:lock:${message.id}`;
            const count = await redis.incr(lockKey);
            if (count === 1) {
                await redis.expire(lockKey, 60);
            } else if (count > 1) {
                return false;
            }
        } catch {
            // Se Redis falhar, segue com verificação via Gateway
        }
    }

    if (claimedMessageIds.has(message.id)) {
        return false;
    }

    rememberClaimedMessage(message.id);
    return true;
}

/**
 * Faz o parsing de uma mensagem com o prefixo core!
 * Retorna o comando correspondente e seus argumentos, ou null se não tiver o prefixo.
 */
export function parseMusicCommand(content: string): { commandName: string; args: string[]; command?: MusicCommand } | null {
    const trimmed = content.trim();
    if (!trimmed.toLowerCase().startsWith('core!')) {
        return null;
    }

    const withoutPrefix = trimmed.slice(5).trim();
    if (!withoutPrefix) {
        return {
            commandName: 'help',
            args: [],
            command: findMusicCommand('help')
        };
    }

    const parts = withoutPrefix.split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);
    const command = findMusicCommand(commandName);

    return {
        commandName,
        args,
        command
    };
}

/**
 * Inicializa os ouvintes de eventos do módulo de música (core!)
 */
export function setupMusicEvents(client: Client): void {
    if (musicEventsRegistered) {
        logger.warn(`[Music] setupMusicEvents já foi chamado neste processo (pid ${process.pid}), ignorando duplicata.`);
        return;
    }
    musicEventsRegistered = true;

    logger.info(`🌌 Módulo Music (pid ${process.pid}): Eventos inicializados (messageCreate + voiceStateUpdate)`);
    warmupMusicSources();

    // Interceptação de mensagens com prefixo core!
    client.on('messageCreate', async (message: Message) => {
        // Se outra instância do próprio bot já respondeu a um comando, registra para evitar duplicidade
        if (message.author.id === client.user?.id && message.reference?.messageId) {
            rememberClaimedMessage(message.reference.messageId);
            return;
        }

        if (message.author.bot || !message.guild) return;

        const parsed = parseMusicCommand(message.content);
        if (!parsed) return;

        const member = message.member;
        if (!member) return;

        const claimed = await tryClaimMusicCommand(message);
        if (!claimed) {
            logger.info(`[MusicEvents] Comando ${message.id} já processado por outra instância ativa. Ignorando.`);
            return;
        }

        if (!parsed.command) {
            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setDescription(`❌ Comando musical \`core!${parsed.commandName}\` desconhecido! Digite \`core!help\` para ver os comandos disponíveis.`);
            await message.reply({ embeds: [embed] }).catch(() => {});
            return;
        }

        try {
            await parsed.command.execute(message, parsed.args, member);
        } catch (error: unknown) {
            const err = error as Error;
            logger.error(`[MusicEvents] Erro ao executar comando core!${parsed.commandName}:`, { error });
            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setDescription(`❌ Ocorreu um erro ao executar \`core!${parsed.commandName}\`: ${err?.message || 'Erro inesperado'}`);
            await message.reply({ embeds: [embed] }).catch(() => {});
        }
    });

    // Detecção de canal vazio e desconexão do bot
    client.on('voiceStateUpdate', (oldState, newState) => {
        try {
            musicManager.handleVoiceStateUpdate(oldState, newState);
        } catch (error) {
            logger.error('[MusicEvents] Erro no manipulador voiceStateUpdate:', { error });
        }
    });
}
