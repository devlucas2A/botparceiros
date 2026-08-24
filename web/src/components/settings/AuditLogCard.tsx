"use client";

import { useState, useMemo } from "react";
import { ScrollText, Filter, ArrowRight, Activity } from "lucide-react";
import { SettingsCard } from "./SettingsCard";
import Link from "next/link";

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
    guildId?: string;
    locale?: string;
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
        AUTOMOD_LINK_BLOCKED: "Link Bloqueado (AutoMod)",
        AUTOMOD_WORD_BLOCKED: "Palavra Bloqueada (AutoMod)",
        AUTOMOD_SPAM_BLOCKED: "Spam Bloqueado (AutoMod)",
        MEMBER_JOINED: "Membro Entrou",
        MEMBER_LEFT: "Membro Saiu",
    };
    return map[action] || action.replace(/_/g, " ");
}

export function AuditLogCard({ logs, guildId, locale = "pt" }: Props) {
    const [filter, setFilter] = useState("");

    const actions = useMemo(() => {
        const set = new Set(logs.map(l => l.action));
        return Array.from(set).sort();
    }, [logs]);

    const filtered = filter ? logs.filter(l => l.action === filter) : logs;

    return (
        <SettingsCard
            title="Histórico de Auditoria Rápido"
            description="Últimas ações registradas pelo painel e pelos módulos do bot."
            icon={ScrollText}
            iconColor="text-amber-400"
            accent="amber"
        >
            {actions.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                    <Filter className="w-3.5 h-3.5 text-zinc-500 mr-1" />
                    <button
                        type="button"
                        onClick={() => setFilter("")}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                            !filter
                                ? "bg-amber-500/20 border-amber-500/40 text-amber-300 font-semibold"
                                : "border-white/5 bg-black/30 text-zinc-400 hover:text-white"
                        }`}
                    >
                        Todas
                    </button>
                    {actions.map(a => (
                        <button
                            key={a}
                            type="button"
                            onClick={() => setFilter(a)}
                            className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                                filter === a
                                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300 font-semibold"
                                    : "border-white/5 bg-black/30 text-zinc-400 hover:text-white"
                            }`}
                        >
                            {actionLabel(a)}
                        </button>
                    ))}
                </div>
            )}

            {filtered.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-500 bg-black/30 rounded-2xl border border-white/5">
                    Nenhum registro de auditoria disponível no momento.
                </div>
            ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {filtered.map(log => (
                        <div
                            key={log.id}
                            className="flex items-start gap-3 p-3.5 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors"
                        >
                            <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className="text-xs text-white font-semibold">
                                        {actionLabel(log.action)}
                                    </span>
                                    <span className="text-[10px] text-zinc-500 font-mono">
                                        {formatRelative(log.created_at)}
                                    </span>
                                </div>
                                <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-3">
                                    <span>por <code className="text-zinc-400 bg-white/5 px-1 py-0.5 rounded font-mono text-[10px]">{log.user_id}</code></span>
                                    {log.target_id && (
                                        <span>alvo: <code className="text-zinc-400 bg-white/5 px-1 py-0.5 rounded font-mono text-[10px]">{log.target_id}</code></span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {guildId && (
                <div className="pt-2 flex justify-end">
                    <Link
                        href={`/${locale}/dashboard/${guildId}/activity`}
                        className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium group transition-colors"
                    >
                        Abrir Feed de Atividades & Monitor em Tempo Real
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            )}
        </SettingsCard>
    );
}

