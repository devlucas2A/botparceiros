import { TextBasedChannel, VoiceBasedChannel, VoiceState } from 'discord.js';
import { GuildQueue } from './guild-queue';
export declare class MusicManager {
    private static instance;
    private queues;
    private constructor();
    static getInstance(): MusicManager;
    getOrCreateQueue(guildId: string, voiceChannel: VoiceBasedChannel, textChannel: TextBasedChannel): GuildQueue;
    getQueue(guildId: string): GuildQueue | undefined;
    deleteQueue(guildId: string): void;
    handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): void;
}
export declare const musicManager: MusicManager;
//# sourceMappingURL=music.manager.d.ts.map