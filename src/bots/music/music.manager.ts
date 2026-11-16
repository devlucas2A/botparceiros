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

        // Se o próprio bot foi desconectado
        const botId = newState.client.user?.id;
        if (botId && (oldState.id === botId || newState.id === botId)) {
            if (!newState.channelId) {
                logger.info(`[MusicManager] Bot desconectado do canal de voz na guild ${guildId}`);
                queue.destroy();
                return;
            } else if (newState.channel) {
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
