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

        fetch(`/api/guild/${guildId}/discord-resources`)
            .then(async res => {
                if (cancelled) return;
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    setState({
                        data: null,
                        loading: false,
                        error: body?.error || `Erro ${res.status}`,
                        botMissing: !!body?.botMissing,
                    });
                    return;
                }
                const data = (await res.json()) as DiscordResources;
                memoryCache.set(guildId, data);
                setState({ data, loading: false, error: null, botMissing: false });
            })
            .catch(err => {
                if (cancelled) return;
                setState({
                    data: null,
                    loading: false,
                    error: err?.message || "Falha ao carregar recursos",
                    botMissing: false,
                });
            });

        return () => {
            cancelled = true;
        };
    }, [guildId]);

    return state;
}
