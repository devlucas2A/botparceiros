/**
 * Extrator de música do CoreBot
 *
 * - Busca por texto: Deezer (catálogo oficial, ~300ms)
 * - Links: Spotify e Deezer (faixa, álbum e playlist)
 * - Áudio: SoundCloud via API HTTP nativa (sem Python / yt-dlp), funciona em servidores na nuvem
 * - Links diretos de áudio (.mp3, .ogg, ...) tocam direto pelo FFmpeg
 *
 * YouTube NÃO é suportado (bloqueia IPs de datacenter e deixava o bot lento/mudo).
 */
import { PassThrough } from 'stream';
import { createAudioResource, AudioResource, StreamType } from '@discordjs/voice';
import { GuildMember } from 'discord.js';
import prism from 'prism-media';
import { Track } from './types';
import { logger } from '../../shared/services';

const HTTP_TIMEOUT_MS = 6000;
const FFMPEG_READY_TIMEOUT_MS = 8000;
const SEARCH_CACHE_TTL_MS = 30 * 60 * 1000;
const STREAM_CACHE_TTL_MS = 50 * 60 * 1000; // URLs assinadas do SoundCloud expiram em ~1-2h
const CLIENT_ID_TTL_MS = 6 * 60 * 60 * 1000;
const BROWSER_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

type TrackMeta = Omit<Track, 'requestedBy'>;

const searchCache = new Map<string, { track: TrackMeta; expiresAt: number }>();
const streamUrlCache = new Map<string, { streamUrl: string; expiresAt: number }>();
const inflightStreams = new Map<string, Promise<string | null>>();

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
 * Retorna true para links que não são suportados (YouTube, SoundCloud, etc.).
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
// Deezer (busca por texto + links)
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
        songTitle: item.title
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

        // Fallback oEmbed (só título)
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
// SoundCloud (fonte de áudio completa, via HTTP nativo)
// ═══════════════════════════════════════════════════════════════════════════

let scClientId: { value: string; expiresAt: number } | null = null;
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
        .reverse(); // o client_id costuma estar nos últimos bundles

    for (const src of scripts) {
        try {
            const js = await (await fetch(src, { signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) })).text();
            const m = js.match(/client_id\s*:\s*"([a-zA-Z0-9]{32})"/) || js.match(/client_id=([a-zA-Z0-9]{32})/);
            if (m) return m[1];
        } catch {
            // tenta o próximo bundle
        }
    }
    throw new Error('Não foi possível obter o client_id do SoundCloud');
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

    // Penaliza títulos com muita coisa a mais (mashups, reworks, compilações)
    const known = new Set([...titleTokens, ...artistTokens, 'official', 'oficial', 'audio', 'video', 'clipe', 'lyrics', 'letra', 'remastered', 'feat', 'ft']);
    const extra = haveTitle.split(' ').filter(t => t.length > 1 && !known.has(t)).length;
    score -= Math.min(extra * 3, 30);

    const candSeconds = Math.round((candidate.duration || 0) / 1000);
    if (track.durationSeconds > 0 && candSeconds > 0) {
        const diff = Math.abs(candSeconds - track.durationSeconds);
        score += diff <= 5 ? 20 : diff <= 15 ? 10 : diff <= 40 ? 0 : -25;
    }

    if (/\b(cover|karaoke|instrumental|remix|slowed|sped up|8d|reverb)\b/.test(haveTitle) &&
        !/\b(cover|karaoke|instrumental|remix|slowed|sped up|8d|reverb)\b/.test(normalize(track.title))) {
        score -= 20;
    }
    return score;
}

function isPlayableScTrack(t: ScTrack): boolean {
    if (t.policy === 'SNIP' || t.policy === 'BLOCK' || t.streamable === false) return false;
    const transcodings = t.media?.transcodings || [];
    return transcodings.some(tc => !tc.snipped);
}

function orderTranscodings(t: ScTrack): ScTranscoding[] {
    const list = (t.media?.transcodings || []).filter(tc => !tc.snipped);
    const rank = (tc: ScTranscoding): number => {
        const protocol = tc.format?.protocol || '';
        const mime = tc.format?.mime_type || '';
        if (protocol === 'progressive') return 0;
        if (protocol === 'hls' && (mime.includes('mp4') || mime.includes('aac'))) return 1;
        if (protocol === 'hls' && mime.includes('ogg')) return 2;
        if (protocol === 'hls') return 3;
        return 9;
    };
    return [...list].sort((a, b) => rank(a) - rank(b)).filter(tc => rank(tc) < 9);
}

async function findSoundCloudStreamUrl(track: Track): Promise<string | null> {
    const base = track.artist && track.songTitle
        ? `${track.artist} ${cleanTitle(track.songTitle)}`
        : cleanTitle(track.title.replace(/\s+-\s+/, ' '));

    const data = await soundCloudApi<{ collection?: ScTrack[] }>(
        `/search/tracks?q=${encodeURIComponent(base)}&limit=10`
    );
    const candidates = (data.collection || []).filter(isPlayableScTrack);
    if (candidates.length === 0) return null;

    const best = candidates
        .map(c => ({ c, score: scoreSoundCloudCandidate(c, track) }))
        .sort((a, b) => b.score - a.score)[0];

    if (!best || best.score < 35) {
        logger.warn(`[MusicExtractor] Nenhum áudio confiável no SoundCloud para "${track.title}" (melhor score ${best?.score ?? 0})`);
        return null;
    }

    const clientId = await getSoundCloudClientId();
    const authParam = best.c.track_authorization ? `&track_authorization=${best.c.track_authorization}` : '';

    for (const transcoding of orderTranscodings(best.c)) {
        try {
            const resolved = await fetchJson<{ url?: string }>(`${transcoding.url}?client_id=${clientId}${authParam}`);
            if (resolved.url) {
                logger.info(`[MusicExtractor] Áudio encontrado para "${track.title}" -> SoundCloud "${best.c.title}" (score ${Math.round(best.score)}, ${transcoding.format?.protocol})`);
                return resolved.url;
            }
        } catch {
            // tenta o próximo formato
        }
    }
    return null;
}

/**
 * Obtém (com cache e deduplicação) a URL de áudio da faixa
 */
async function getStreamUrl(track: Track): Promise<string | null> {
    const key = track.id;
    const cached = streamUrlCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.streamUrl;

    const inflight = inflightStreams.get(key);
    if (inflight) return inflight;

    const promise = findSoundCloudStreamUrl(track)
        .then(url => {
            if (url) streamUrlCache.set(key, { streamUrl: url, expiresAt: Date.now() + STREAM_CACHE_TTL_MS });
            return url;
        })
        .catch((error: unknown) => {
            logger.warn(`[MusicExtractor] Falha ao buscar áudio para "${track.title}": ${(error as Error).message}`);
            return null;
        })
        .finally(() => inflightStreams.delete(key));

    inflightStreams.set(key, promise);
    return promise;
}

// ═══════════════════════════════════════════════════════════════════════════
// API pública
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pré-carrega o client_id do SoundCloud para a primeira música tocar sem atraso
 */
export function warmupMusicSources(): void {
    getSoundCloudClientId()
        .then(() => logger.info('[MusicExtractor] Fonte de áudio pronta (SoundCloud)'))
        .catch(err => logger.warn(`[MusicExtractor] Falha no warmup do SoundCloud: ${err.message}`));
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
        return (await resolveSpotifyUrl(trimmed)).map(m => toTrack(m, requestedBy));
    }

    // 3. Links do Deezer
    if (isHttpUrl(trimmed) && isDeezerUrl(trimmed)) {
        return (await resolveDeezerUrl(trimmed)).map(m => toTrack(m, requestedBy));
    }

    // 4. Outros links (YouTube, SoundCloud...) não são suportados
    if (isHttpUrl(trimmed)) return [];

    // 5. Busca por texto (Deezer) com cache
    const cacheKey = normalize(trimmed);
    const cached = searchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return [toTrack(cached.track, requestedBy)];
    }

    const found = await searchDeezer(trimmed);
    if (found) {
        searchCache.set(cacheKey, { track: found, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
        const track = toTrack(found, requestedBy);
        prewarmTrack(track); // já começa a buscar o áudio
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
                url: `https://api.soundcloud.com/tracks/${sc.id}`,
                duration: formatDuration(seconds),
                durationSeconds: seconds,
                author: sc.user?.username || 'Desconhecido',
                source: 'soundcloud',
                artist: sc.user?.username,
                songTitle: sc.title
            };
            searchCache.set(cacheKey, { track: meta, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
            return [toTrack(meta, requestedBy)];
        }
    } catch (error: unknown) {
        logger.warn(`[MusicExtractor] Fallback SoundCloud falhou para "${trimmed}": ${(error as Error).message}`);
    }

    return [];
}

/**
 * Pré-aquece a faixa em segundo plano para a troca ser instantânea
 */
export function prewarmTrack(track: Track | undefined): void {
    if (!track || track.source === 'direct') return;
    getStreamUrl(track).catch(() => {});
}

/**
 * Abre o FFmpeg e só devolve o recurso quando os primeiros bytes de áudio chegarem
 * (assim nunca mostramos "Tocando Agora" sem som)
 */
async function createVerifiedPcmResource(inputUrl: string, track: Track): Promise<AudioResource | null> {
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

/**
 * Cria o recurso de áudio da faixa (verificado: só retorna se houver som)
 */
export async function createAudioStream(track: Track): Promise<AudioResource> {
    if (track.source === 'direct') {
        const direct = await createVerifiedPcmResource(track.url, track);
        if (direct) return direct;
        throw new Error('Não consegui abrir esse link de áudio');
    }

    const started = Date.now();
    let streamUrl = await getStreamUrl(track);

    if (streamUrl) {
        const resource = await createVerifiedPcmResource(streamUrl, track);
        if (resource) {
            logger.info(`[MusicExtractor] "${track.title}" pronto em ${Date.now() - started}ms`);
            return resource;
        }

        // URL expirada/inválida: limpa o cache e tenta uma vez de novo
        streamUrlCache.delete(track.id);
        streamUrl = await getStreamUrl(track);
        if (streamUrl) {
            const retry = await createVerifiedPcmResource(streamUrl, track);
            if (retry) return retry;
        }
    }

    throw new Error('Não encontrei o áudio dessa música');
}
