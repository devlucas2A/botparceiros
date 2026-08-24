"use client";

import { Activity, AlertTriangle, CheckCircle, RefreshCw, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "./SettingsCard";
import { BotGuildStatus } from "@/lib/discord-api";

interface Props {
    botStatus: BotGuildStatus;
    guildId: string;
}

interface HealthPayload {
    bot: {
        status: "ok" | "stale" | "down" | "unknown";
        last_heartbeat_age_ms?: number;
        details?: {
            discord_ready: boolean;
            guilds_count: number;
            ws_ping_ms: number;
            uptime_seconds: number;
        };
        note?: string;
    };
}

const STATUS_BADGE: Record<HealthPayload["bot"]["status"], { color: string; label: string }> = {
    ok: { color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", label: "Online" },
    stale: { color: "bg-amber-500/15 text-amber-300 border-amber-500/30", label: "Lento" },
    down: { color: "bg-red-500/15 text-red-300 border-red-500/30", label: "Offline" },
    unknown: { color: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30", label: "Desconhecido" },
};

function formatUptime(seconds: number): string {
    if (!seconds) return "—";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

export function BotHealthCard({ botStatus, guildId }: Props) {
    const [health, setHealth] = useState<HealthPayload | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    async function loadHealth() {
        setRefreshing(true);
        try {
            const res = await fetch("/api/health", { cache: "no-store" });
            if (res.ok) setHealth(await res.json());
        } catch { /* silencioso */ }
        setRefreshing(false);
    }

    useEffect(() => { loadHealth(); }, []);

    const status = health?.bot.status || "unknown";
    const badge = STATUS_BADGE[status];
    const details = health?.bot.details;

    const inviteUrl = botStatus.botUserId
        ? `https://discord.com/oauth2/authorize?client_id=${botStatus.botUserId}&permissions=8&scope=bot+applications.commands&guild_id=${guildId}`
        : null;

    return (
        <SettingsCard
            title="Status do Bot"
            description="Conectividade e permissões necessárias para o bot operar."
            icon={Activity}
            iconColor="text-emerald-400"
            accent="emerald"
        >
            {/* Status do processo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
                <div className="bg-black/40 border border-white/5 rounded-2xl p-5 col-span-1 md:col-span-2 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Processo</span>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${badge.color}`}>
                            {badge.label}
                        </span>
                    </div>
                    <div className="text-sm font-medium text-zinc-200">
                        {status === "ok" && details ? (
                            <>Discord Conectado • {details.guilds_count} Servidores • Ping {details.ws_ping_ms}ms</>
                        ) : status === "down" ? (
                            "Processo do bot não está respondendo."
                        ) : status === "stale" ? (
                            `Último heartbeat há ${Math.round((health?.bot.last_heartbeat_age_ms || 0) / 1000)}s — pode estar travado.`
                        ) : (
                            health?.bot.note || "Sem informação."
                        )}
                    </div>
                </div>

                <div className="bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                    <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2">Uptime</div>
                    <div className="text-xl font-mono font-bold text-white">
                        {details ? formatUptime(details.uptime_seconds) : "—"}
                    </div>
                </div>

                <div className="bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
                    <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2">No servidor?</div>
                    <div className="text-lg font-bold">
                        {botStatus.inGuild ? (
                            <span className="text-emerald-400 flex items-center gap-2"><CheckCircle className="w-5 h-5" /> Sim</span>
                        ) : (
                            <span className="text-red-400 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Não</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Permissões faltando */}
            {botStatus.inGuild && !botStatus.hasAdministrator && botStatus.missingPermissions.length > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-2">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-amber-200 mb-1">
                                Permissões faltando ({botStatus.missingPermissions.length})
                            </h3>
                            <p className="text-xs text-amber-300/70 mb-3">
                                O bot está no servidor, mas algumas funcionalidades podem falhar sem essas permissões:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {botStatus.missingPermissions.map(p => (
                                    <span key={p} className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-200">
                                        {p}
                                    </span>
                                ))}
                            </div>
                            {inviteUrl && (
                                <a
                                    href={inviteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 mt-3 text-xs text-amber-300 hover:text-amber-200 underline underline-offset-2"
                                >
                                    Reautorizar com permissões corretas <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Bot fora da guild */}
            {!botStatus.inGuild && inviteUrl && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-red-200 mb-1">Bot não está no servidor</h3>
                            <p className="text-xs text-red-300/70 mb-3">
                                Adicione o bot novamente para usar todas as funcionalidades.
                            </p>
                            <a
                                href={inviteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-red-300 hover:text-red-200 underline underline-offset-2"
                            >
                                Adicionar bot <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-end">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadHealth}
                    disabled={refreshing}
                    className="text-xs text-zinc-400 hover:text-white"
                >
                    <RefreshCw className={`w-3 h-3 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
                    Atualizar
                </Button>
            </div>
        </SettingsCard>
    );
}
