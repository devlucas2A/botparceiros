"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.musicManager = exports.MusicManager = void 0;
const guild_queue_1 = require("./guild-queue");
const services_1 = require("../../shared/services");
class MusicManager {
    static instance;
    queues = new Map();
    constructor() { }
    static getInstance() {
        if (!MusicManager.instance) {
            MusicManager.instance = new MusicManager();
        }
        return MusicManager.instance;
    }
    getOrCreateQueue(guildId, voiceChannel, textChannel) {
        let queue = this.queues.get(guildId);
        if (!queue) {
            queue = new guild_queue_1.GuildQueue(guildId, voiceChannel, textChannel, (id) => this.deleteQueue(id));
            this.queues.set(guildId, queue);
            services_1.logger.info(`[MusicManager] Nova fila criada para a guild ${guildId}`);
        }
        else {
            // Atualiza canais se mudaram
            queue.voiceChannel = voiceChannel;
            queue.textChannel = textChannel;
        }
        return queue;
    }
    getQueue(guildId) {
        return this.queues.get(guildId);
    }
    deleteQueue(guildId) {
        const queue = this.queues.get(guildId);
        if (queue) {
            this.queues.delete(guildId);
            services_1.logger.info(`[MusicManager] Fila removida para a guild ${guildId}`);
        }
    }
    handleVoiceStateUpdate(oldState, newState) {
        const guildId = oldState.guild.id || newState.guild.id;
        const queue = this.queues.get(guildId);
        if (!queue)
            return;
        // Se o próprio bot foi desconectado ou outra instância assumiu a sessão
        const botId = newState.client.user?.id;
        if (botId && (oldState.id === botId || newState.id === botId)) {
            if (!newState.channelId) {
                services_1.logger.info(`[MusicManager] Bot desconectado do canal de voz na guild ${guildId}`);
                queue.destroy(false);
                return;
            }
            const myShardSessionId = newState.guild.shard?.sessionId;
            if (myShardSessionId && newState.sessionId && newState.sessionId !== myShardSessionId) {
                services_1.logger.info(`[MusicManager] Outra instância ativa assumiu a voz na guild ${guildId}. Liberando fila local sem desconectar.`);
                queue.destroy(false);
                return;
            }
            if (newState.channel) {
                queue.voiceChannel = newState.channel;
            }
        }
        // Se a mudança envolveu o canal onde o bot está tocando
        const botChannelId = queue.voiceChannel.id;
        if (oldState.channelId === botChannelId || newState.channelId === botChannelId) {
            queue.checkEmptyChannel();
        }
    }
}
exports.MusicManager = MusicManager;
exports.musicManager = MusicManager.getInstance();
//# sourceMappingURL=music.manager.js.map