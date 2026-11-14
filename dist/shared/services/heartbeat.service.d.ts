/**
 * Heartbeat do bot — escreve periodicamente em Redis para que o endpoint
 * /api/health (Next.js) saiba se o cliente Discord esta vivo.
 *
 * Funciona como fallback silencioso: se Redis nao estiver configurado,
 * o servico apenas nao publica nada — o /api/health continua devolvendo 200
 * para manter o container do Railway acordado.
 */
import type { Client } from 'discord.js';
export interface HeartbeatPayload {
    timestamp: number;
    uptime_seconds: number;
    discord_ready: boolean;
    guilds_count: number;
    ws_ping_ms: number;
}
declare class HeartbeatService {
    private timer;
    private startedAt;
    /** Inicia o loop de heartbeat. Idempotente. */
    start(client: Client): void;
    stop(): void;
    private tick;
}
export declare const heartbeatService: HeartbeatService;
export {};
//# sourceMappingURL=heartbeat.service.d.ts.map