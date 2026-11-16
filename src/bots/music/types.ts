import { AudioPlayer, VoiceConnection } from '@discordjs/voice';
import { GuildMember, TextBasedChannel, VoiceBasedChannel, Message } from 'discord.js';

export type LoopMode = 'off' | 'track' | 'queue';

export interface Track {
    id: string;
    title: string;
    url: string;
    duration: string; // e.g. "03:45" ou "Ao vivo"
    durationSeconds: number;
    thumbnail?: string;
    author?: string;
    requestedBy: GuildMember;
    source: 'youtube' | 'soundcloud' | 'spotify' | 'deezer' | 'direct';
}

export interface GuildQueueState {
    guildId: string;
    voiceChannel: VoiceBasedChannel;
    textChannel: TextBasedChannel;
    connection: VoiceConnection | null;
    player: AudioPlayer;
    tracks: Track[];
    currentTrack: Track | null;
    isPlaying: boolean;
    isPaused: boolean;
    loopMode: LoopMode;
}

export interface MusicCommand {
    name: string;
    aliases: string[];
    description: string;
    usage: string;
    execute: (message: Message, args: string[], member: GuildMember) => Promise<void>;
}
