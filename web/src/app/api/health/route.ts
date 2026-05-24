/**
 * Endpoint de healthcheck.
 *
 * Objetivos:
 * 1. Manter o container Railway acordado quando um uptime monitor pinga
 *    (UptimeRobot, BetterStack etc). Sempre devolve 200 OK por padrao.
 * 2. Reportar o estado do processo do bot (escrito em Redis pelo
 *    heartbeatService) para diagnostico externo.
 *
 * O endpoint NUNCA derruba o monitor por falha do bot — devolve 200
 * com payload indicando o problema, para nao causar restart loops
 * indesejados na plataforma. Use o campo `bot.status` para alertar.
 */

import { NextResponse } from "next/server";
import { redisService } from "@shared/services/redis.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const HEARTBEAT_KEY = "bot:heartbeat";
// Considera o bot "stale" se o ultimo heartbeat foi ha mais de 75s
// (heartbeat publica a cada 30s, com TTL de 90s).
const STALE_THRESHOLD_MS = 75_000;

interface HeartbeatPayload {
    timestamp: number;
    uptime_seconds: number;
    discord_ready: boolean;
    guilds_count: number;
    ws_ping_ms: number;
}

export async function GET() {
    const startedAt = Date.now();
    const webUptime = Math.floor(process.uptime());

    let bot: {
        status: "ok" | "stale" | "down" | "unknown";
        last_heartbeat_age_ms?: number;
        details?: HeartbeatPayload;
        note?: string;
    } = { status: "unknown", note: "Redis nao configurado." };

    const redis = redisService.getClient();
    if (redis) {
        try {
            const raw = await redis.get(HEARTBEAT_KEY);
            if (!raw) {
                bot = { status: "down", note: "Sem heartbeat no Redis (bot offline ou recem-iniciado)." };
            } else {
                const payload = JSON.parse(raw) as HeartbeatPayload;
                const age = Date.now() - payload.timestamp;
                const status: "ok" | "stale" = age > STALE_THRESHOLD_MS ? "stale" : "ok";
                bot = {
                    status,
                    last_heartbeat_age_ms: age,
                    details: payload,
                };
            }
        } catch (err: any) {
            bot = { status: "unknown", note: `Falha ao consultar Redis: ${err?.message}` };
        }
    }

    return NextResponse.json(
        {
            status: "ok",
            service: "coreia-web",
            web_uptime_seconds: webUptime,
            response_time_ms: Date.now() - startedAt,
            bot,
            timestamp: Date.now(),
        },
        { status: 200 }
    );
}

// HEAD para uptime monitors que pingam sem precisar do body.
export async function HEAD() {
    return new Response(null, { status: 200 });
}
