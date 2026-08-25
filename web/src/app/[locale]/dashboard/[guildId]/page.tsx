import { database } from "@shared/services/database";
import { getBotGuildStatus } from "@/lib/discord-api";
import { 
    Bot, 
    ShieldAlert, 
    ShieldCheck, 
    Ticket, 
    Hand, 
    Phone, 
    ArrowRight, 
    Settings, 
    Activity, 
    Sparkles, 
    BookOpen, 
    Terminal, 
    CheckCircle2, 
    AlertTriangle, 
    BarChart3, 
    Layers, 
    Zap, 
    Clock, 
    ExternalLink,
    ChevronRight,
    MessageSquare,
    Users,
    Sliders,
    Radio
} from "lucide-react";
import Link from "next/link";

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

    const modules = [
        {
            title: "CoreBot IA",
            subtitle: "Assistente inteligente com RAG e respostas contextuais",
            icon: Bot,
            href: `/${locale}/dashboard/${guildId}/corebot`,
            isActive: isAiActive,
            theme: {
                gradient: "from-purple-500/15 via-indigo-500/5 to-transparent",
                border: "border-purple-500/30 hover:border-purple-500/60",
                iconBg: "bg-purple-500/15 border-purple-500/30 text-purple-400 group-hover:bg-purple-500 group-hover:text-white",
                glow: "group-hover:shadow-purple-500/20",
                badgeActive: "bg-purple-500/15 text-purple-300 border-purple-500/30",
            },
            badges: [
                { label: "Canal IA", value: config?.ia_channel_id ? `<#${config.ia_channel_id}>` : "Todos os canais permitidos" },
                { label: "Temperatura", value: `${config?.ia_temperature || 0.7}` },
                { label: "FAQs RAG", value: `${knowledgeBase.length} tópicos` }
            ]
        },
        {
            title: "AutoMod & Segurança",
            subtitle: "Proteção contra spam, raids, palavras impróprias e links",
            icon: isAutoModActive ? ShieldCheck : ShieldAlert,
            href: `/${locale}/dashboard/${guildId}/automod`,
            isActive: isAutoModActive,
            theme: {
                gradient: "from-rose-500/15 via-amber-500/5 to-transparent",
                border: "border-rose-500/30 hover:border-rose-500/60",
                iconBg: "bg-rose-500/15 border-rose-500/30 text-rose-400 group-hover:bg-rose-500 group-hover:text-white",
                glow: "group-hover:shadow-rose-500/20",
                badgeActive: "bg-rose-500/15 text-rose-300 border-rose-500/30",
            },
            badges: [
                { label: "Palavras Bloqueadas", value: `${config?.prohibited_words?.length || 0}` },
                { label: "Ação Padrão", value: config?.automod_action?.toUpperCase() || "DELETE" },
                { label: "Filtro de Links", value: config?.automod_links_enabled ? "Ativo" : "Desativado" }
            ]
        },
        {
            title: "Tickets & Suporte",
            subtitle: "Painel de atendimento, triagem automática e transcrições",
            icon: Ticket,
            href: `/${locale}/dashboard/${guildId}/tickets`,
            isActive: isTicketsActive,
            theme: {
                gradient: "from-blue-500/15 via-indigo-500/5 to-transparent",
                border: "border-blue-500/30 hover:border-blue-500/60",
                iconBg: "bg-blue-500/15 border-blue-500/30 text-blue-400 group-hover:bg-blue-500 group-hover:text-white",
                glow: "group-hover:shadow-blue-500/20",
                badgeActive: "bg-blue-500/15 text-blue-300 border-blue-500/30",
            },
            badges: [
                { label: "Categorias", value: `${ticketCategories.length} configuradas` },
                { label: "Painel", value: config?.ticket_panel_title ? "Personalizado" : "Padrão" },
                { label: "Canal de Logs", value: config?.ticket_logs_channel_id ? `<#${config.ticket_logs_channel_id}>` : "Não definido" }
            ]
        },
        {
            title: "Boas-vindas & Entrada",
            subtitle: "Recepção com banner gerado por IA, canal e autorole",
            icon: Hand,
            href: `/${locale}/dashboard/${guildId}/welcome`,
            isActive: isWelcomeActive,
            theme: {
                gradient: "from-emerald-500/15 via-teal-500/5 to-transparent",
                border: "border-emerald-500/30 hover:border-emerald-500/60",
                iconBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white",
                glow: "group-hover:shadow-emerald-500/20",
                badgeActive: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
            },
            badges: [
                { label: "Canal de Entrada", value: config?.welcome_channel_id ? `<#${config.welcome_channel_id}>` : "Não definido" },
                { label: "Autorole Automático", value: config?.autorole_id ? "Ativo" : "Não configurado" },
                { label: "Canal de Saída", value: config?.leave_channel_id ? `<#${config.leave_channel_id}>` : "Desativado" }
            ]
        },
        {
            title: "Calls Privadas",
            subtitle: "Salas de voz temporárias criadas sob demanda pelos membros",
            icon: Phone,
            href: `/${locale}/dashboard/${guildId}/private-calls`,
            isActive: isCallsActive,
            theme: {
                gradient: "from-cyan-500/15 via-blue-500/5 to-transparent",
                border: "border-cyan-500/30 hover:border-cyan-500/60",
                iconBg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white",
                glow: "group-hover:shadow-cyan-500/20",
                badgeActive: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
            },
            badges: [
                { label: "Categoria Raiz", value: config?.private_calls_category_id ? "Definida" : "Pendente" },
                { label: "Salas Ativas", value: `${privateCalls.length} canais criados` },
                { label: "Moderação de Call", value: config?.private_calls_manager_role ? "Com Cargo" : "Dono da Sala" }
            ]
        },
        {
            title: "Base de Conhecimento",
            subtitle: "Ensine a IA com perguntas e respostas customizadas",
            icon: BookOpen,
            href: `/${locale}/dashboard/${guildId}/knowledge`,
            isActive: isKnowledgeActive,
            theme: {
                gradient: "from-fuchsia-500/15 via-pink-500/5 to-transparent",
                border: "border-fuchsia-500/30 hover:border-fuchsia-500/60",
                iconBg: "bg-fuchsia-500/15 border-fuchsia-500/30 text-fuchsia-400 group-hover:bg-fuchsia-500 group-hover:text-white",
                glow: "group-hover:shadow-fuchsia-500/20",
                badgeActive: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
            },
            badges: [
                { label: "Tópicos Salvos", value: `${knowledgeBase.length} documentos` },
                { label: "Modo de Resposta", value: "RAG Semântico" },
                { label: "Status IA", value: isAiActive ? "Integrado" : "Aguardando IA" }
            ]
        },
        {
            title: "Comandos Customizados",
            subtitle: "Crie novos comandos slash com respostas ricas e embeds",
            icon: Terminal,
            href: `/${locale}/dashboard/${guildId}/commands`,
            isActive: isCommandsActive,
            theme: {
                gradient: "from-amber-500/15 via-orange-500/5 to-transparent",
                border: "border-amber-500/30 hover:border-amber-500/60",
                iconBg: "bg-amber-500/15 border-amber-500/30 text-amber-400 group-hover:bg-amber-500 group-hover:text-white",
                glow: "group-hover:shadow-amber-500/20",
                badgeActive: "bg-amber-500/15 text-amber-300 border-amber-500/30",
            },
            badges: [
                { label: "Comandos Ativos", value: `${customCommands.length} criados` },
                { label: "Tipo de Registro", value: "Slash (/)" },
                { label: "Execução", value: "Instantânea" }
            ]
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
                        {/* Status Pill do Bot */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            {botStatus.inGuild ? (
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>Bot Conectado & Operacional</span>
                                </div>
                            ) : (
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                                    <span className="w-2 h-2 rounded-full bg-red-400" />
                                    <span>Bot Não Encontrado no Servidor</span>
                                </div>
                            )}

                            {botStatus.hasAdministrator && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
                                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                                    Permissões de Administrador OK
                                </span>
                            )}
                        </div>

                        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
                            Visão Geral do Servidor
                        </h1>
                        <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                            Hub central de controle e automação. Monitore a saúde do bot, gerencie recursos de IA, segurança, tickets e ative novos módulos em tempo real.
                        </p>
                    </div>

                    {/* Botões de Ação Rápida no Topo */}
                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                        <Link
                            href={`/${locale}/dashboard/${guildId}/analytics`}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-bold transition-all border border-white/10 shadow-md cursor-pointer"
                        >
                            <BarChart3 className="w-4 h-4 text-purple-400" />
                            <span>Métricas</span>
                        </Link>
                        <Link
                            href={`/${locale}/dashboard/${guildId}/activity`}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-bold transition-all border border-white/10 shadow-md cursor-pointer"
                        >
                            <Activity className="w-4 h-4 text-indigo-400" />
                            <span>Auditoria</span>
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

                {/* ═══════════════════════════════════════════════════════════ */}
                {/* 📊 BARRA DE PRONTIDÃO & INDICADORES RÁPIDOS                  */}
                {/* ═══════════════════════════════════════════════════════════ */}
                <div className="relative z-10 mt-8 pt-8 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                    {/* 1. Módulos Operacionais */}
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
                        <p className="text-[11px] text-zinc-500">{readinessPercentage}% de prontidão total</p>
                    </div>

                    {/* 2. Status do AutoMod */}
                    <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                        <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                            Segurança
                        </span>
                        <div className="text-lg font-bold text-white">
                            {isAutoModActive ? "Protegido" : "Básico"}
                        </div>
                        <p className="text-[11px] text-zinc-500">
                            {config?.prohibited_words?.length || 0} palavras restritas
                        </p>
                    </div>

                    {/* 3. Base de Conhecimento IA */}
                    <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                        <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                            Cérebro IA
                        </span>
                        <div className="text-lg font-bold text-white">
                            {knowledgeBase.length} FAQs
                        </div>
                        <p className="text-[11px] text-zinc-500">
                            {isAiActive ? "IA respondendo aos membros" : "IA em modo silencioso"}
                        </p>
                    </div>

                    {/* 4. Atendimento & Tickets */}
                    <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                        <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                            <Ticket className="w-3.5 h-3.5 text-blue-400" />
                            Atendimento
                        </span>
                        <div className="text-lg font-bold text-white">
                            {ticketCategories.length} Categorias
                        </div>
                        <p className="text-[11px] text-zinc-500">
                            {config?.ticket_panel_title ? "Painel ativo" : "Sem painel customizado"}
                        </p>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* 🎛️ GRADE DE MÓDULOS REDESENHADA (CARDS PREMIUM)            */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                            <Layers className="w-5 h-5 text-purple-400" />
                            Módulos do Servidor
                        </h2>
                        <p className="text-xs text-zinc-400">
                            Configure cada recurso de forma individual e potencialize sua comunidade.
                        </p>
                    </div>
                    <span className="text-xs text-zinc-500 font-mono">
                        {modules.length} recursos disponíveis
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modules.map((module) => (
                        <Link
                            key={module.title}
                            href={module.href}
                            className={`group relative flex flex-col p-6 rounded-3xl bg-[#0C0B10] border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden ${module.theme.border} ${module.theme.glow}`}
                        >
                            {/* Gradiente sutil de fundo no hover */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${module.theme.gradient} opacity-40 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none`} />

                            <div className="relative z-10 flex flex-col h-full space-y-5">
                                {/* Topo do Card: Ícone e Status Badge */}
                                <div className="flex items-start justify-between">
                                    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all duration-300 shadow-md ${module.theme.iconBg}`}>
                                        <module.icon className="w-6 h-6" />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {module.isActive ? (
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${module.theme.badgeActive}`}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                ATIVO
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-900 text-zinc-400 border border-white/5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                                                INATIVO
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Título & Descrição */}
                                <div>
                                    <h3 className="font-bold text-lg text-white group-hover:text-white transition-colors flex items-center justify-between">
                                        <span>{module.title}</span>
                                        <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                    </h3>
                                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                                        {module.subtitle}
                                    </p>
                                </div>

                                {/* Lista de Métricas/Badges com Tipografia Refinada */}
                                <div className="space-y-2 pt-2">
                                    {module.badges.map((b, i) => (
                                        <div 
                                            key={i} 
                                            className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs"
                                        >
                                            <span className="text-zinc-400 font-medium">{b.label}</span>
                                            <span className="font-mono text-zinc-200 font-semibold truncate max-w-[150px]" title={b.value}>
                                                {b.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Rodapé com Link de Configuração */}
                                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400 group-hover:text-purple-300 font-semibold transition-colors">
                                    <span>Gerenciar Configurações</span>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

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
