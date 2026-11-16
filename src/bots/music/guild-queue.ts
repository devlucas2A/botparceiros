import {
    AudioPlayer,
    AudioPlayerStatus,
    createAudioPlayer,
    entersState,
    joinVoiceChannel,
    NoSubscriberBehavior,
    VoiceConnection,
    VoiceConnectionStatus
} from '@discordjs/voice';
import { EmbedBuilder, TextBasedChannel, VoiceBasedChannel } from 'discord.js';
import { LoopMode, Track } from './types';
import { createAudioStream, prewarmTrack } from './extractor';
import { logger } from '../../shared/services';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos de fila vazia
const EMPTY_CHANNEL_TIMEOUT_MS = 60 * 1000; // 60 segundos com canal de voz vazio

export class GuildQueue {
    public readonly guildId: string;
    public voiceChannel: VoiceBasedChannel;
    public textChannel: TextBasedChannel;
    public connection: VoiceConnection | null = null;
    public readonly player: AudioPlayer;

    public tracks: Track[] = [];
    public currentTrack: Track | null = null;
    public loopMode: LoopMode = 'off';

    private isDestroyed = false;
    private isManualSkip = false;
    private idleTimer: NodeJS.Timeout | null = null;
    private emptyTimer: NodeJS.Timeout | null = null;
    private onDeleteCallback?: (guildId: string) => void;

    constructor(
        guildId: string,
        voiceChannel: VoiceBasedChannel,
        textChannel: TextBasedChannel,
        onDelete?: (guildId: string) => void
    ) {
        this.guildId = guildId;
        this.voiceChannel = voiceChannel;
        this.textChannel = textChannel;
        this.onDeleteCallback = onDelete;

        this.player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause
            }
        });

        this.setupPlayerListeners();
    }

    public get isPlaying(): boolean {
        return this.player.state.status === AudioPlayerStatus.Playing;
    }

    public get isPaused(): boolean {
        return this.player.state.status === AudioPlayerStatus.Paused;
    }

    public get playbackDuration(): number {
        if ('playbackDuration' in this.player.state) {
            return (this.player.state as { playbackDuration: number }).playbackDuration;
        }
        return 0;
    }

    private setupPlayerListeners(): void {
        this.player.on(AudioPlayerStatus.Idle, () => {
            this.handleTrackEnd().catch(err => {
                logger.error(`[GuildQueue] Erro ao avançar faixa na guild ${this.guildId}:`, { err });
            });
        });

        this.player.on('error', (error) => {
            logger.error(`[GuildQueue] Erro no player da guild ${this.guildId}:`, { error });
            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setDescription(`⚠️ Erro na reprodução: ${error.message}. Avançando para a próxima faixa...`);
            this.safeSend({ embeds: [embed] });
            this.playNext().catch(() => {});
        });
    }

    public safeSend(options: any): void {
        if ('send' in this.textChannel && typeof (this.textChannel as any).send === 'function') {
            (this.textChannel as any).send(options).catch(() => {});
        }
    }

    public connect(): VoiceConnection {
        if (!this.connection || this.connection.state.status === VoiceConnectionStatus.Destroyed) {
            this.connection = joinVoiceChannel({
                channelId: this.voiceChannel.id,
                guildId: this.guildId,
                adapterCreator: this.voiceChannel.guild.voiceAdapterCreator,
                selfDeaf: true
            });

            this.connection.subscribe(this.player);

            this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
                try {
                    await Promise.race([
                        entersState(this.connection!, VoiceConnectionStatus.Signalling, 5000),
                        entersState(this.connection!, VoiceConnectionStatus.Connecting, 5000)
                    ]);
                } catch {
                    this.destroy();
                }
            });

            this.connection.on(VoiceConnectionStatus.Destroyed, () => {
                this.destroy();
            });
        }

        return this.connection;
    }

    public enqueue(tracks: Track | Track[]): void {
        if (Array.isArray(tracks)) {
            this.tracks.push(...tracks);
        } else {
            this.tracks.push(tracks);
        }
        this.clearIdleTimer();
    }

    public async playNext(): Promise<boolean> {
        if (this.isDestroyed) return false;

        if (this.tracks.length === 0) {
            this.currentTrack = null;
            this.startIdleTimer();
            return false;
        }

        this.clearIdleTimer();
        const nextTrack = this.tracks.shift()!;
        this.currentTrack = nextTrack;

        try {
            const connection = this.connect();
            const waitReady =
                connection.state.status !== VoiceConnectionStatus.Ready
                    ? entersState(connection, VoiceConnectionStatus.Ready, 15_000)
                    : Promise.resolve(connection);

            const [, resource] = await Promise.all([waitReady, createAudioStream(nextTrack)]);
            this.player.play(resource);
            this.sendNowPlayingEmbed(nextTrack);

            // Pré-aquece a próxima faixa da fila para troca instantânea
            if (this.tracks.length > 0) {
                prewarmTrack(this.tracks[0]);
            }

            return true;
        } catch (error: unknown) {
            const err = error as Error;
            logger.error(`[GuildQueue] Falha ao extrair stream de "${nextTrack.title}":`, { error });
            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setDescription(`❌ Erro ao reproduzir **${nextTrack.title}**: ${err.message || 'Stream indisponível'}. Pulando...`);
            this.safeSend({ embeds: [embed] });
            return this.playNext();
        }
    }

    private async handleTrackEnd(): Promise<void> {
        if (this.isDestroyed) return;

        if (this.isManualSkip) {
            this.isManualSkip = false;
            if (this.loopMode === 'queue' && this.currentTrack) {
                this.tracks.push(this.currentTrack);
            }
        } else {
            if (this.loopMode === 'track' && this.currentTrack) {
                this.tracks.unshift(this.currentTrack);
            } else if (this.loopMode === 'queue' && this.currentTrack) {
                this.tracks.push(this.currentTrack);
            }
        }

        this.currentTrack = null;
        await this.playNext();
    }

    public skip(): boolean {
        if (!this.currentTrack && this.tracks.length === 0) {
            return false;
        }

        this.isManualSkip = true;
        this.player.stop();
        return true;
    }

    public stop(): void {
        this.tracks = [];
        this.currentTrack = null;
        this.player.stop(true);
        this.destroy();
    }

    public pause(): boolean {
        if (this.player.state.status === AudioPlayerStatus.Playing) {
            return this.player.pause();
        }
        return false;
    }

    public resume(): boolean {
        if (this.player.state.status === AudioPlayerStatus.Paused) {
            return this.player.unpause();
        }
        return false;
    }

    public setLoop(mode: LoopMode): LoopMode {
        this.loopMode = mode;
        return this.loopMode;
    }

    public checkEmptyChannel(): void {
        if (this.isDestroyed) return;

        const humanCount = this.voiceChannel.members.filter(m => !m.user.bot).size;

        if (humanCount === 0) {
            if (!this.emptyTimer) {
                logger.info(`[GuildQueue] Canal de voz vazio na guild ${this.guildId}. Iniciando timer de 60s.`);
                this.emptyTimer = setTimeout(() => {
                    const embed = new EmbedBuilder()
                        .setColor(0xFEE75C)
                        .setDescription('👋 Canal de voz vazio por 60 segundos. Desconectando para economizar recursos.');
                    this.safeSend({ embeds: [embed] });
                    this.destroy();
                }, EMPTY_CHANNEL_TIMEOUT_MS);
            }
        } else {
            this.clearEmptyTimer();
        }
    }

    public startIdleTimer(): void {
        if (this.idleTimer) return;

        logger.info(`[GuildQueue] Fila vazia na guild ${this.guildId}. Iniciando timer de 5 min.`);
        this.idleTimer = setTimeout(() => {
            const embed = new EmbedBuilder()
                .setColor(0xFEE75C)
                .setDescription('⏱️ Fila vazia por 5 minutos. Desconectando do canal de voz por inatividade.');
            this.safeSend({ embeds: [embed] });
            this.destroy();
        }, IDLE_TIMEOUT_MS);
    }

    public clearIdleTimer(): void {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
    }

    public clearEmptyTimer(): void {
        if (this.emptyTimer) {
            clearTimeout(this.emptyTimer);
            this.emptyTimer = null;
        }
    }

    private sendNowPlayingEmbed(track: Track): void {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎵 Tocando Agora')
            .setDescription(`[${track.title}](${track.url})`)
            .addFields(
                { name: '⏱️ Duração', value: track.duration, inline: true },
                { name: '👤 Autor/Canal', value: track.author || 'Desconhecido', inline: true },
                { name: '🎧 Pedido por', value: `${track.requestedBy}`, inline: true }
            );

        if (track.thumbnail) {
            embed.setThumbnail(track.thumbnail);
        }

        this.safeSend({ embeds: [embed] });
    }

    public destroy(): void {
        if (this.isDestroyed) return;
        this.isDestroyed = true;

        this.clearIdleTimer();
        this.clearEmptyTimer();
        this.tracks = [];
        this.currentTrack = null;

        try {
            this.player.stop(true);
        } catch {
            // Ignora se o player já estiver parado
        }

        if (this.connection) {
            try {
                this.connection.destroy();
            } catch {
                // Ignora se já destruído
            }
            this.connection = null;
        }

        if (this.onDeleteCallback) {
            this.onDeleteCallback(this.guildId);
        }
    }
}
