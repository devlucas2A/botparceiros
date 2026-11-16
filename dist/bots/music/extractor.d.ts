import { AudioResource } from '@discordjs/voice';
import { GuildMember } from 'discord.js';
import { Track } from './types';
/**
 * Converte segundos para formato legível MM:SS ou HH:MM:SS
 */
export declare function formatDuration(seconds: number): string;
/**
 * Verifica se a string é uma URL de áudio direta (.mp3, .wav, .ogg, etc.)
 */
export declare function isDirectAudioUrl(url: string): boolean;
/**
 * Resolve tracks a partir de uma busca de texto ou link (YouTube, SoundCloud, Spotify, Link Direto)
 */
export declare function resolveTracks(query: string, requestedBy: GuildMember): Promise<Track[]>;
/**
 * Extração preguiçosa (lazy) do stream de áudio via yt-dlp + FFmpeg
 */
export declare function createAudioStream(track: Track): Promise<AudioResource>;
//# sourceMappingURL=extractor.d.ts.map