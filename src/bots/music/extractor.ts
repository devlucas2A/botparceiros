/**
 * Extrator de música de baixa latência do CoreBot
 *
 * - Busca por texto: API oficial do Deezer (~250ms)
 * - Links suportados: Spotify e Deezer (faixa, álbum e playlist) + links diretos de áudio
 * - Motor de Áudio Híbrido (sem Python / sem yt-dlp):
 *   1) Stream HTTP Chunked Range de alta velocidade (~800ms até o primeiro byte PCM)
 *   2) SoundCloud API v2 nativa com client_id pré-carregado (filtra DRM cbc-encrypted-hls)
 *   3) Fallback CDN Deezer caso ambas as fontes primárias falhem em IP de nuvem
 */
import { PassThrough, Readable } from 'stream';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createAudioResource, AudioResource, StreamType } from '@discordjs/voice';
import { GuildMember } from 'discord.js';
import prism from 'prism-media';
import { Track } from './types';
import { logger } from '../../shared/services';

const execFileAsync = promisify(execFile);
const YTDLP_BIN = process.env.YTDLP_PATH || 'yt-dlp';
const HTTP_TIMEOUT_MS = 6000;
const FFMPEG_READY_TIMEOUT_MS = 7000;
const SEARCH_CACHE_TTL_MS = 30 * 60 * 1000;
const STREAM_CACHE_TTL_MS = 45 * 60 * 1000;
const CLIENT_ID_TTL_MS = 6 * 60 * 60 * 1000;

const BROWSER_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const IOS_UA =
    'com.google.ios.youtube/20.03.02 (iPhone16,2; U; CPU iOS 18_2_1 like Mac OS X;)';
const DEFAULT_SC_CLIENT_ID = '5lnU5PEpImc23JXFHBdq8E6QDd39I2uT';

type TrackMeta = Omit<Track, 'requestedBy'>;

interface ResolvedAudioSource {
    kind: 'chunked' | 'url';
    url: string;
    mediaId?: string;
    itag?: number;
    contentLength?: number;
    userAgent?: string;
    expiresAt: number;
}

const searchCache = new Map<string, { track: TrackMeta; expiresAt: number }>();
const audioSourceCache = new Map<string, ResolvedAudioSource>();
const inflightAudioSources = new Map<string, Promise<ResolvedAudioSource | null>>();

// ═══════════════════════════════════════════════════════════════════════════
// Utilitários
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Converte segundos para formato legível MM:SS ou HH:MM:SS
 */
export function formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds) || seconds <= 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Verifica se a string é uma URL de áudio direta (.mp3, .wav, .ogg, etc.)
 */
export function isDirectAudioUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        const pathname = parsed.pathname.toLowerCase();
        return /\.(mp3|wav|ogg|flac|aac|m4a|opus)$/i.test(pathname);
    } catch {
        return false;
    }
}

function isHttpUrl(value: string): boolean {
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

function isSpotifyUrl(value: string): boolean {
    const lower = value.toLowerCase();
    return lower.includes('open.spotify.com') || lower.includes('spotify.link');
}

function isDeezerUrl(value: string): boolean {
    const lower = value.toLowerCase();
    return lower.includes('deezer.com') || lower.includes('deezer.page.link') || lower.includes('link.deezer.com');
}

/**
 * Retorna true para links que não são suportados (ex: YouTube).
 * Aceitamos apenas nome da música, Spotify, Deezer e links diretos de áudio.
 */
export function isUnsupportedMusicUrl(query: string): boolean {
    const trimmed = query.trim();
    if (!isHttpUrl(trimmed)) return false;
    return !isSpotifyUrl(trimmed) && !isDeezerUrl(trimmed) && !isDirectAudioUrl(trimmed);
}

async function fetchJson<T = any>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        ...init,
        headers: { 'User-Agent': BROWSER_UA, ...(init?.headers || {}) },
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS)
    });
    if (!res.ok) {
        const err = new Error(`HTTP ${res.status} em ${new URL(url).hostname}`);
        (err as any).status = res.status;
        throw err;
    }
    return (await res.json()) as T;
}

function normalize(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9 ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Remove "(Clipe Oficial)", "[Remastered]", " - Remastered 2011", "feat." etc. para melhorar a busca */
function cleanTitle(title: string): string {
    return title
        .replace(/\s+-\s+[^-]*(?:remaster|version|versão|live|ao vivo|mono|stereo|edit|radio|deluxe)[^-]*$/i, '')
        .replace(/\((?:[^)]*?(?:official|oficial|clipe|video|vídeo|lyric|letra|audio|áudio|remaster|visualizer|feat|ft\.)[^)]*)\)/gi, '')
        .replace(/\[[^\]]*\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function toTrack(meta: TrackMeta, requestedBy: GuildMember): Track {
    return { ...meta, requestedBy };
}

// ═══════════════════════════════════════════════════════════════════════════
// Deezer (busca por texto + links de faixa, álbum e playlist)
// ═══════════════════════════════════════════════════════════════════════════

function mapDeezerTrack(item: any, fallbackCover?: string, fallbackUrl?: string): TrackMeta {
    const artist = item.artist?.name || 'Deezer';
    const seconds = Number(item.duration) || 0;
    return {
        id: `dz-${item.id}`,
        title: `${item.title} - ${artist}`,
        url: item.link || fallbackUrl || `https://www.deezer.com/track/${item.id}`,
        duration: formatDuration(seconds),
        durationSeconds: seconds,
        thumbnail: item.album?.cover_medium || item.album?.cover || fallbackCover,
        author: artist,
        source: 'deezer',
        artist,
        songTitle: item.title,
        previewUrl: typeof item.preview === 'string' && item.preview ? item.preview : undefined
    };
}

async function searchDeezer(queryText: string): Promise<TrackMeta | null> {
    try {
        const data = await fetchJson<any>(
            `https://api.deezer.com/search/track?q=${encodeURIComponent(queryText)}&limit=5`
        );
        const first = Array.isArray(data?.data) ? data.data.find((t: any) => t?.readable !== false) || data.data[0] : null;
        return first ? mapDeezerTrack(first) : null;
    } catch (error: unknown) {
        logger.warn(`[MusicExtractor] Busca Deezer falhou para "${queryText}": ${(error as Error).message}`);
        return null;
    }
}

async function resolveDeezerUrl(deezerUrl: string): Promise<TrackMeta[]> {
    try {
        let finalUrl = deezerUrl;
        if (/deezer\.page\.link|link\.deezer\.com/i.test(deezerUrl)) {
            const resp = await fetch(deezerUrl, { redirect: 'follow', signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
            finalUrl = resp.url || deezerUrl;
        }

        const match = finalUrl.match(/deezer\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(track|album|playlist)\/(\d+)/i);
        if (!match) return [];

        const kind = match[1].toLowerCase();
        const id = match[2];
        const data = await fetchJson<any>(`https://api.deezer.com/${kind}/${id}`);

        if (kind === 'track' && data?.title) {
            return [mapDeezerTrack(data, undefined, finalUrl)];
        }

        const list = data?.tracks?.data;
        if (Array.isArray(list)) {
            return list.slice(0, 50).map((item: any) => mapDeezerTrack(item, data?.cover_medium, finalUrl));
        }
        return [];
    } catch (error: unknown) {
        logger.warn(`[MusicExtractor] Falha ao resolver link Deezer: ${(error as Error).message}`);
        return [];
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Spotify (links de faixa, álbum e playlist — sem API key)
// ═══════════════════════════════════════════════════════════════════════════

async function resolveSpotifyUrl(spotifyUrl: string): Promise<TrackMeta[]> {
    try {
        let finalUrl = spotifyUrl;
        if (spotifyUrl.includes('spotify.link')) {
            const resp = await fetch(spotifyUrl, { redirect: 'follow', signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
            finalUrl = resp.url || spotifyUrl;
        }

        const match = finalUrl.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist)\/([a-zA-Z0-9]+)/i);
        if (match) {
            const kind = match[1].toLowerCase();
            const id = match[2];
            const embedRes = await fetch(`https://open.spotify.com/embed/${kind}/${id}`, {
                headers: { 'User-Agent': BROWSER_UA },
                signal: AbortSignal.timeout(HTTP_TIMEOUT_MS)
            });

            if (embedRes.ok) {
                const html = await embedRes.text();
                const idx = html.indexOf('__NEXT_DATA__');
                if (idx !== -1) {
                    const start = html.indexOf('>', idx) + 1;
                    const end = html.indexOf('</script>', start);
                    if (start > 0 && end > start) {
                        const parsed = JSON.parse(html.slice(start, end)) as any;
                        const entity = parsed?.props?.pageProps?.state?.data?.entity;

                        if (kind === 'track' && (entity?.name || entity?.title)) {
                            const songTitle = entity.name || entity.title;
                            const artists = Array.isArray(entity.artists)
                                ? entity.artists.map((a: any) => a.name).filter(Boolean).join(', ')
                                : (entity.subtitle || '');
                            const seconds = entity.duration ? Math.round(Number(entity.duration) / 1000) : 0;
                            const cover = entity.visualIdentity?.image?.[0]?.url || entity.coverArt?.sources?.[0]?.url;
                            return [{
                                id: `sp-${id}`,
                                title: artists ? `${songTitle} - ${artists}` : songTitle,
                                url: `https://open.spotify.com/track/${id}`,
                                duration: formatDuration(seconds),
                                durationSeconds: seconds,
                                thumbnail: cover,
                                author: artists || 'Spotify',
                                source: 'spotify',
                                artist: artists.split(',')[0]?.trim() || undefined,
                                songTitle
                            }];
                        }

                        if (Array.isArray(entity?.trackList) && entity.trackList.length > 0) {
                            const cover = entity.coverArt?.sources?.[0]?.url;
                            return entity.trackList.slice(0, 50).map((item: any, index: number) => {
                                const artist = String(item.subtitle || '').replace(/\u00A0/g, ' ').trim() || 'Spotify';
                                const songTitle = String(item.title || `Faixa ${index + 1}`).trim();
                                const seconds = item.duration ? Math.round(Number(item.duration) / 1000) : 0;
                                const trackId = typeof item.uri === 'string' ? item.uri.split(':').pop() : `${id}-${index}`;
                                return {
                                    id: `sp-${trackId}`,
                                    title: `${songTitle} - ${artist}`,
                                    url: trackId ? `https://open.spotify.com/track/${trackId}` : finalUrl,
                                    duration: formatDuration(seconds),
                                    durationSeconds: seconds,
                                    thumbnail: cover,
                                    author: artist,
                                    source: 'spotify' as const,
                                    artist: artist.split(',')[0]?.trim(),
                                    songTitle
                                };
                            });
                        }
                    }
                }
            }
        }

        // Fallback oEmbed
        const data = await fetchJson<{ title?: string; thumbnail_url?: string }>(
            `https://open.spotify.com/oembed?url=${encodeURIComponent(finalUrl)}`
        );
        if (!data.title) return [];
        return [{
            id: `sp-${finalUrl}`,
            title: data.title,
            url: finalUrl,
            duration: '00:00',
            durationSeconds: 0,
            thumbnail: data.thumbnail_url,
            author: 'Spotify',
            source: 'spotify',
            songTitle: data.title
        }];
    } catch (error: unknown) {
        logger.warn(`[MusicExtractor] Falha ao resolver link Spotify: ${(error as Error).message}`);
        return [];
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Motor 1: Stream HTTP Chunked Range (~800ms, sem yt-dlp / sem Python)
// ═══════════════════════════════════════════════════════════════════════════

async function findChunkedAudioSource(track: Track): Promise<ResolvedAudioSource | null> {
    try {
        const searchQuery = track.artist && track.songTitle
            ? `${track.artist} ${cleanTitle(track.songTitle)}`
            : cleanTitle(track.title);

        const searchRes = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': BROWSER_UA },
            body: JSON.stringify({
                context: {
                    client: {
                        clientName: 'WEB',
                        clientVersion: '2.20250101.00.00',
                        hl: 'pt',
                        gl: 'BR'
                    }
                },
                query: searchQuery,
                params: 'EgIQAQ%3D%3D'
            }),
            signal: AbortSignal.timeout(4500)
        });

        if (!searchRes.ok) return null;
        const searchData = (await searchRes.json()) as any;
        const sections =
            searchData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

        let mediaId: string | null = null;
        for (const section of sections) {
            const items = section?.itemSectionRenderer?.contents || [];
            const vid = items.find((item: any) => item?.videoRenderer?.videoId)?.videoRenderer;
            if (vid?.videoId) {
                mediaId = String(vid.videoId);
                break;
            }
        }
        if (!mediaId) return null;

        const playerRes = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': IOS_UA
            },
            body: JSON.stringify({
                videoId: mediaId,
                context: {
                    client: {
                        clientName: 'IOS',
                        clientVersion: '20.03.02',
                        deviceMake: 'Apple',
                        deviceModel: 'iPhone16,2',
                        osName: 'iPhone',
                        osVersion: '18.2.1.22C161',
                        hl: 'pt',
                        gl: 'BR'
                    }
                }
            }),
            signal: AbortSignal.timeout(4500)
        });

        if (!playerRes.ok) return null;
        const playerData = (await playerRes.json()) as any;
        const formats: any[] = playerData?.streamingData?.adaptiveFormats || [];
        const audioFormats = formats.filter(
            (f: any) => typeof f?.mimeType === 'string' && f.mimeType.startsWith('audio/') && f.url && f.contentLength
        );
        if (audioFormats.length === 0) return null;

        const chosen =
            audioFormats.find((f: any) => f.itag === 251) ||
            audioFormats.find((f: any) => f.itag === 140) ||
            audioFormats.find((f: any) => f.itag === 250) ||
            audioFormats[0];

        const contentLength = Number(chosen.contentLength);
        if (!contentLength || contentLength <= 0) return null;

        return {
            kind: 'chunked',
            url: String(chosen.url),
            mediaId,
            itag: Number(chosen.itag) || 251,
            contentLength,
            userAgent: IOS_UA,
            expiresAt: Date.now() + STREAM_CACHE_TTL_MS
        };
    } catch {
        return null;
    }
}

/**
 * Desbloqueia em segundo plano a URL completa (sem limite de 512KB/60s) para o mesmo itag
 * enquanto os primeiros 30 segundos já estão tocando instantaneamente na call.
 */
async function unlockFullStreamUrl(mediaId?: string, itag?: number): Promise<string | null> {
    if (!mediaId) return null;
    const formatSelector = itag ? `${itag}/bestaudio/best` : 'bestaudio/best';
    const targetUrl = `https://www.youtube.com/watch?v=${mediaId}`;
    try {
        const { stdout } = await execFileAsync(
            YTDLP_BIN,
            ['--js-runtimes', 'node', '--no-warnings', '--no-playlist', '-f', formatSelector, '--get-url', targetUrl],
            { timeout: 12_000, maxBuffer: 2 * 1024 * 1024 }
        );
        const directUrl = stdout.trim().split(/\r?\n/)[0]?.trim();
        return directUrl && isHttpUrl(directUrl) ? directUrl : null;
    } catch {
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Motor 2: SoundCloud API v2 Nativa (com client_id pré-carregado e filtro DRM)
// ═══════════════════════════════════════════════════════════════════════════

let scClientId: { value: string; expiresAt: number } = {
    value: process.env.SOUNDCLOUD_CLIENT_ID || DEFAULT_SC_CLIENT_ID,
    expiresAt: Date.now() + CLIENT_ID_TTL_MS
};
let scClientIdPromise: Promise<string> | null = null;

async function fetchSoundCloudClientId(): Promise<string> {
    const html = await (
        await fetch('https://soundcloud.com/', {
            headers: { 'User-Agent': BROWSER_UA },
            signal: AbortSignal.timeout(HTTP_TIMEOUT_MS)
        })
    ).text();

    const scripts = [...html.matchAll(/<script crossorigin src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"/g)]
        .map(m => m[1])
        .reverse();

    for (const src of scripts) {
        try {
            const js = await (await fetch(src, { signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) })).text();
            const m = js.match(/client_id\s*:\s*"([a-zA-Z0-9]{32})"/) || js.match(/client_id=([a-zA-Z0-9]{32})/);
            if (m) return m[1];
        } catch {
            // tenta o próximo bundle
        }
    }
    return DEFAULT_SC_CLIENT_ID;
}

async function getSoundCloudClientId(forceRefresh = false): Promise<string> {
    if (process.env.SOUNDCLOUD_CLIENT_ID && !forceRefresh) return process.env.SOUNDCLOUD_CLIENT_ID;
    if (!forceRefresh && scClientId && scClientId.expiresAt > Date.now()) return scClientId.value;
    if (!scClientIdPromise) {
        scClientIdPromise = fetchSoundCloudClientId()
            .then(value => {
                scClientId = { value, expiresAt: Date.now() + CLIENT_ID_TTL_MS };
                return value;
            })
            .catch(() => DEFAULT_SC_CLIENT_ID)
            .finally(() => {
                scClientIdPromise = null;
            });
    }
    return scClientIdPromise;
}

async function soundCloudApi<T = any>(path: string, retry = true): Promise<T> {
    const clientId = await getSoundCloudClientId();
    const sep = path.includes('?') ? '&' : '?';
    try {
        return await fetchJson<T>(`https://api-v2.soundcloud.com${path}${sep}client_id=${clientId}`);
    } catch (error: any) {
        if (retry && (error?.status === 401 || error?.status === 403)) {
            await getSoundCloudClientId(true);
            return soundCloudApi<T>(path, false);
        }
        throw error;
    }
}

interface ScTranscoding {
    url: string;
    snipped?: boolean;
    format?: { protocol?: string; mime_type?: string };
}

interface ScTrack {
    id: number;
    title?: string;
    duration?: number;
    full_duration?: number;
    policy?: string;
    streamable?: boolean;
    track_authorization?: string;
    user?: { username?: string };
    media?: { transcodings?: ScTranscoding[] };
}

function orderTranscodings(t: ScTrack): ScTranscoding[] {
    const list = (t.media?.transcodings || []).filter(tc => !tc.snipped);
    const rank = (tc: ScTranscoding): number => {
        const protocol = tc.format?.protocol || '';
        const mime = tc.format?.mime_type || '';
        // Ignora streams criptografados com DRM (cbc-encrypted-hls / ctr-encrypted-hls)
        if (protocol.includes('encrypted')) return 9;
        if (protocol === 'progressive') return 0;
        if (protocol === 'hls' && (mime.includes('mp4') || mime.includes('aac'))) return 1;
        if (protocol === 'hls' && mime.includes('ogg')) return 2;
        if (protocol === 'hls') return 3;
        return 9;
    };
    return [...list].sort((a, b) => rank(a) - rank(b)).filter(tc => rank(tc) < 9);
}

function isPlayableScTrack(t: ScTrack): boolean {
    if (t.policy === 'SNIP' || t.policy === 'BLOCK' || t.streamable === false) return false;
    return orderTranscodings(t).length > 0;
}

function scoreSoundCloudCandidate(candidate: ScTrack, track: Track): number {
    const wantTitle = normalize(cleanTitle(track.songTitle || track.title.split(' - ')[0] || track.title));
    const wantArtist = normalize(track.artist || track.author || '');
    const haveTitle = normalize(candidate.title || '');
    const haveUser = normalize(candidate.user?.username || '');
    const haystack = `${haveTitle} ${haveUser}`;

    const titleTokens = wantTitle.split(' ').filter(t => t.length > 1);
    const artistTokens = wantArtist.split(' ').filter(t => t.length > 1);
    const titleHits = titleTokens.filter(t => haystack.includes(t)).length;
    const artistHits = artistTokens.filter(t => haystack.includes(t)).length;

    let score = 0;
    score += titleTokens.length ? (titleHits / titleTokens.length) * 60 : 0;
    score += artistTokens.length ? (artistHits / artistTokens.length) * 30 : 0;

    const known = new Set([
        ...titleTokens,
        ...artistTokens,
        'official',
        'oficial',
        'audio',
        'video',
        'clipe',
        'lyrics',
        'letra',
        'remastered',
        'feat',
        'ft',
        'mc',
        'dj'
    ]);
    const extra = haveTitle.split(' ').filter(t => t.length > 1 && !known.has(t)).length;
    score -= Math.min(extra * 3, 25);

    const candSeconds = Math.round((candidate.duration || 0) / 1000);
    if (track.durationSeconds > 0 && candSeconds > 0) {
        const diff = Math.abs(candSeconds - track.durationSeconds);
        score += diff <= 5 ? 20 : diff <= 15 ? 10 : diff <= 40 ? 0 : -25;
    }

    if (
        /\b(cover|karaoke|instrumental|slowed|sped up|8d|reverb)\b/.test(haveTitle) &&
        !/\b(cover|karaoke|instrumental|slowed|sped up|8d|reverb)\b/.test(normalize(track.title))
    ) {
        score -= 20;
    }
    return score;
}

async function findSoundCloudAudioSource(track: Track): Promise<ResolvedAudioSource | null> {
    const queries = [
        track.artist && track.songTitle ? `${track.artist} ${cleanTitle(track.songTitle)}` : cleanTitle(track.title),
        track.songTitle ? cleanTitle(track.songTitle) : ''
    ].filter(Boolean);

    for (const q of queries) {
        try {
            const data = await soundCloudApi<{ collection?: ScTrack[] }>(
                `/search/tracks?q=${encodeURIComponent(q)}&limit=10`
            );
            const candidates = (data.collection || []).filter(isPlayableScTrack);
            if (candidates.length === 0) continue;

            const ranked = candidates
                .map(c => ({ c, score: scoreSoundCloudCandidate(c, track) }))
                .sort((a, b) => b.score - a.score);

            const clientId = await getSoundCloudClientId();

            for (const { c, score } of ranked.slice(0, 3)) {
                if (score < 25) continue;
                const authParam = c.track_authorization ? `&track_authorization=${c.track_authorization}` : '';
                for (const transcoding of orderTranscodings(c)) {
                    try {
                        const resolved = await fetchJson<{ url?: string }>(
                            `${transcoding.url}?client_id=${clientId}${authParam}`
                        );
                        if (resolved.url) {
                            logger.info(
                                `[MusicExtractor] Áudio SoundCloud para "${track.title}" -> "${c.title}" (score ${Math.round(score)})`
                            );
                            return {
                                kind: 'url',
                                url: resolved.url,
                                expiresAt: Date.now() + STREAM_CACHE_TTL_MS
                            };
                        }
                    } catch {
                        // tenta próximo transcoding
                    }
                }
            }
        } catch {
            // tenta próxima query
        }
    }

    return null;
}

/**
 * Resolve e faz cache da melhor fonte de áudio disponível para a faixa
 */
async function resolveBestAudioSource(track: Track): Promise<ResolvedAudioSource | null> {
    const key = track.id;
    const cached = audioSourceCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached;

    const inflight = inflightAudioSources.get(key);
    if (inflight) return inflight;

    const promise = (async (): Promise<ResolvedAudioSource | null> => {
        // 1. Motor rápido via HTTP Chunked Range (~800ms)
        const chunked = await findChunkedAudioSource(track);
        if (chunked) {
            audioSourceCache.set(key, chunked);
            return chunked;
        }

        // 2. Motor SoundCloud API v2 nativa (sem DRM)
        const sc = await findSoundCloudAudioSource(track);
        if (sc) {
            audioSourceCache.set(key, sc);
            return sc;
        }

        // 3. Fallback CDN do Deezer se disponível
        if (track.previewUrl) {
            return {
                kind: 'url',
                url: track.previewUrl,
                expiresAt: Date.now() + 10 * 60 * 1000
            };
        }

        return null;
    })().finally(() => {
        inflightAudioSources.delete(key);
    });

    inflightAudioSources.set(key, promise);
    return promise;
}

// ═══════════════════════════════════════════════════════════════════════════
// API pública
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Inicializa as fontes de áudio do módulo de música
 */
export function warmupMusicSources(): void {
    logger.info('[MusicExtractor] Fontes de áudio prontas (Deezer + Spotify + Dual Stream Engine)');
}

/**
 * Resolve faixas a partir de texto, link do Spotify/Deezer ou link direto de áudio
 */
export async function resolveTracks(query: string, requestedBy: GuildMember): Promise<Track[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    // 1. Áudio direto por URL
    if (isDirectAudioUrl(trimmed)) {
        try {
            const urlObj = new URL(trimmed);
            const pathParts = urlObj.pathname.split('/');
            const filename = decodeURIComponent(pathParts[pathParts.length - 1] || 'Áudio Direto');
            return [{
                id: trimmed,
                title: filename,
                url: trimmed,
                duration: 'Direto',
                durationSeconds: 0,
                author: urlObj.hostname,
                requestedBy,
                source: 'direct'
            }];
        } catch {
            return [];
        }
    }

    // 2. Links do Spotify
    if (isHttpUrl(trimmed) && isSpotifyUrl(trimmed)) {
        const tracks = (await resolveSpotifyUrl(trimmed)).map(m => toTrack(m, requestedBy));
        if (tracks[0]) prewarmTrack(tracks[0]);
        return tracks;
    }

    // 3. Links do Deezer
    if (isHttpUrl(trimmed) && isDeezerUrl(trimmed)) {
        const tracks = (await resolveDeezerUrl(trimmed)).map(m => toTrack(m, requestedBy));
        if (tracks[0]) prewarmTrack(tracks[0]);
        return tracks;
    }

    // 4. Outros links (ex: YouTube) não são suportados
    if (isHttpUrl(trimmed)) return [];

    // 5. Busca por texto (Deezer) com cache
    const cacheKey = normalize(trimmed);
    const cached = searchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        const track = toTrack(cached.track, requestedBy);
        prewarmTrack(track);
        return [track];
    }

    const found = await searchDeezer(trimmed);
    if (found) {
        searchCache.set(cacheKey, { track: found, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
        const track = toTrack(found, requestedBy);
        prewarmTrack(track);
        return [track];
    }

    // 6. Fallback: busca direta no SoundCloud quando a música não está no Deezer
    try {
        const data = await soundCloudApi<{ collection?: ScTrack[] }>(
            `/search/tracks?q=${encodeURIComponent(trimmed)}&limit=5`
        );
        const sc = (data.collection || []).find(isPlayableScTrack);
        if (sc) {
            const seconds = Math.round((sc.duration || 0) / 1000);
            const meta: TrackMeta = {
                id: `sc-${sc.id}`,
                title: sc.title || trimmed,
                url: `https://www.deezer.com/search/${encodeURIComponent(trimmed)}`,
                duration: formatDuration(seconds),
                durationSeconds: seconds,
                author: sc.user?.username || 'Desconhecido',
                source: 'soundcloud',
                artist: sc.user?.username,
                songTitle: sc.title
            };
            searchCache.set(cacheKey, { track: meta, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
            const track = toTrack(meta, requestedBy);
            prewarmTrack(track);
            return [track];
        }
    } catch (error: unknown) {
        logger.warn(`[MusicExtractor] Fallback SoundCloud falhou para "${trimmed}": ${(error as Error).message}`);
    }

    return [];
}

/**
 * Pré-aquece a faixa em segundo plano para a reprodução começar instantaneamente
 */
export function prewarmTrack(track: Track | undefined): void {
    if (!track || track.source === 'direct') return;
    resolveBestAudioSource(track).catch(() => {});
}

/**
 * Cria um stream PCM a partir de requisições HTTP Range em blocos de 512KB (~800ms total)
 */
async function createChunkedRangePcmResource(
    source: ResolvedAudioSource,
    track: Track
): Promise<AudioResource | null> {
    const total = source.contentLength || 0;
    if (total <= 0) return null;

    const ua = source.userAgent || IOS_UA;
    const firstChunkSize = 384 * 1024;
    const firstEnd = Math.min(firstChunkSize - 1, total - 1);

    // Dispara em paralelo o desbloqueio da URL completa enquanto baixa o primeiro bloco instantâneo
    const unlockedUrlPromise = unlockFullStreamUrl(source.mediaId, source.itag);

    let firstBuffer: Buffer;
    try {
        const firstRes = await fetch(source.url, {
            headers: { 'User-Agent': ua, Range: `bytes=0-${firstEnd}` },
            signal: AbortSignal.timeout(4000)
        });
        if (!firstRes.ok && firstRes.status !== 206) return null;
        firstBuffer = Buffer.from(await firstRes.arrayBuffer());
        if (firstBuffer.length === 0) return null;
    } catch {
        return null;
    }

    let aborted = false;
    const chunkStream = Readable.from(
        (async function* () {
            yield firstBuffer;
            const unlockedUrl = await unlockedUrlPromise;
            const activeUrl = unlockedUrl || source.url;
            const step = 512 * 1024;

            for (let start = firstEnd + 1; start < total && !aborted; start += step) {
                const end = Math.min(start + step - 1, total - 1);
                let chunkBuf: Buffer | null = null;

                for (let attempt = 0; attempt < 3 && !aborted; attempt++) {
                    try {
                        const res = await fetch(activeUrl, {
                            headers: { 'User-Agent': ua, Range: `bytes=${start}-${end}` },
                            signal: AbortSignal.timeout(10_000)
                        });
                        if (res.ok || res.status === 206) {
                            chunkBuf = Buffer.from(await res.arrayBuffer());
                            break;
                        }
                    } catch {
                        // tenta novamente
                    }
                    await new Promise(r => setTimeout(r, 250));
                }

                if (!chunkBuf || chunkBuf.length === 0) break;
                yield chunkBuf;
            }
        })()
    );

    const ffmpeg = new prism.FFmpeg({
        args: [
            '-analyzeduration', '0',
            '-probesize', '32768',
            '-fflags', '+nobuffer',
            '-i', 'pipe:0',
            '-loglevel', 'error',
            '-vn',
            '-f', 's16le',
            '-ar', '48000',
            '-ac', '2'
        ]
    });

    const buffered = new PassThrough({ highWaterMark: 1024 * 1024 });
    chunkStream.on('error', () => {
        aborted = true;
    });
    chunkStream.pipe(ffmpeg).pipe(buffered);

    const ready = await new Promise<boolean>((resolve) => {
        let settled = false;
        const finish = (ok: boolean) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(ok);
        };
        const timer = setTimeout(() => finish(false), FFMPEG_READY_TIMEOUT_MS);
        buffered.once('readable', () => finish(true));
        ffmpeg.once('error', () => finish(false));
        ffmpeg.once('close', () => finish(false));
    });

    if (!ready) {
        aborted = true;
        try {
            chunkStream.destroy();
            ffmpeg.destroy();
            buffered.destroy();
        } catch {
            // ignora
        }
        return null;
    }

    buffered.once('close', () => {
        aborted = true;
        try {
            chunkStream.destroy();
            ffmpeg.destroy();
        } catch {
            // ignora
        }
    });

    return createAudioResource(buffered, {
        inputType: StreamType.Raw,
        metadata: track
    });
}

/**
 * Abre o FFmpeg em uma URL direta/HLS e só devolve o recurso quando os primeiros bytes PCM chegarem
 */
async function createVerifiedUrlPcmResource(inputUrl: string, track: Track): Promise<AudioResource | null> {
    const isHls = inputUrl.includes('.m3u8');
    const ffmpeg = new prism.FFmpeg({
        args: [
            '-analyzeduration', '0',
            '-probesize', '65536',
            '-fflags', '+nobuffer',
            ...(isHls ? [] : ['-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5']),
            '-i', inputUrl,
            '-loglevel', 'error',
            '-vn',
            '-f', 's16le',
            '-ar', '48000',
            '-ac', '2'
        ]
    });

    const buffered = new PassThrough({ highWaterMark: 1024 * 1024 });
    ffmpeg.pipe(buffered);

    const ready = await new Promise<boolean>((resolve) => {
        let settled = false;
        const finish = (ok: boolean) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(ok);
        };
        const timer = setTimeout(() => finish(false), FFMPEG_READY_TIMEOUT_MS);
        buffered.once('readable', () => finish(true));
        ffmpeg.once('error', (err) => {
            logger.warn(`[MusicExtractor] Erro FFmpeg em "${track.title}": ${err.message}`);
            finish(false);
        });
        ffmpeg.once('close', () => finish(false));
    });

    if (!ready) {
        try {
            ffmpeg.destroy();
            buffered.destroy();
        } catch {
            // ignora
        }
        return null;
    }

    ffmpeg.on('error', (err) => {
        logger.warn(`[MusicExtractor] FFmpeg stream error em "${track.title}": ${err.message}`);
    });

    return createAudioResource(buffered, {
        inputType: StreamType.Raw,
        metadata: track
    });
}

async function openAudioSource(source: ResolvedAudioSource, track: Track): Promise<AudioResource | null> {
    if (source.kind === 'chunked') {
        return createChunkedRangePcmResource(source, track);
    }
    return createVerifiedUrlPcmResource(source.url, track);
}

/**
 * Cria o recurso de áudio da faixa (verificado: só retorna se houver som)
 */
export async function createAudioStream(track: Track): Promise<AudioResource> {
    if (track.source === 'direct') {
        const direct = await createVerifiedUrlPcmResource(track.url, track);
        if (direct) return direct;
        throw new Error('Não consegui abrir esse link de áudio');
    }

    const started = Date.now();
    const source = await resolveBestAudioSource(track);

    if (source) {
        const resource = await openAudioSource(source, track);
        if (resource) {
            logger.info(`[MusicExtractor] "${track.title}" pronto em ${Date.now() - started}ms (${source.kind})`);
            return resource;
        }
        audioSourceCache.delete(track.id);
    }

    // Fallback direto para SoundCloud caso o motor chunked tenha falhado no FFmpeg
    const scFallback = await findSoundCloudAudioSource(track);
    if (scFallback) {
        const scResource = await openAudioSource(scFallback, track);
        if (scResource) {
            audioSourceCache.set(track.id, scFallback);
            logger.info(`[MusicExtractor] "${track.title}" pronto via SoundCloud em ${Date.now() - started}ms`);
            return scResource;
        }
    }

    // Último fallback: preview oficial da CDN do Deezer
    if (track.previewUrl) {
        const previewResource = await createVerifiedUrlPcmResource(track.previewUrl, track);
        if (previewResource) {
            logger.info(`[MusicExtractor] "${track.title}" pronto via Deezer CDN em ${Date.now() - started}ms`);
            return previewResource;
        }
    }

    throw new Error('Não encontrei o áudio dessa música');
}
