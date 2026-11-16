"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuildQueue = void 0;
const voice_1 = require("@discordjs/voice");
const discord_js_1 = require("discord.js");
const extractor_1 = require("./extractor");
const services_1 = require("../../shared/services");
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos de fila vazia
const EMPTY_CHANNEL_TIMEOUT_MS = 60 * 1000; // 60 segundos com canal de voz vazio
class GuildQueue {
    guildId;
    voiceChannel;
    textChannel;
    connection = null;
    player;
    tracks = [];
    currentTrack = null;
    loopMode = 'off';
    isDestroyed = false;
    isManualSkip = false;
    idleTimer = null;
    emptyTimer = null;
    onDeleteCallback;
    constructor(guildId, voiceChannel, textChannel, onDelete) {
        this.guildId = guildId;
        this.voiceChannel = voiceChannel;
        this.textChannel = textChannel;
        this.onDeleteCallback = onDelete;
        this.player = (0, voice_1.createAudioPlayer)({
            behaviors: {
                noSubscriber: voice_1.NoSubscriberBehavior.Pause,
                maxMissedFrames: 250
            }
        });
        this.setupPlayerListeners();
    }
    get isPlaying() {
        return this.player.state.status === voice_1.AudioPlayerStatus.Playing;
    }
    get isPaused() {
        return this.player.state.status === voice_1.AudioPlayerStatus.Paused;
    }
    get playbackDuration() {
        if ('playbackDuration' in this.player.state) {
            return this.player.state.playbackDuration;
        }
        return 0;
    }
    setupPlayerListeners() {
        this.player.on('stateChange', (oldState, newState) => {
            services_1.logger.info(`[GuildQueue] Player (${this.guildId}): ${oldState.status} -> ${newState.status}`);
        });
        this.player.on(voice_1.AudioPlayerStatus.Idle, () => {
            this.handleTrackEnd().catch(err => {
                services_1.logger.error(`[GuildQueue] Erro ao avançar faixa na guild ${this.guildId}:`, { err });
            });
        });
        this.player.on('error', (error) => {
            services_1.logger.error(`[GuildQueue] Erro no player da guild ${this.guildId}:`, { error });
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(0xED4245)
                .setDescription(`⚠️ Erro na reprodução: ${error.message}. Avançando para a próxima faixa...`);
            this.safeSend({ embeds: [embed] });
            this.playNext().catch(() => { });
        });
    }
    safeSend(options) {
        if ('send' in this.textChannel && typeof this.textChannel.send === 'function') {
            this.textChannel.send(options).catch(() => { });
        }
    }
    connect() {
        if (!this.connection || this.connection.state.status === voice_1.VoiceConnectionStatus.Destroyed) {
            this.connection = (0, voice_1.joinVoiceChannel)({
                channelId: this.voiceChannel.id,
                guildId: this.guildId,
                adapterCreator: this.voiceChannel.guild.voiceAdapterCreator,
                selfDeaf: true
            });
            this.connection.subscribe(this.player);
            this.connection.on('stateChange', (oldState, newState) => {
                services_1.logger.info(`[GuildQueue] Voice (${this.guildId}): ${oldState.status} -> ${newState.status}`);
            });
            this.connection.on('error', (error) => {
                services_1.logger.error(`[GuildQueue] Erro na conexão de voz da guild ${this.guildId}:`, { error });
            });
            this.connection.on(voice_1.VoiceConnectionStatus.Disconnected, async () => {
                try {
                    await Promise.race([
                        (0, voice_1.entersState)(this.connection, voice_1.VoiceConnectionStatus.Signalling, 5000),
                        (0, voice_1.entersState)(this.connection, voice_1.VoiceConnectionStatus.Connecting, 5000)
                    ]);
                }
                catch {
                    this.destroy();
                }
            });
            this.connection.on(voice_1.VoiceConnectionStatus.Destroyed, () => {
                this.destroy();
            });
        }
        return this.connection;
    }
    enqueue(tracks) {
        if (Array.isArray(tracks)) {
            this.tracks.push(...tracks);
        }
        else {
            this.tracks.push(tracks);
        }
        this.clearIdleTimer();
    }
    async playNext() {
        if (this.isDestroyed)
            return false;
        if (this.tracks.length === 0) {
            this.currentTrack = null;
            this.startIdleTimer();
            return false;
        }
        this.clearIdleTimer();
        const nextTrack = this.tracks.shift();
        this.currentTrack = nextTrack;
        try {
            const connection = this.connect();
            const waitReady = connection.state.status !== voice_1.VoiceConnectionStatus.Ready
                ? (0, voice_1.entersState)(connection, voice_1.VoiceConnectionStatus.Ready, 15_000)
                : Promise.resolve(connection);
            const [, resource] = await Promise.all([waitReady, (0, extractor_1.createAudioStream)(nextTrack)]);
            connection.subscribe(this.player);
            this.player.play(resource);
            this.sendNowPlayingEmbed(nextTrack);
            // Pré-aquece a próxima faixa da fila para troca instantânea
            if (this.tracks.length > 0) {
                (0, extractor_1.prewarmTrack)(this.tracks[0]);
            }
            return true;
        }
        catch (error) {
            const err = error;
            services_1.logger.error(`[GuildQueue] Falha ao extrair stream de "${nextTrack.title}":`, { error });
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(0xED4245)
                .setDescription(`❌ Erro ao reproduzir **${nextTrack.title}**: ${err.message || 'Stream indisponível'}. Pulando...`);
            this.safeSend({ embeds: [embed] });
            return this.playNext();
        }
    }
    async handleTrackEnd() {
        if (this.isDestroyed)
            return;
        if (this.isManualSkip) {
            this.isManualSkip = false;
            if (this.loopMode === 'queue' && this.currentTrack) {
                this.tracks.push(this.currentTrack);
            }
        }
        else {
            if (this.loopMode === 'track' && this.currentTrack) {
                this.tracks.unshift(this.currentTrack);
            }
            else if (this.loopMode === 'queue' && this.currentTrack) {
                this.tracks.push(this.currentTrack);
            }
        }
        this.currentTrack = null;
        await this.playNext();
    }
    skip() {
        if (!this.currentTrack && this.tracks.length === 0) {
            return false;
        }
        this.isManualSkip = true;
        this.player.stop();
        return true;
    }
    stop() {
        this.tracks = [];
        this.currentTrack = null;
        this.player.stop(true);
        this.destroy();
    }
    pause() {
        if (this.player.state.status === voice_1.AudioPlayerStatus.Playing) {
            return this.player.pause();
        }
        return false;
    }
    resume() {
        if (this.player.state.status === voice_1.AudioPlayerStatus.Paused) {
            return this.player.unpause();
        }
        return false;
    }
    setLoop(mode) {
        this.loopMode = mode;
        return this.loopMode;
    }
    checkEmptyChannel() {
        if (this.isDestroyed)
            return;
        const humanCount = this.voiceChannel.members.filter(m => !m.user.bot).size;
        if (humanCount === 0) {
            if (!this.emptyTimer) {
                services_1.logger.info(`[GuildQueue] Canal de voz vazio na guild ${this.guildId}. Iniciando timer de 60s.`);
                this.emptyTimer = setTimeout(() => {
                    const embed = new discord_js_1.EmbedBuilder()
                        .setColor(0xFEE75C)
                        .setDescription('👋 Canal de voz vazio por 60 segundos. Desconectando para economizar recursos.');
                    this.safeSend({ embeds: [embed] });
                    this.destroy();
                }, EMPTY_CHANNEL_TIMEOUT_MS);
            }
        }
        else {
            this.clearEmptyTimer();
        }
    }
    startIdleTimer() {
        if (this.idleTimer)
            return;
        services_1.logger.info(`[GuildQueue] Fila vazia na guild ${this.guildId}. Iniciando timer de 5 min.`);
        this.idleTimer = setTimeout(() => {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(0xFEE75C)
                .setDescription('⏱️ Fila vazia por 5 minutos. Desconectando do canal de voz por inatividade.');
            this.safeSend({ embeds: [embed] });
            this.destroy();
        }, IDLE_TIMEOUT_MS);
    }
    clearIdleTimer() {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
    }
    clearEmptyTimer() {
        if (this.emptyTimer) {
            clearTimeout(this.emptyTimer);
            this.emptyTimer = null;
        }
    }
    sendNowPlayingEmbed(track) {
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎵 Tocando Agora')
            .setDescription(`[${track.title}](${track.url})`)
            .addFields({ name: '⏱️ Duração', value: track.duration, inline: true }, { name: '👤 Autor/Canal', value: track.author || 'Desconhecido', inline: true }, { name: '🎧 Pedido por', value: `${track.requestedBy}`, inline: true });
        if (track.thumbnail) {
            embed.setThumbnail(track.thumbnail);
        }
        this.safeSend({ embeds: [embed] });
    }
    destroy() {
        if (this.isDestroyed)
            return;
        this.isDestroyed = true;
        this.clearIdleTimer();
        this.clearEmptyTimer();
        this.tracks = [];
        this.currentTrack = null;
        try {
            this.player.stop(true);
        }
        catch {
            // Ignora se o player já estiver parado
        }
        if (this.connection) {
            try {
                this.connection.destroy();
            }
            catch {
                // Ignora se já destruído
            }
            this.connection = null;
        }
        if (this.onDeleteCallback) {
            this.onDeleteCallback(this.guildId);
        }
    }
}
exports.GuildQueue = GuildQueue;
//# sourceMappingURL=guild-queue.js.map