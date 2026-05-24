/**
 * Heartbeat do bot — escreve periodicamente em Redis para que o endpoint
 * /api/health (Next.js) saiba se o cliente Discord esta vivo.
 *
 * Funciona como fallback silencioso: se Redis nao estiver configurado,
 * o servico apenas nao publica nada — o /api/health continua devolvendo 200
 * para manter o container do Railway acordado.
 */

import type { Client } from 'discord.js';
import { redisService } from './redis.service';
import { logger } from './logger.service';

const HEARTBEAT_KEY = 'bot:heartbeat';
const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_TTL_SECONDS = 90; // 3x o intervalo para tolerar atrasos

export interface HeartbeatPayload {
    timestamp: number;
    uptime_seconds: number;
    discord_ready: boolean;
    guilds_count: number;
    ws_ping_ms: number;
}

class HeartbeatService {
    private timer: NodeJS.Timeout | null = null;
    private startedAt: number = Date.now();

    /** Inicia o loop de heartbeat. Idempotente. */
    start(client: Client): void {
        if (this.timer) return;
        this.startedAt = Date.now();
        this.tick(client); // publica imediatamente
        this.timer = setInterval(() => this.tick(client), HEARTBEAT_INTERVAL_MS);
        this.timer.unref?.(); // nao bloqueia o exit do processo
        logger.info('💓 Heartbeat service iniciado (intervalo: 30s)');
    }

    stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    private async tick(client: Client): Promise<void> {
        const redis = redisService.getClient();
        if (!redis) return; // sem Redis nao ha onde publicar — silencioso

        const payload: HeartbeatPayload = {
            timestamp: Date.now(),
            uptime_seconds: Math.floor((Date.now() - this.startedAt) / 1000),
            discord_ready: client.isReady(),
            guilds_count: client.guilds?.cache?.size ?? 0,
            ws_ping_ms: Math.max(0, client.ws?.ping ?? 0),
        };

        try {
            await redis.set(HEARTBEAT_KEY, JSON.stringify(payload), 'EX', HEARTBEAT_TTL_SECONDS);
        } catch (err: any) {
            logger.warn('Heartbeat: falha ao gravar em Redis', { error: err?.message });
        }
    }
}

export const heartbeatService = new HeartbeatService();
