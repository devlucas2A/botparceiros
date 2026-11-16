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
 * Retorna true para links que não são suportados (YouTube, SoundCloud, etc.).
 * Aceitamos apenas nome da música, Spotify, Deezer e links diretos de áudio.
 */
export declare function isUnsupportedMusicUrl(query: string): boolean;
/**
 * Pré-carrega o client_id do SoundCloud para a primeira música tocar sem atraso
 */
export declare function warmupMusicSources(): void;
/**
 * Resolve faixas a partir de texto, link do Spotify/Deezer ou link direto de áudio
 */
export declare function resolveTracks(query: string, requestedBy: GuildMember): Promise<Track[]>;
/**
 * Pré-aquece a faixa em segundo plano para a troca ser instantânea
 */
export declare function prewarmTrack(track: Track | undefined): void;
/**
 * Cria o recurso de áudio da faixa (verificado: só retorna se houver som)
 */
export declare function createAudioStream(track: Track): Promise<AudioResource>;
//# sourceMappingURL=extractor.d.ts.map