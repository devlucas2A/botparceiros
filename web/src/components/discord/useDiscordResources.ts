"use client";

import { useEffect, useState } from "react";

export interface DiscordRole {
    id: string;
    name: string;
    color: number;
    managed: boolean;
}

export interface DiscordChannel {
    id: string;
    name: string;
    type: string;
    parent_id: string | null;
}

export interface DiscordCategory {
    id: string;
    name: string;
}

export interface DiscordResources {
    roles: DiscordRole[];
    channels: DiscordChannel[];
    categories: DiscordCategory[];
}

interface State {
    data: DiscordResources | null;
    loading: boolean;
    error: string | null;
    botMissing: boolean;
}

// Cache em memoria por guildId — sobrevive a remontagem de componentes
// na mesma navegacao. Backend ja tem cache de 60s; este aqui evita
// chamadas duplicadas dentro de uma mesma tela.
const memoryCache = new Map<string, DiscordResources>();

// Deduplicacao: se varios componentes pedem o mesmo guildId ao mesmo
// tempo (caso comum: 3 selectors numa pagina), todos compartilham a
// mesma Promise em vez de gerar 3 requests paralelos que estouravam
// o rate limit do Discord (/users/@me/guilds).
const inflightCache = new Map<string, Promise<DiscordResources>>();

async function fetchResources(guildId: string, attempt = 0): Promise<DiscordResources> {
    const res = await fetch(`/api/guild/${guildId}/discord-resources`);
    if (res.ok) {
        const data = (await res.json()) as DiscordResources;
        memoryCache.set(guildId, data);
        return data;
    }

    // Retry 1x para 403/429/5xx — costuma ser rate-limit transitorio
    if (attempt < 1 && (res.status === 403 || res.status === 429 || res.status >= 500)) {
        await new Promise(r => setTimeout(r, 1200));
        return fetchResources(guildId, attempt + 1);
    }

    const body = await res.json().catch(() => ({}));
    const err: any = new Error(body?.error || `Erro ${res.status}`);
    err.status = res.status;
    err.botMissing = !!body?.botMissing;
    throw err;
}

export function useDiscordResources(guildId: string): State {
    const [state, setState] = useState<State>({
        data: memoryCache.get(guildId) || null,
        loading: !memoryCache.has(guildId),
        error: null,
        botMissing: false,
    });

    useEffect(() => {
        if (!guildId) return;
        if (memoryCache.has(guildId)) {
            setState({
                data: memoryCache.get(guildId)!,
                loading: false,
                error: null,
                botMissing: false,
            });
            return;
        }

        let cancelled = false;
        setState(s => ({ ...s, loading: true, error: null }));

        // Dedupe: reutiliza a Promise em andamento se houver
        let promise = inflightCache.get(guildId);
        if (!promise) {
            promise = fetchResources(guildId).finally(() => {
                inflightCache.delete(guildId);
            });
            inflightCache.set(guildId, promise);
        }

        promise
            .then(data => {
                if (cancelled) return;
                setState({ data, loading: false, error: null, botMissing: false });
            })
            .catch(err => {
                if (cancelled) return;
                setState({
                    data: null,
                    loading: false,
                    error: err?.message || "Falha ao carregar recursos",
                    botMissing: !!err?.botMissing,
                });
            });

        return () => {
            cancelled = true;
        };
    }, [guildId]);

    return state;
}
