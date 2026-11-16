import { database } from "@shared/services/database";
import { getBotGuildStatus } from "@/lib/discord-api";
import {
    ShieldAlert,
    ShieldCheck,
    Ticket,
    ArrowRight,
    Settings,
    Activity,
    Sparkles,
    BarChart3,
    Zap,
    Clock,
} from "lucide-react";
import Link from "next/link";
import { ServerModulesGrid, ServerModuleItem } from "@/components/dashboard/ServerModulesGrid";

interface Props {
    params: Promise<{
        guildId: string;
        locale: string;
    }>;
}

function formatRelativeTime(date: string | Date): string {
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

function formatActionTitle(action: string): string {
    const map: Record<string, string> = {
        config_update: "Configurações Atualizadas",
        custom_command_create: "Novo Comando Slash Criado",
        custom_command_delete: "Comando Slash Removido",
        ticket_open: "Ticket de Atendimento Aberto",
        ticket_close: "Ticket Finalizado",
        server_generation: "Estrutura de Servidor Gerada com IA",
        bot_join: "Bot Ingressou no Servidor",
        bot_leave: "Bot Saiu do Servidor",
        AUTOMOD_LINK_BLOCKED: "Link Bloqueado pelo AutoMod",
        AUTOMOD_WORD_BLOCKED: "Palavra Proibida Bloqueada",
        AUTOMOD_SPAM_BLOCKED: "Tentativa de Spam Bloqueada",
        MEMBER_JOINED: "Novo Membro Ingressou",
        MEMBER_LEFT: "Membro Saiu do Servidor",
    };
    return map[action] || action.replace(/_/g, " ");
}

export default async function ServerOverviewPage({ params }: Props) {
    const { guildId, locale } = await params;

    // Buscar todos os dados relevantes do servidor em paralelo
    const [
        config, 
        ticketCategories, 
        privateCalls, 
        auditLogs,
        knowledgeBase,
        customCommands,
        botStatus
    ] = await Promise.all([
        database.getGuildConfig(guildId),
        database.getTicketCategories(guildId),
        database.getAllPrivateCalls(guildId),
        database.getAuditLogs(guildId, 4),
        database.getKnowledgeBase(guildId),
        database.getCustomCommands(guildId),
        getBotGuildStatus(guildId)
    ]);

    // Módulos do Sistema
    const isAiActive = config?.ia_enabled !== false;
    const isAutoModActive = (config?.prohibited_words?.length || 0) > 0 || 
        !!config?.automod_links_enabled || 
        !!config?.automod_caps_enabled || 
        !!config?.automod_spam_enabled || 
        !!config?.automod_ai_enabled;
    const isTicketsActive = !!config?.ticket_panel_title || ticketCategories.length > 0;
    const isWelcomeActive = !!config?.welcome_channel_id || !!config?.autorole_id;
    const isCallsActive = !!config?.private_calls_enabled;
    const isKnowledgeActive = knowledgeBase.length > 0;
    const isCommandsActive = customCommands.length > 0;

    const modules: ServerModuleItem[] = [
        {
            category: "ia",
            title: "CoreBot IA",
            subtitle: "Responde perguntas e conversa com os membros no chat.",
            iconName: "bot",
            href: `/${locale}/dashboard/${guildId}/corebot`,
            isActive: isAiActive,
            theme: {
                gradient: "from-purple-500/15 via-indigo-500/5 to-transparent",
                border: "border-purple-500/30 hover:border-purple-500/60",
                iconBg: "bg-purple-500/15 border-purple-500/30 text-purple-400 group-hover:bg-purple-500 group-hover:text-white",
                glow: "group-hover:shadow-purple-500/20",
                badgeActive: "bg-purple-500/15 text-purple-300 border-purple-500/30",
            },
            summary: config?.ia_channel_id ? "Canal definido" : "Todos os canais",
        },
        {
            category: "media",
            title: "Música",
            subtitle: "Toca músicas na call e organiza a fila com o prefixo core!.",
            iconName: "music",
            href: `/${locale}/dashboard/${guildId}/music`,
            isActive: true,
            theme: {
                gradient: "from-violet-500/15 via-fuchsia-500/5 to-transparent",
                border: "border-violet-500/30 hover:border-violet-500/60",
                iconBg: "bg-violet-500/15 border-violet-500/30 text-violet-400 group-hover:bg-violet-500 group-hover:text-white",
                glow: "group-hover:shadow-violet-500/20",
                badgeActive: "bg-violet-500/15 text-violet-300 border-violet-500/30",
            },
            summary: "Prefixo: core!",
        },
        {
            category: "sec",
            title: "AutoMod & Segurança",
            subtitle: "Bloqueia spam, links suspeitos e palavras proibidas.",
            iconName: isAutoModActive ? "shield-check" : "shield-alert",
            href: `/${locale}/dashboard/${guildId}/automod`,
            isActive: isAutoModActive,
            theme: {
                gradient: "from-rose-500/15 via-amber-500/5 to-transparent",
                border: "border-rose-500/30 hover:border-rose-500/60",
                iconBg: "bg-rose-500/15 border-rose-500/30 text-rose-400 group-hover:bg-rose-500 group-hover:text-white",
                glow: "group-hover:shadow-rose-500/20",
                badgeActive: "bg-rose-500/15 text-rose-300 border-rose-500/30",
            },
            summary: `${config?.prohibited_words?.length || 0} palavras bloqueadas`,
        },
        {
            category: "ops",
            title: "Tickets",
            subtitle: "Canais privados organizados para atender dúvidas.",
            iconName: "ticket",
            href: `/${locale}/dashboard/${guildId}/tickets`,
            isActive: isTicketsActive,
            theme: {
                gradient: "from-blue-500/15 via-indigo-500/5 to-transparent",
                border: "border-blue-500/30 hover:border-blue-500/60",
                iconBg: "bg-blue-500/15 border-blue-500/30 text-blue-400 group-hover:bg-blue-500 group-hover:text-white",
                glow: "group-hover:shadow-blue-500/20",
                badgeActive: "bg-blue-500/15 text-blue-300 border-blue-500/30",
            },
            summary: `${ticketCategories.length} categorias`,
        },
        {
            category: "ops",
            title: "Boas-vindas",
            subtitle: "Recebe novos membros com imagem e cargo automático.",
            iconName: "hand",
            href: `/${locale}/dashboard/${guildId}/welcome`,
            isActive: isWelcomeActive,
            theme: {
                gradient: "from-emerald-500/15 via-teal-500/5 to-transparent",
                border: "border-emerald-500/30 hover:border-emerald-500/60",
                iconBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white",
                glow: "group-hover:shadow-emerald-500/20",
                badgeActive: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
            },
            summary: config?.welcome_channel_id ? "Canal configurado" : "Não configurado",
        },
        {
            category: "media",
            title: "Calls Privadas",
            subtitle: "Salas de voz temporárias criadas quando alguém entra.",
            iconName: "phone",
            href: `/${locale}/dashboard/${guildId}/private-calls`,
            isActive: isCallsActive,
            theme: {
                gradient: "from-cyan-500/15 via-blue-500/5 to-transparent",
                border: "border-cyan-500/30 hover:border-cyan-500/60",
                iconBg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white",
                glow: "group-hover:shadow-cyan-500/20",
                badgeActive: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
            },
            summary: `${privateCalls.length} salas ativas`,
        },
        {
            category: "ia",
            title: "Respostas da IA",
            subtitle: "Ensine regras e respostas prontas para o bot usar.",
            iconName: "book",
            href: `/${locale}/dashboard/${guildId}/knowledge`,
            isActive: isKnowledgeActive,
            theme: {
                gradient: "from-fuchsia-500/15 via-pink-500/5 to-transparent",
                border: "border-fuchsia-500/30 hover:border-fuchsia-500/60",
                iconBg: "bg-fuchsia-500/15 border-fuchsia-500/30 text-fuchsia-400 group-hover:bg-fuchsia-500 group-hover:text-white",
                glow: "group-hover:shadow-fuchsia-500/20",
                badgeActive: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
            },
            summary: `${knowledgeBase.length} respostas salvas`,
        },
        {
            category: "ia",
            title: "Comandos Custom",
            subtitle: "Crie seus próprios comandos com / sem programar.",
            iconName: "terminal",
            href: `/${locale}/dashboard/${guildId}/commands`,
            isActive: isCommandsActive,
            theme: {
                gradient: "from-amber-500/15 via-orange-500/5 to-transparent",
                border: "border-amber-500/30 hover:border-amber-500/60",
                iconBg: "bg-amber-500/15 border-amber-500/30 text-amber-400 group-hover:bg-amber-500 group-hover:text-white",
                glow: "group-hover:shadow-amber-500/20",
                badgeActive: "bg-amber-500/15 text-amber-300 border-amber-500/30",
            },
            summary: `${customCommands.length} comandos`,
        }
    ];

    const totalActiveCount = modules.filter(m => m.isActive).length;
    const readinessPercentage = Math.round((totalActiveCount / modules.length) * 100);

    return (
        <div className="space-y-10 w-full max-w-7xl mx-auto pb-20 font-sans animate-in fade-in duration-500">

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 🌟 HERO HEADER COM STATUS DO BOT E AÇÕES RÁPIDAS            */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="relative overflow-hidden rounded-3xl bg-linear-to-b from-[#13111C] to-[#0A0A0E] border border-white/10 p-6 sm:p-10 shadow-2xl">
                {/* Efeitos de Luzes Ambientais */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="space-y-3 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2.5">
                            {botStatus.inGuild ? (
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>Bot Online</span>
                                </div>
                            ) : (
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                                    <span className="w-2 h-2 rounded-full bg-red-400" />
                                    <span>Bot fora do servidor</span>
                                </div>
                            )}

                            {botStatus.hasAdministrator && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
                                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                                    Admin OK
                                </span>
                            )}
                        </div>

                        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
                            Visão Geral do Servidor
                        </h1>
                        <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                            Gerencie a IA, música, segurança e atendimento do seu servidor em um só lugar.
                        </p>
                    </div>

                    {/* Botões de Ação Rápida no Topo */}
                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                        <Link
                            href={`/${locale}/dashboard/${guildId}/analytics`}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-bold transition-all border border-white/10 shadow-md cursor-pointer"
                        >
                            <BarChart3 className="w-4 h-4 text-purple-400" />
                            <span>Estatísticas</span>
                        </Link>
                        <Link
                            href={`/${locale}/dashboard/${guildId}/activity`}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-bold transition-all border border-white/10 shadow-md cursor-pointer"
                        >
                            <Activity className="w-4 h-4 text-indigo-400" />
                            <span>Atividades</span>
                        </Link>
                        <Link
                            href={`/${locale}/dashboard/${guildId}/settings`}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/20 cursor-pointer"
                        >
                            <Settings className="w-4 h-4" />
                            <span>Configurações</span>
                        </Link>
                    </div>
                </div>

                {/* Indicadores rápidos */}
                <div className="relative z-10 mt-8 pt-8 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                    <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                        <div className="flex items-center justify-between text-xs text-zinc-400">
                            <span>Módulos Ativos</span>
                            <span className="font-bold text-white font-mono">{totalActiveCount}/{modules.length}</span>
                        </div>
                        <div className="w-full bg-zinc-800/80 rounded-full h-2 overflow-hidden">
                            <div 
                                className="bg-gradient-to-r from-purple-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                                style={{ width: `${readinessPercentage}%` }}
                            />
                        </div>
                        <p className="text-[11px] text-zinc-500">{readinessPercentage}% configurado</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                        <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                            Proteção
                        </span>
                        <div className="text-lg font-bold text-white">
                            {isAutoModActive ? "Ativa" : "Básica"}
                        </div>
                        <p className="text-[11px] text-zinc-500">
                            {config?.prohibited_words?.length || 0} palavras bloqueadas
                        </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                        <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                            Respostas da IA
                        </span>
                        <div className="text-lg font-bold text-white">
                            {knowledgeBase.length} salvas
                        </div>
                        <p className="text-[11px] text-zinc-500">
                            {isAiActive ? "Respondendo no chat" : "Pausada no momento"}
                        </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                        <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                            <Ticket className="w-3.5 h-3.5 text-blue-400" />
                            Tickets
                        </span>
                        <div className="text-lg font-bold text-white">
                            {ticketCategories.length} Categorias
                        </div>
                        <p className="text-[11px] text-zinc-500">
                            {config?.ticket_panel_title ? "Painel pronto" : "Sem painel ainda"}
                        </p>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 🎛️ GRADE DE MÓDULOS REDESENHADA (CARDS PREMIUM BENTO)       */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <ServerModulesGrid modules={modules} />

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 📜 HISTÓRICO RECENTE & DICAS DE OTIMIZAÇÃO                    */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                
                {/* Logs Recentes de Atividade (2 Colunas) */}
                <div className="lg:col-span-2 p-6 sm:p-8 rounded-3xl bg-[#0C0B10] border border-white/10 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                                <Activity className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="font-bold text-base text-white">Atividades Recentes do Servidor</h3>
                                <p className="text-xs text-zinc-400">Últimos eventos executados pelo bot e moderadores</p>
                            </div>
                        </div>

                        <Link
                            href={`/${locale}/dashboard/${guildId}/activity`}
                            className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                        >
                            <span>Ver todas</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    {auditLogs && auditLogs.length > 0 ? (
                        <div className="space-y-3">
                            {auditLogs.map((log) => (
                                <div 
                                    key={log.id}
                                    className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-zinc-200 truncate">
                                                {formatActionTitle(log.action)}
                                            </p>
                                            <p className="text-[11px] text-zinc-500 truncate">
                                                Usuário: <span className="font-mono text-zinc-400">{log.user_id}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[11px] text-zinc-500 font-mono shrink-0 pl-2">
                                        {formatRelativeTime(log.created_at)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 border border-dashed border-white/10 rounded-2xl space-y-2">
                            <Clock className="w-8 h-8 text-zinc-600 mx-auto" />
                            <p className="text-xs text-zinc-400">Nenhuma atividade recente registrada ainda.</p>
                        </div>
                    )}
                </div>

                {/* Assistente & Recomendações Rápidas (1 Coluna) */}
                <div className="p-6 sm:p-8 rounded-3xl bg-linear-to-b from-[#151222] to-[#0D0B14] border border-purple-500/20 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                                <Zap className="w-4 h-4" />
                            </div>
                            <h3 className="font-bold text-base text-white">Dicas de Otimização</h3>
                        </div>

                        <div className="space-y-3 text-xs">
                            {!isAutoModActive && (
                                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1">
                                    <p className="font-bold text-rose-300">🛡️ Ativar AutoMod</p>
                                    <p className="text-zinc-400 text-[11px]">Proteja seu servidor contra links maliciosos e spam.</p>
                                </div>
                            )}

                            {knowledgeBase.length === 0 && (
                                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-1">
                                    <p className="font-bold text-purple-300">🧠 Adicionar FAQs na IA</p>
                                    <p className="text-zinc-400 text-[11px]">Ensine respostas padrão para seu público não ficar sem ajuda.</p>
                                </div>
                            )}

                            {!config?.welcome_channel_id && (
                                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                                    <p className="font-bold text-emerald-300">👋 Boas-vindas com Banner</p>
                                    <p className="text-zinc-400 text-[11px]">Configure uma mensagem de entrada e autorole automático.</p>
                                </div>
                            )}

                            {isAutoModActive && knowledgeBase.length > 0 && config?.welcome_channel_id && (
                                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                                    <p className="font-bold text-emerald-300">✨ Servidor Otimizado!</p>
                                    <p className="text-zinc-400 text-[11px]">Seus principais módulos de segurança e engajamento estão configurados.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <Link
                        href={`/${locale}/dashboard/${guildId}/settings`}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-all border border-white/10 cursor-pointer"
                    >
                        <span>Acessar Configurações Gerais</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>

            </div>

        </div>
    );
}
