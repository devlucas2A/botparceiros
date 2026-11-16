"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDuration = formatDuration;
exports.isDirectAudioUrl = isDirectAudioUrl;
exports.resolveTracks = resolveTracks;
exports.prewarmTrack = prewarmTrack;
exports.createAudioStream = createAudioStream;
const child_process_1 = require("child_process");
const util_1 = require("util");
const stream_1 = require("stream");
const voice_1 = require("@discordjs/voice");
const prism_media_1 = __importDefault(require("prism-media"));
const services_1 = require("../../shared/services");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const YTDLP_BIN = process.env.YTDLP_PATH || 'yt-dlp';
const SEARCH_TIMEOUT_MS = 12_000;
const STREAM_URL_TIMEOUT_MS = 15_000;
const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;
const STREAM_CACHE_TTL_MS = 90 * 60 * 1000;
const searchCache = new Map();
const streamUrlCache = new Map();
const inflightPrewarms = new Map();
/**
 * Converte segundos para formato legível MM:SS ou HH:MM:SS
 */
function formatDuration(seconds) {
    if (!seconds || isNaN(seconds) || seconds <= 0)
        return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
function parseDurationLabelToSeconds(label) {
    if (!label)
        return 0;
    const parts = label.split(':').map(n => parseInt(n, 10));
    if (parts.some(isNaN))
        return 0;
    if (parts.length === 2)
        return parts[0] * 60 + parts[1];
    if (parts.length === 3)
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
}
/**
 * Verifica se a string é uma URL de áudio direta (.mp3, .wav, .ogg, etc.)
 */
function isDirectAudioUrl(url) {
    try {
        const parsed = new URL(url);
        const pathname = parsed.pathname.toLowerCase();
        return /\.(mp3|wav|ogg|flac|aac|m4a|opus)$/i.test(pathname);
    }
    catch {
        return false;
    }
}
function isHttpUrl(value) {
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    }
    catch {
        return false;
    }
}
function detectSource(url) {
    const lower = url.toLowerCase();
    if (lower.includes('soundcloud.com'))
        return 'soundcloud';
    if (lower.includes('spotify.com'))
        return 'spotify';
    if (lower.includes('deezer.com') || lower.includes('deezer.page.link'))
        return 'deezer';
    if (isDirectAudioUrl(url))
        return 'direct';
    return 'youtube';
}
function mapEntryToTrack(entry, requestedBy, fallbackSource) {
    const url = entry.webpage_url ||
        entry.original_url ||
        (entry.url && isHttpUrl(entry.url) ? entry.url : undefined) ||
        (entry.id ? `https://www.youtube.com/watch?v=${entry.id}` : undefined);
    if (!url)
        return null;
    const seconds = typeof entry.duration === 'number' && entry.duration > 0 ? Math.round(entry.duration) : 0;
    const thumbnail = entry.thumbnail || entry.thumbnails?.[0]?.url;
    return {
        id: String(entry.id || url),
        title: entry.title || 'Música sem título',
        url,
        duration: seconds > 0 ? formatDuration(seconds) : (entry.duration_string || 'Ao vivo'),
        durationSeconds: seconds,
        thumbnail,
        author: entry.uploader || entry.channel || 'Desconhecido',
        requestedBy,
        source: detectSource(url) || fallbackSource
    };
}
/**
 * Busca rápida no YouTube via Innertube HTTP API (~400-700ms, sem abrir subprocesso Python)
 */
async function searchYouTubeFast(queryText, requestedBy) {
    try {
        const res = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                context: {
                    client: {
                        clientName: 'WEB',
                        clientVersion: '2.20250101.00.00',
                        hl: 'pt',
                        gl: 'BR'
                    }
                },
                query: queryText,
                params: 'EgIQAQ%3D%3D'
            }),
            signal: AbortSignal.timeout(5000)
        });
        if (!res.ok)
            return null;
        const data = (await res.json());
        const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
        for (const section of sections) {
            const items = section?.itemSectionRenderer?.contents || [];
            const vid = items.find((item) => item?.videoRenderer?.videoId)?.videoRenderer;
            if (!vid)
                continue;
            const durationText = vid.lengthText?.simpleText;
            const durationSeconds = parseDurationLabelToSeconds(durationText);
            const title = vid.title?.runs?.map((r) => r.text).join('') || 'Música sem título';
            const author = vid.ownerText?.runs?.[0]?.text || 'YouTube';
            const thumbnails = vid.thumbnail?.thumbnails;
            const thumbnail = Array.isArray(thumbnails) && thumbnails.length > 0 ? thumbnails[thumbnails.length - 1]?.url : undefined;
            return {
                id: String(vid.videoId),
                title,
                url: `https://www.youtube.com/watch?v=${vid.videoId}`,
                duration: durationText || (durationSeconds > 0 ? formatDuration(durationSeconds) : 'Ao vivo'),
                durationSeconds,
                thumbnail,
                author,
                requestedBy,
                source: 'youtube'
            };
        }
        return null;
    }
    catch {
        return null;
    }
}
/**
 * Resolve faixas/álbuns/playlists do Deezer via API pública (~300ms)
 */
async function resolveDeezerUrl(deezerUrl, requestedBy) {
    try {
        let finalUrl = deezerUrl;
        if (deezerUrl.includes('deezer.page.link')) {
            const resp = await fetch(deezerUrl, { redirect: 'follow', signal: AbortSignal.timeout(5000) });
            finalUrl = resp.url || deezerUrl;
        }
        const match = finalUrl.match(/deezer\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(track|album|playlist)\/(\d+)/i);
        if (!match)
            return [];
        const [, kind, id] = match;
        const apiRes = await fetch(`https://api.deezer.com/${kind.toLowerCase()}/${id}`, {
            signal: AbortSignal.timeout(5000)
        });
        if (!apiRes.ok)
            return [];
        const data = (await apiRes.json());
        if (kind.toLowerCase() === 'track' && data?.title) {
            const artist = data.artist?.name || 'Deezer';
            return [{
                    id: String(data.id),
                    title: `${data.title} - ${artist}`,
                    url: data.link || finalUrl,
                    duration: formatDuration(Number(data.duration) || 0),
                    durationSeconds: Number(data.duration) || 0,
                    thumbnail: data.album?.cover_medium || data.album?.cover,
                    author: artist,
                    requestedBy,
                    source: 'deezer'
                }];
        }
        const list = data?.tracks?.data;
        if (Array.isArray(list)) {
            return list.slice(0, 25).map((item) => {
                const artist = item.artist?.name || 'Deezer';
                return {
                    id: String(item.id),
                    title: `${item.title} - ${artist}`,
                    url: item.link || finalUrl,
                    duration: formatDuration(Number(item.duration) || 0),
                    durationSeconds: Number(item.duration) || 0,
                    thumbnail: item.album?.cover_medium || data?.cover_medium,
                    author: artist,
                    requestedBy,
                    source: 'deezer'
                };
            });
        }
        return [];
    }
    catch {
        return [];
    }
}
async function resolveSpotifyTitle(spotifyUrl) {
    try {
        const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`, {
            signal: AbortSignal.timeout(5000)
        });
        if (!res.ok)
            return null;
        const data = (await res.json());
        if (!data.title)
            return null;
        return data.author_name ? `${data.title} ${data.author_name}` : data.title;
    }
    catch {
        return null;
    }
}
async function runYtDlpJson(target, isPlaylistUrl = false) {
    const args = [
        '--js-runtimes', 'node',
        '--no-warnings',
        '--dump-single-json',
        '--default-search', 'ytsearch',
        ...(isPlaylistUrl ? ['--flat-playlist', '--playlist-end', '25'] : ['--no-playlist']),
        target
    ];
    const { stdout } = await execFileAsync(YTDLP_BIN, args, {
        timeout: SEARCH_TIMEOUT_MS,
        maxBuffer: 8 * 1024 * 1024
    });
    if (!stdout || !stdout.trim())
        return null;
    return JSON.parse(stdout);
}
/**
 * Resolve tracks a partir de uma busca de texto ou link (YouTube, Deezer, Spotify, SoundCloud, Link Direto)
 */
async function resolveTracks(query, requestedBy) {
    const trimmed = query.trim();
    if (!trimmed)
        return [];
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
        }
        catch (error) {
            services_1.logger.warn(`[MusicExtractor] Falha ao analisar URL direta ${trimmed}:`, { error });
        }
    }
    try {
        // 2. Link do Deezer (Track, Álbum ou Playlist via API pública rápida)
        if (isHttpUrl(trimmed) && (trimmed.toLowerCase().includes('deezer.com') || trimmed.toLowerCase().includes('deezer.page.link'))) {
            const deezerTracks = await resolveDeezerUrl(trimmed, requestedBy);
            if (deezerTracks.length > 0)
                return deezerTracks;
        }
        // 3. Link do Spotify -> resolve nome via oEmbed e busca no YouTube rápido
        if (isHttpUrl(trimmed) && trimmed.toLowerCase().includes('open.spotify.com')) {
            const titleQuery = await resolveSpotifyTitle(trimmed);
            if (!titleQuery)
                return [];
            return resolveTracks(titleQuery, requestedBy);
        }
        // 4. URL direta (YouTube vídeo/playlist, SoundCloud etc.)
        if (isHttpUrl(trimmed)) {
            const looksLikePlaylist = trimmed.includes('list=') || trimmed.includes('/sets/');
            const json = await runYtDlpJson(trimmed, looksLikePlaylist);
            if (!json)
                return [];
            if (Array.isArray(json.entries) && json.entries.length > 0) {
                return json.entries
                    .map(entry => mapEntryToTrack(entry, requestedBy, detectSource(trimmed)))
                    .filter((t) => t !== null);
            }
            const single = mapEntryToTrack(json, requestedBy, detectSource(trimmed));
            return single ? [single] : [];
        }
        // 5. Cache rápido de busca textual
        const cacheKey = trimmed.toLowerCase();
        const cached = searchCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return [{
                    id: cached.id,
                    title: cached.title,
                    url: cached.url,
                    duration: cached.duration,
                    durationSeconds: cached.durationSeconds,
                    thumbnail: cached.thumbnail,
                    author: cached.author,
                    requestedBy,
                    source: cached.source
                }];
        }
        // 6. Busca rápida no YouTube via Innertube HTTP (~500ms)
        const fastTrack = await searchYouTubeFast(trimmed, requestedBy);
        if (fastTrack) {
            searchCache.set(cacheKey, {
                id: fastTrack.id,
                title: fastTrack.title,
                url: fastTrack.url,
                duration: fastTrack.duration,
                durationSeconds: fastTrack.durationSeconds,
                thumbnail: fastTrack.thumbnail,
                author: fastTrack.author,
                source: fastTrack.source,
                expiresAt: Date.now() + SEARCH_CACHE_TTL_MS
            });
            return [fastTrack];
        }
        // 7. Fallback yt-dlp YouTube search
        try {
            const ytJson = await runYtDlpJson(`ytsearch1:${trimmed}`, false);
            const ytEntry = ytJson?.entries?.[0] ?? ytJson;
            if (ytEntry) {
                const track = mapEntryToTrack(ytEntry, requestedBy, 'youtube');
                if (track)
                    return [track];
            }
        }
        catch (ytError) {
            const err = ytError;
            services_1.logger.warn(`[MusicExtractor] Busca YouTube falhou para "${trimmed}", tentando SoundCloud: ${err.message}`);
        }
        // 8. Fallback automático para busca no SoundCloud
        try {
            const scJson = await runYtDlpJson(`scsearch1:${trimmed}`, false);
            const scEntry = scJson?.entries?.[0] ?? scJson;
            if (scEntry) {
                const track = mapEntryToTrack(scEntry, requestedBy, 'soundcloud');
                if (track)
                    return [track];
            }
        }
        catch (scError) {
            const err = scError;
            services_1.logger.error(`[MusicExtractor] Falha no fallback SoundCloud para "${trimmed}": ${err.message}`);
        }
        return [];
    }
    catch (error) {
        const err = error;
        services_1.logger.error(`[MusicExtractor] Erro ao resolver busca "${trimmed}": ${err.message}`, { error });
        return [];
    }
}
async function resolvePlayableUrl(track) {
    if (track.source === 'deezer' || track.source === 'spotify') {
        const fastMatch = await searchYouTubeFast(track.title, track.requestedBy);
        if (fastMatch) {
            return fastMatch.url;
        }
        const ytFallback = await runYtDlpJson(`ytsearch1:${track.title}`, false);
        const entry = ytFallback?.entries?.[0] ?? ytFallback;
        const matched = entry ? mapEntryToTrack(entry, track.requestedBy, 'youtube') : null;
        if (matched)
            return matched.url;
        throw new Error(`Não foi possível encontrar áudio para "${track.title}"`);
    }
    return track.url;
}
async function extractDirectStreamUrl(targetUrl) {
    const cached = streamUrlCache.get(targetUrl);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.streamUrl;
    }
    const existing = inflightPrewarms.get(targetUrl);
    if (existing)
        return existing;
    const promise = (async () => {
        const attempts = targetUrl.includes('youtube.com') || targetUrl.includes('youtu.be')
            ? [
                ['--js-runtimes', 'node', '--no-warnings', '--no-playlist', '--extractor-args', 'youtube:player_client=visionos', '-f', 'bestaudio[ext=webm]/bestaudio/best', '--get-url', targetUrl],
                ['--js-runtimes', 'node', '--no-warnings', '--no-playlist', '-f', 'bestaudio[ext=webm]/bestaudio/best', '--get-url', targetUrl]
            ]
            : [
                ['--no-warnings', '--no-playlist', '-f', 'bestaudio/best', '--get-url', targetUrl]
            ];
        for (const args of attempts) {
            try {
                const { stdout } = await execFileAsync(YTDLP_BIN, args, {
                    timeout: STREAM_URL_TIMEOUT_MS,
                    maxBuffer: 2 * 1024 * 1024
                });
                const directUrl = stdout.trim().split(/\r?\n/)[0]?.trim();
                if (directUrl && isHttpUrl(directUrl) && !directUrl.includes('.m3u8')) {
                    streamUrlCache.set(targetUrl, {
                        streamUrl: directUrl,
                        expiresAt: Date.now() + STREAM_CACHE_TTL_MS
                    });
                    return directUrl;
                }
            }
            catch {
                // Tenta próximo método
            }
        }
        return null;
    })().finally(() => {
        inflightPrewarms.delete(targetUrl);
    });
    inflightPrewarms.set(targetUrl, promise);
    return promise;
}
/**
 * Pré-aquece a próxima música da fila em segundo plano para troca instantânea
 */
function prewarmTrack(track) {
    if (!track || track.source === 'direct')
        return;
    resolvePlayableUrl(track)
        .then(url => extractDirectStreamUrl(url))
        .catch(() => { });
}
function createFfmpegHttpResource(streamUrl, track) {
    const ffmpeg = new prism_media_1.default.FFmpeg({
        args: [
            '-reconnect', '1',
            '-reconnect_streamed', '1',
            '-reconnect_delay_max', '5',
            '-i', streamUrl,
            '-analyzeduration', '0',
            '-loglevel', '0',
            '-f', 's16le',
            '-ar', '48000',
            '-ac', '2'
        ]
    });
    return (0, voice_1.createAudioResource)(ffmpeg, {
        inputType: voice_1.StreamType.Raw,
        metadata: track
    });
}
/**
 * Extração rápida do stream de áudio via URL direta (FFmpeg) com fallback para pipe yt-dlp
 */
async function createAudioStream(track) {
    // 1. Áudio Direto via FFmpeg
    if (track.source === 'direct') {
        return createFfmpegHttpResource(track.url, track);
    }
    const playableUrl = await resolvePlayableUrl(track);
    // 2. Caminho rápido: extrai URL direta do stream (cacheada/pré-aquecida) e envia ao FFmpeg
    const directStreamUrl = await extractDirectStreamUrl(playableUrl);
    if (directStreamUrl) {
        return createFfmpegHttpResource(directStreamUrl, track);
    }
    // 3. Fallback robusto: pipe direto do yt-dlp -> FFmpeg (para streams HLS/fragmentados)
    const ytdlp = (0, child_process_1.spawn)(YTDLP_BIN, [
        '--js-runtimes', 'node',
        '--no-warnings',
        '--no-playlist',
        '-f', 'bestaudio/best',
        '-o', '-',
        playableUrl
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    const ffmpeg = new prism_media_1.default.FFmpeg({
        args: [
            '-i', 'pipe:0',
            '-analyzeduration', '0',
            '-loglevel', '0',
            '-f', 's16le',
            '-ar', '48000',
            '-ac', '2'
        ]
    });
    const output = new stream_1.PassThrough();
    let stderrLogs = '';
    ytdlp.stderr.on('data', (chunk) => {
        stderrLogs += chunk.toString();
        if (stderrLogs.length > 2000)
            stderrLogs = stderrLogs.slice(-2000);
    });
    const cleanupChild = () => {
        if (!ytdlp.killed) {
            try {
                ytdlp.kill('SIGKILL');
            }
            catch {
                // ignora processo já encerrado
            }
        }
    };
    ytdlp.on('error', (err) => {
        services_1.logger.error(`[MusicExtractor] Erro ao iniciar yt-dlp para "${track.title}": ${err.message}`);
        output.destroy(err);
    });
    ytdlp.on('close', (code) => {
        if (code !== 0 && code !== null && !ytdlp.killed) {
            services_1.logger.warn(`[MusicExtractor] yt-dlp encerrou com código ${code} para "${track.title}": ${stderrLogs.trim()}`);
        }
    });
    ytdlp.stdout.on('error', () => cleanupChild());
    ffmpeg.on('error', (err) => {
        services_1.logger.warn(`[MusicExtractor] Erro FFmpeg em "${track.title}": ${err.message}`);
        cleanupChild();
    });
    ffmpeg.on('close', cleanupChild);
    output.on('close', cleanupChild);
    ytdlp.stdout.pipe(ffmpeg).pipe(output);
    return (0, voice_1.createAudioResource)(output, {
        inputType: voice_1.StreamType.Raw,
        metadata: track
    });
}
//# sourceMappingURL=extractor.js.map