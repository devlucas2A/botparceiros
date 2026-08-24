"use client";

import { useState, useEffect, useMemo } from "react";
import { 
    Activity, 
    RefreshCw, 
    ShieldAlert, 
    Bot, 
    Ticket, 
    UserPlus, 
    Phone, 
    Search, 
    SlidersHorizontal, 
    ExternalLink, 
    CheckCircle2, 
    Clock, 
    Cpu, 
    Wifi, 
    FileText, 
    ChevronDown, 
    ChevronUp, 
    AlertTriangle, 
    Flame,
    Zap,
    Radio
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

interface AuditLogItem {
    id: number;
    guild_id: string;
    user_id: string;
    action: string;
    target_id: string | null;
    details: Record<string, any>;
    created_at: string;
}

interface TicketTranscriptItem {
    id: string;
    guild_id: string;
    ticket_channel_id: string | null;
    ticket_name: string;
    user_id: string;
    closed_by_id: string;
    category: string;
    summary: string | null;
    message_count: number;
    created_at: string;
}

interface ActivityPayload {
    logs: AuditLogItem[];
    transcripts: TicketTranscriptItem[];
    botStatus: {
        status: string;
        pingMs: number;
        uptimeSeconds: number;
        memoryMb: number;
        nodeVersion: string;
    };
    stats: {
        todayAutomod: number;
        todayAI: number;
        todayTickets: number;
        todayMembers: number;
    };
}

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return "agora mesmo";
    if (diffSeconds < 3600) return `há ${Math.floor(diffSeconds / 60)} min`;
    if (diffSeconds < 86400) return `há ${Math.floor(diffSeconds / 3600)}h`;
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

type CategoryFilter = 'all' | 'automod' | 'ia' | 'tickets' | 'members' | 'calls';

export function ActivityClient({ guildId, locale }: { guildId: string; locale: string }) {
    const [data, setData] = useState<ActivityPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [category, setCategory] = useState<CategoryFilter>('all');
    const [search, setSearch] = useState('');
    const [expandedLogs, setExpandedLogs] = useState<Record<number, boolean>>({});

    const fetchData = async (isManual = false) => {
        if (isManual) setIsRefreshing(true);
        try {
            const res = await fetch(`/api/guild/${guildId}/activity`);
            if (!res.ok) throw new Error("Falha ao carregar");
            const json: ActivityPayload = await res.json();
            setData(json);
            if (isManual) toast.success("Atividades atualizadas em tempo real!");
        } catch {
            if (isManual) toast.error("Não foi possível atualizar as atividades.");
        } finally {
            setLoading(false);
            if (isManual) setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        if (!autoRefresh) return;
        const interval = setInterval(() => fetchData(false), 12000);
        return () => clearInterval(interval);
    }, [guildId, autoRefresh]);

    const toggleExpand = (id: number) => {
        setExpandedLogs(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Formatação de Ação e Metadados
    const getActionDetails = (action: string) => {
        const act = action.toUpperCase();
        if (act.includes('AUTOMOD') || act.includes('ANTIRAID')) {
            return {
                category: 'automod',
                label: 'AutoMod / Segurança',
                color: 'text-red-400 border-red-500/20 bg-red-500/10',
                icon: ShieldAlert
            };
        }
        if (act.includes('AI') || act.includes('COREBOT') || act.includes('IA')) {
            return {
                category: 'ia',
                label: 'CoreBot IA',
                color: 'text-purple-400 border-purple-500/20 bg-purple-500/10',
                icon: Bot
            };
        }
        if (act.includes('TICKET')) {
            return {
                category: 'tickets',
                label: 'Tickets',
                color: 'text-violet-400 border-violet-500/20 bg-violet-500/10',
                icon: Ticket
            };
        }
        if (act.includes('MEMBER') || act.includes('JOIN') || act.includes('LEAVE') || act.includes('WELCOME')) {
            return {
                category: 'members',
                label: 'Membros',
                color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
                icon: UserPlus
            };
        }
        if (act.includes('CALL') || act.includes('SESSAO')) {
            return {
                category: 'calls',
                label: 'Calls Privadas',
                color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10',
                icon: Phone
            };
        }
        return {
            category: 'other',
            label: 'Sistema',
            color: 'text-zinc-400 border-white/10 bg-white/5',
            icon: Activity
        };
    };

    // Filtragem
    const filteredLogs = useMemo(() => {
        if (!data?.logs) return [];
        return data.logs.filter(log => {
            const meta = getActionDetails(log.action);
            if (category !== 'all' && meta.category !== category) return false;

            if (search.trim()) {
                const query = search.toLowerCase();
                const userMatch = log.user_id?.toLowerCase().includes(query);
                const actionMatch = log.action?.toLowerCase().includes(query);
                const detailsMatch = JSON.stringify(log.details || {}).toLowerCase().includes(query);
                return userMatch || actionMatch || detailsMatch;
            }
            return true;
        });
    }, [data?.logs, category, search]);

    return (
        <div className="space-y-8 w-full max-w-6xl mx-auto font-sans pb-16 animate-in fade-in duration-500">
            {/* ════════════════════════════════════════════════════
                HERO & LIVE STATUS
               ════════════════════════════════════════════════════ */}
            <div className="bg-[#0A0A0C] border border-white/5 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                            <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                Monitor em Tempo Real
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            <Activity className="w-7 h-7 text-purple-400" />
                            Atividades & Logs do Bot
                        </h1>
                        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                            Acompanhe instantaneamente todas as ações de segurança, atendimento, IA e moderação executadas no servidor.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`rounded-xl text-xs border ${autoRefresh ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-black/40 border-white/10 text-zinc-400'} cursor-pointer`}
                        >
                            <Radio className={`w-3.5 h-3.5 mr-1.5 ${autoRefresh ? 'animate-pulse text-emerald-400' : ''}`} />
                            {autoRefresh ? "Auto-Atualizando" : "Pausado"}
                        </Button>

                        <Button
                            size="sm"
                            onClick={() => fetchData(true)}
                            disabled={isRefreshing}
                            className="rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 cursor-pointer"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Atualizar
                        </Button>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════
                KPI STATUS CARDS
               ════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Bot Status & Ping */}
                <div className="p-5 rounded-2xl bg-[#0D0D11] border border-white/5 shadow-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-400">Status do Bot</span>
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <Wifi className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-xl font-bold text-white flex items-center gap-2">
                            <span>Online</span>
                            <span className="text-xs font-normal text-zinc-500">({data?.botStatus?.pingMs || 24}ms)</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Uptime: {formatUptime(data?.botStatus?.uptimeSeconds || 3600)}</p>
                    </div>
                </div>

                {/* AutoMod Blocks */}
                <div className="p-5 rounded-2xl bg-[#0D0D11] border border-red-500/10 shadow-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-400">Bloqueios AutoMod Hoje</span>
                        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                            <ShieldAlert className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-bold text-white">
                            {data?.stats?.todayAutomod || 0}
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Spams, links e termos filtrados</p>
                    </div>
                </div>

                {/* AI Responses */}
                <div className="p-5 rounded-2xl bg-[#0D0D11] border border-purple-500/10 shadow-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-400">Respostas da IA Hoje</span>
                        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                            <Bot className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-bold text-white">
                            {data?.stats?.todayAI || 0}
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Dúvidas tiradas pelo CoreBot</p>
                    </div>
                </div>

                {/* Tickets Completed */}
                <div className="p-5 rounded-2xl bg-[#0D0D11] border border-violet-500/10 shadow-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-400">Tickets Finalizados Hoje</span>
                        <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
                            <Ticket className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-bold text-white">
                            {data?.stats?.todayTickets || data?.transcripts?.length || 0}
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Com transcrição visual salva</p>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════
                ACTIVITY FEED & FILTERS
               ════════════════════════════════════════════════════ */}
            <div className="bg-[#0D0D11] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                {/* Search & Category Tabs */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCategory('all')}
                            className={`rounded-xl text-xs px-3.5 h-9 font-semibold cursor-pointer ${category === 'all' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white bg-white/5'}`}
                        >
                            Todos os Logs
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCategory('automod')}
                            className={`rounded-xl text-xs px-3.5 h-9 font-semibold cursor-pointer ${category === 'automod' ? 'bg-red-500 text-white' : 'text-zinc-400 hover:text-white bg-white/5'}`}
                        >
                            <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                            AutoMod
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCategory('ia')}
                            className={`rounded-xl text-xs px-3.5 h-9 font-semibold cursor-pointer ${category === 'ia' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white bg-white/5'}`}
                        >
                            <Bot className="w-3.5 h-3.5 mr-1" />
                            CoreIA
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCategory('tickets')}
                            className={`rounded-xl text-xs px-3.5 h-9 font-semibold cursor-pointer ${category === 'tickets' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white bg-white/5'}`}
                        >
                            <Ticket className="w-3.5 h-3.5 mr-1" />
                            Tickets
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setCategory('calls')}
                            className={`rounded-xl text-xs px-3.5 h-9 font-semibold cursor-pointer ${category === 'calls' ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-white bg-white/5'}`}
                        >
                            <Phone className="w-3.5 h-3.5 mr-1" />
                            Calls
                        </Button>
                    </div>

                    <div className="relative w-full md:w-64">
                        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            placeholder="Buscar por ID, ação..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-black/50 border-white/10 text-white rounded-xl h-9 pl-9 text-xs focus:border-purple-500/40"
                        />
                    </div>
                </div>

                {/* Logs Stream List */}
                {loading ? (
                    <div className="space-y-3 py-10 text-center">
                        <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                        <p className="text-zinc-400 text-xs font-medium">Carregando feed de atividades...</p>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-16 px-4 rounded-2xl bg-black/30 border border-white/5 space-y-3">
                        <CheckCircle2 className="w-10 h-10 text-zinc-600 mx-auto" />
                        <h4 className="text-white font-semibold text-sm">Nenhuma atividade recente registrada</h4>
                        <p className="text-zinc-500 text-xs max-w-sm mx-auto">
                            Assim que o bot realizar bloqueios de AutoMod, atender membros, fechar tickets ou processar comandos, os eventos aparecerão aqui em tempo real.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredLogs.map((log) => {
                            const meta = getActionDetails(log.action);
                            const IconComponent = meta.icon;
                            const isExpanded = !!expandedLogs[log.id];
                            const hasTranscript = log.details?.transcript_id;

                            return (
                                <div
                                    key={log.id}
                                    className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-all space-y-3"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3.5 min-w-0">
                                            <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${meta.color}`}>
                                                <IconComponent className="w-4 h-4" />
                                            </div>

                                            <div className="space-y-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-bold text-white tracking-wide">
                                                        {log.action.replace(/_/g, ' ')}
                                                    </span>
                                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.color}`}>
                                                        {meta.label}
                                                    </span>
                                                </div>

                                                <p className="text-xs text-zinc-300 break-words leading-relaxed">
                                                    {log.details?.reason || log.details?.summary || (
                                                        log.action.includes('LINK') ? `Link bloqueado: ${log.details?.url || 'Não autorizado'}` :
                                                        log.action.includes('WORD') ? `Palavra proibida: "${log.details?.word || 'filtrada'}"` :
                                                        log.action.includes('TICKET_CLOSED') ? `Ticket encerrado (Categoria: ${log.details?.category || 'Geral'})` :
                                                        log.action.includes('TICKET_CREATED') ? `Novo ticket aberto pelo membro` :
                                                        `Ação registrada pelo bot`
                                                    )}
                                                </p>

                                                <div className="flex items-center gap-4 text-[11px] text-zinc-500 pt-1">
                                                    {log.user_id && (
                                                        <span>Usuário: <code className="bg-white/5 px-1.5 py-0.5 rounded text-zinc-300 font-mono text-[10px]">{log.user_id}</code></span>
                                                    )}
                                                    {log.target_id && (
                                                        <span>Alvo: <code className="bg-white/5 px-1.5 py-0.5 rounded text-zinc-300 font-mono text-[10px]">{log.target_id}</code></span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <span className="text-[11px] text-zinc-500 flex items-center gap-1 font-medium whitespace-nowrap">
                                                <Clock className="w-3 h-3 text-zinc-600" />
                                                {formatTimeAgo(log.created_at)}
                                            </span>

                                            <div className="flex items-center gap-2">
                                                {hasTranscript && (
                                                    <Link
                                                        href={`/${locale}/dashboard/${guildId}/tickets/transcripts/${log.details.transcript_id}`}
                                                        className="px-2.5 py-1 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600 hover:text-white transition-all text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <FileText className="w-3 h-3" />
                                                        Ver Transcrição
                                                    </Link>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => toggleExpand(log.id)}
                                                    className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs"
                                                    title="Ver dados técnicos"
                                                >
                                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detalhes Técnicos Expandíveis */}
                                    {isExpanded && (
                                        <div className="pt-3 border-t border-white/5 animate-in fade-in slide-in-from-top-1 duration-200">
                                            <div className="bg-black/60 p-3 rounded-xl border border-white/5 overflow-x-auto">
                                                <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap">
                                                    {JSON.stringify({
                                                        id: log.id,
                                                        action: log.action,
                                                        user_id: log.user_id,
                                                        target_id: log.target_id,
                                                        details: log.details,
                                                        created_at: log.created_at
                                                    }, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ════════════════════════════════════════════════════
                RECENT TICKET TRANSCRIPTS SECTION
               ════════════════════════════════════════════════════ */}
            {data?.transcripts && data.transcripts.length > 0 && (
                <div className="bg-[#0D0D11] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                    <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Transcrições Visuais de Tickets Recentes</h2>
                                <p className="text-xs text-zinc-400">Histórico completo de atendimentos encerrados com resumo gerado por IA.</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.transcripts.slice(0, 6).map((item) => (
                            <Link
                                key={item.id}
                                href={`/${locale}/dashboard/${guildId}/tickets/transcripts/${item.id}`}
                                className="group p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all flex items-center justify-between gap-4"
                            >
                                <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors">
                                            {item.ticket_name}
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-300 font-medium">
                                            {item.category}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-zinc-400 line-clamp-1">
                                        {item.summary || `${item.message_count} mensagens trocadas`}
                                    </p>
                                    <span className="text-[10px] text-zinc-500 block">
                                        {formatTimeAgo(item.created_at)}
                                    </span>
                                </div>

                                <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
