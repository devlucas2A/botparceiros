"use strict";
/**
 * Heartbeat do bot — escreve periodicamente em Redis para que o endpoint
 * /api/health (Next.js) saiba se o cliente Discord esta vivo.
 *
 * Funciona como fallback silencioso: se Redis nao estiver configurado,
 * o servico apenas nao publica nada — o /api/health continua devolvendo 200
 * para manter o container do Railway acordado.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.heartbeatService = void 0;
const redis_service_1 = require("./redis.service");
const logger_service_1 = require("./logger.service");
const HEARTBEAT_KEY = 'bot:heartbeat';
const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_TTL_SECONDS = 90; // 3x o intervalo para tolerar atrasos
class HeartbeatService {
    timer = null;
    startedAt = Date.now();
    /** Inicia o loop de heartbeat. Idempotente. */
    start(client) {
        if (this.timer)
            return;
        this.startedAt = Date.now();
        this.tick(client); // publica imediatamente
        this.timer = setInterval(() => this.tick(client), HEARTBEAT_INTERVAL_MS);
        this.timer.unref?.(); // nao bloqueia o exit do processo
        logger_service_1.logger.info('💓 Heartbeat service iniciado (intervalo: 30s)');
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    async tick(client) {
        const redis = redis_service_1.redisService.getClient();
        if (!redis)
            return; // sem Redis nao ha onde publicar — silencioso
        const payload = {
            timestamp: Date.now(),
            uptime_seconds: Math.floor((Date.now() - this.startedAt) / 1000),
            discord_ready: client.isReady(),
            guilds_count: client.guilds?.cache?.size ?? 0,
            ws_ping_ms: Math.max(0, client.ws?.ping ?? 0),
        };
        try {
            await redis.set(HEARTBEAT_KEY, JSON.stringify(payload), 'EX', HEARTBEAT_TTL_SECONDS);
        }
        catch (err) {
            logger_service_1.logger.warn('Heartbeat: falha ao gravar em Redis', { error: err?.message });
        }
    }
}
exports.heartbeatService = new HeartbeatService();
//# sourceMappingURL=heartbeat.service.js.map