import { TextBasedChannel, VoiceBasedChannel, VoiceState } from 'discord.js';
import { GuildQueue } from './guild-queue';
import { logger } from '../../shared/services';

export class MusicManager {
    private static instance: MusicManager;
    private queues = new Map<string, GuildQueue>();

    private constructor() {}

    public static getInstance(): MusicManager {
        if (!MusicManager.instance) {
            MusicManager.instance = new MusicManager();
        }
        return MusicManager.instance;
    }

    public getOrCreateQueue(
        guildId: string,
        voiceChannel: VoiceBasedChannel,
        textChannel: TextBasedChannel
    ): GuildQueue {
        let queue = this.queues.get(guildId);
        if (!queue) {
            queue = new GuildQueue(guildId, voiceChannel, textChannel, (id) => this.deleteQueue(id));
            this.queues.set(guildId, queue);
            logger.info(`[MusicManager] Nova fila criada para a guild ${guildId}`);
        } else {
            // Atualiza canais se mudaram
            queue.voiceChannel = voiceChannel;
            queue.textChannel = textChannel;
        }
        return queue;
    }

    public getQueue(guildId: string): GuildQueue | undefined {
        return this.queues.get(guildId);
    }

    public deleteQueue(guildId: string): void {
        const queue = this.queues.get(guildId);
        if (queue) {
            this.queues.delete(guildId);
            logger.info(`[MusicManager] Fila removida para a guild ${guildId}`);
        }
    }

    public handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): void {
        const guildId = oldState.guild.id || newState.guild.id;
        const queue = this.queues.get(guildId);
        if (!queue) return;

        // Se o próprio bot foi desconectado ou outra instância assumiu a sessão
        const botId = newState.client.user?.id;
        if (botId && (oldState.id === botId || newState.id === botId)) {
            if (!newState.channelId) {
                logger.info(`[MusicManager] Bot desconectado do canal de voz na guild ${guildId}`);
                queue.destroy(false);
                return;
            }

            const myShardSessionId = (newState.guild.shard as any)?.sessionId;
            if (myShardSessionId && newState.sessionId && newState.sessionId !== myShardSessionId) {
                logger.info(`[MusicManager] Outra instância ativa assumiu a voz na guild ${guildId}. Liberando fila local sem desconectar.`);
                queue.destroy(false);
                return;
            }

            if (newState.channel) {
                queue.voiceChannel = newState.channel;
            }
        }

        // Se a mudança envolveu o canal onde o bot está tocando
        const botChannelId = queue.voiceChannel.id;
        if (oldState.channelId === botChannelId || newState.channelId === botChannelId) {
            queue.checkEmptyChannel();
        }
    }
}

export const musicManager = MusicManager.getInstance();
