/**
 * Lista cargos, canais e categorias de uma guild para alimentar
 * comboboxes nos formulários do painel.
 *
 * Autorizacao: o caller precisa ter MANAGE_GUILD na guild
 * (mesma checagem usada pelas server actions).
 *
 * Fonte: Discord REST API via BOT TOKEN — o token OAuth do usuario
 * nao retorna roles/channels detalhados, mas o bot ja esta na guild.
 *
 * Cache: 60s em Redis para evitar bater na Discord API a cada abertura
 * de formulario. Se Redis estiver offline, vai direto na Discord.
 */

import { NextResponse } from "next/server";
import { verifyUserGuildAccess } from "@/lib/discord-api";
import { redisService } from "@shared/services/redis.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CACHE_TTL_SECONDS = 60;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN || "";

// Discord channel types — https://discord.com/developers/docs/resources/channel#channel-object-channel-types
const CHANNEL_TYPE_NAMES: Record<number, string> = {
    0: "text",
    2: "voice",
    4: "category",
    5: "announcement",
    13: "stage",
    15: "forum",
};

interface DiscordRole {
    id: string;
    name: string;
    color: number;
    position: number;
    managed: boolean;
}

interface DiscordChannel {
    id: string;
    name: string;
    type: number;
    parent_id: string | null;
    position: number;
}

interface ResourcesPayload {
    roles: Array<{ id: string; name: string; color: number; managed: boolean }>;
    channels: Array<{ id: string; name: string; type: string; parent_id: string | null }>;
    categories: Array<{ id: string; name: string }>;
}

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ guildId: string }> }
) {
    const { guildId } = await params;

    if (!guildId || !/^\d{17,20}$/.test(guildId)) {
        return NextResponse.json({ error: "guildId invalido" }, { status: 400 });
    }

    const hasAccess = await verifyUserGuildAccess(guildId);
    if (!hasAccess) {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    if (!BOT_TOKEN) {
        return NextResponse.json({ error: "Token do bot nao configurado" }, { status: 500 });
    }

    // Cache hit
    const redis = redisService.getClient();
    const cacheKey = `guild:${guildId}:resources`;
    if (redis) {
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                return NextResponse.json(JSON.parse(cached) as ResourcesPayload);
            }
        } catch { /* cache miss silencioso */ }
    }

    // Busca em paralelo
    try {
        const [rolesRes, channelsRes] = await Promise.all([
            fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
                headers: { Authorization: `Bot ${BOT_TOKEN}` },
                cache: "no-store",
            }),
            fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
                headers: { Authorization: `Bot ${BOT_TOKEN}` },
                cache: "no-store",
            }),
        ]);

        if (rolesRes.status === 404 || channelsRes.status === 404) {
            return NextResponse.json(
                { error: "Bot nao esta no servidor", botMissing: true },
                { status: 404 }
            );
        }

        if (!rolesRes.ok || !channelsRes.ok) {
            console.error("[discord-resources] Falha na Discord API:", {
                roles: rolesRes.status,
                channels: channelsRes.status,
            });
            return NextResponse.json({ error: "Falha ao buscar dados do servidor" }, { status: 502 });
        }

        const rawRoles = (await rolesRes.json()) as DiscordRole[];
        const rawChannels = (await channelsRes.json()) as DiscordChannel[];

        // Filtra e normaliza
        const roles = rawRoles
            .filter(r => r.name !== "@everyone")
            .sort((a, b) => b.position - a.position) // mais alto primeiro
            .map(r => ({
                id: r.id,
                name: r.name,
                color: r.color,
                managed: r.managed,
            }));

        const categories = rawChannels
            .filter(c => c.type === 4)
            .sort((a, b) => a.position - b.position)
            .map(c => ({ id: c.id, name: c.name }));

        const channels = rawChannels
            .filter(c => c.type !== 4) // categorias ficam separadas
            .sort((a, b) => a.position - b.position)
            .map(c => ({
                id: c.id,
                name: c.name,
                type: CHANNEL_TYPE_NAMES[c.type] || "unknown",
                parent_id: c.parent_id || null,
            }));

        const payload: ResourcesPayload = { roles, channels, categories };

        if (redis) {
            try {
                await redis.set(cacheKey, JSON.stringify(payload), "EX", CACHE_TTL_SECONDS);
            } catch { /* nao bloqueia */ }
        }

        return NextResponse.json(payload);
    } catch (error: any) {
        console.error("[discord-resources] Erro:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
