"use client";

import { useState, useMemo } from "react";
import { ScrollText, Filter } from "lucide-react";
import { SettingsCard } from "./SettingsCard";

interface AuditLog {
    id: number;
    guild_id: string;
    user_id: string;
    action: string;
    target_id: string | null;
    details: Record<string, unknown>;
    created_at: string | Date;
}

interface Props {
    logs: AuditLog[];
}

function formatRelative(date: string | Date): string {
    const d = typeof date === "string" ? new Date(date) : date;
    const diff = Date.now() - d.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "agora";
    if (min < 60) return `${min}m atrás`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h atrás`;
    const days = Math.floor(h / 24);
    if (days < 30) return `${days}d atrás`;
    return d.toLocaleDateString();
}

function actionLabel(action: string): string {
    const map: Record<string, string> = {
        config_update: "Atualizou configuração",
        custom_command_create: "Criou comando",
        custom_command_delete: "Removeu comando",
        ticket_open: "Abriu ticket",
        ticket_close: "Fechou ticket",
        server_generation: "Gerou servidor",
        bot_join: "Bot entrou no servidor",
        bot_leave: "Bot saiu do servidor",
    };
    return map[action] || action;
}

export function AuditLogCard({ logs }: Props) {
    const [filter, setFilter] = useState("");

    const actions = useMemo(() => {
        const set = new Set(logs.map(l => l.action));
        return Array.from(set).sort();
    }, [logs]);

    const filtered = filter ? logs.filter(l => l.action === filter) : logs;

    return (
        <SettingsCard
            title="Histórico de Auditoria"
            description="Últimas 25 ações registradas no painel."
            icon={ScrollText}
            iconColor="text-amber-400"
            accent="amber"
        >
            {actions.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <Filter className="w-3.5 h-3.5 text-zinc-500" />
                    <button
                        type="button"
                        onClick={() => setFilter("")}
                        className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                            !filter
                                ? "bg-amber-500/15 border-amber-500/30 text-amber-200"
                                : "border-white/10 text-zinc-400 hover:text-white"
                        }`}
                    >
                        Todas
                    </button>
                    {actions.map(a => (
                        <button
                            key={a}
                            type="button"
                            onClick={() => setFilter(a)}
                            className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                                filter === a
                                    ? "bg-amber-500/15 border-amber-500/30 text-amber-200"
                                    : "border-white/10 text-zinc-400 hover:text-white"
                            }`}
                        >
                            {actionLabel(a)}
                        </button>
                    ))}
                </div>
            )}

            {filtered.length === 0 ? (
                <div className="text-center py-8 text-sm text-zinc-500">
                    Nenhum registro de auditoria.
                </div>
            ) : (
                <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                    {filtered.map(log => (
                        <div
                            key={log.id}
                            className="flex items-start gap-3 p-3 rounded-lg bg-[#13111C] border border-white/5 hover:border-white/10 transition-colors"
                        >
                            <div className="w-1 h-1 rounded-full bg-amber-400 mt-2 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className="text-sm text-white font-medium">
                                        {actionLabel(log.action)}
                                    </span>
                                    <span className="text-[10px] text-zinc-500 font-mono">
                                        {formatRelative(log.created_at)}
                                    </span>
                                </div>
                                <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-3">
                                    <span>por <span className="text-zinc-400 font-mono">{log.user_id}</span></span>
                                    {log.target_id && (
                                        <span>alvo: <span className="text-zinc-400 font-mono">{log.target_id}</span></span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </SettingsCard>
    );
}
