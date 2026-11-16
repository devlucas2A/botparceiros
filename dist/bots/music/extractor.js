"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDuration = formatDuration;
exports.isDirectAudioUrl = isDirectAudioUrl;
exports.resolveTracks = resolveTracks;
exports.createAudioStream = createAudioStream;
const child_process_1 = require("child_process");
const util_1 = require("util");
const stream_1 = require("stream");
const voice_1 = require("@discordjs/voice");
const prism_media_1 = __importDefault(require("prism-media"));
const services_1 = require("../../shared/services");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const YTDLP_BIN = process.env.YTDLP_PATH || 'yt-dlp';
const SEARCH_TIMEOUT_MS = 18_000;
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
    if (isDirectAudioUrl(url))
        return 'direct';
    return 'youtube';
}
function mapEntryToTrack(entry, requestedBy, fallbackSource) {
    const url = entry.webpage_url || entry.original_url || (entry.url && isHttpUrl(entry.url) ? entry.url : undefined) || (entry.id ? `https://www.youtube.com/watch?v=${entry.id}` : undefined);
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
/**
 * Resolve tracks a partir de uma busca de texto ou link (YouTube, SoundCloud, Spotify, Link Direto)
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
        // 2. Link do Spotify -> busca título no YouTube
        if (isHttpUrl(trimmed) && trimmed.toLowerCase().includes('open.spotify.com')) {
            const titleQuery = await resolveSpotifyTitle(trimmed);
            if (!titleQuery)
                return [];
            return resolveTracks(titleQuery, requestedBy);
        }
        // 3. URL direta (YouTube vídeo/playlist, SoundCloud etc.)
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
        // 4. Busca por texto no YouTube
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
        // 5. Fallback automático para busca no SoundCloud
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
/**
 * Extração preguiçosa (lazy) do stream de áudio via yt-dlp + FFmpeg
 */
async function createAudioStream(track) {
    // 1. Áudio Direto via FFmpeg
    if (track.source === 'direct') {
        const ffmpeg = new prism_media_1.default.FFmpeg({
            args: [
                '-reconnect', '1',
                '-reconnect_streamed', '1',
                '-reconnect_delay_max', '5',
                '-i', track.url,
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
    // 2. YouTube / SoundCloud via yt-dlp -> pipe -> FFmpeg (PCM s16le 48kHz estéreo)
    const ytdlp = (0, child_process_1.spawn)(YTDLP_BIN, [
        '--js-runtimes', 'node',
        '--no-warnings',
        '--no-playlist',
        '-f', 'bestaudio/best',
        '-o', '-',
        track.url
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