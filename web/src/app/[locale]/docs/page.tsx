"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import {
    Bot,
    BookOpen,
    Terminal,
    Sparkles,
    Shield,
    Ticket,
    Phone,
    Search,
    Copy,
    Check,
    MessageSquare,
    Users,
    ChevronRight,
    HelpCircle,
    Server,
    Rocket,
    Home,
    LayoutDashboard,
    Menu,
    X,
    CreditCard,
    Headphones,
    Disc,
    ExternalLink,
} from "lucide-react";

interface CommandOption {
    name: string;
    required?: boolean;
    description: string;
}

interface CommandSubcommand {
    name: string;
    description: string;
}

interface Command {
    id: string;
    name: string;
    category: "ia" | "calls" | "tickets" | "space" | "helpcore" | "music";
    description: string;
    permission: "Administrador" | "Dono da Call" | "Membros";
    example?: string;
    options?: CommandOption[];
    subcommands?: CommandSubcommand[];
}

const ALL_COMMANDS: Command[] = [
    // ─── GUIA (/helpcore) ────────────────────────────────────────────
    {
        id: "helpcore",
        name: "/helpcore",
        category: "helpcore",
        description: "Abre o menu de ajuda dentro do Discord com todas as categorias e exemplos.",
        permission: "Membros",
        example: "/helpcore categoria:musica",
        options: [
            { name: "categoria", required: false, description: "Atalho direto: geral, musica, ia, calls, tickets, automod ou custom." },
        ],
    },

    // ─── MÚSICA (core!) ──────────────────────────────────────────────
    {
        id: "core-play",
        name: "core!play <música ou link>",
        category: "music",
        description: "Entra na sua call e toca a música. Se já tiver algo tocando, coloca na fila.",
        permission: "Membros",
        example: "core!play musica feliz",
        options: [{ name: "música ou link", required: true, description: "Nome da música, artista ou link." }],
    },
    {
        id: "core-stop",
        name: "core!stop",
        category: "music",
        description: "Para a música na hora e limpa toda a fila.",
        permission: "Membros",
        example: "core!stop",
    },
    {
        id: "core-skip",
        name: "core!skip",
        category: "music",
        description: "Pula a música atual e toca a próxima da fila.",
        permission: "Membros",
        example: "core!skip",
    },
    {
        id: "core-leave",
        name: "core!leave",
        category: "music",
        description: "Tira o bot do canal de voz.",
        permission: "Membros",
        example: "core!leave",
    },
    {
        id: "core-queue",
        name: "core!queue",
        category: "music",
        description: "Mostra todas as músicas que estão na fila.",
        permission: "Membros",
        example: "core!queue",
    },
    {
        id: "core-pause",
        name: "core!pause",
        category: "music",
        description: "Pausa a música sem perder a fila.",
        permission: "Membros",
        example: "core!pause",
    },
    {
        id: "core-resume",
        name: "core!resume",
        category: "music",
        description: "Continua a música de onde parou.",
        permission: "Membros",
        example: "core!resume",
    },
    {
        id: "core-np",
        name: "core!np",
        category: "music",
        description: "Mostra qual música está tocando agora.",
        permission: "Membros",
        example: "core!np",
    },
    {
        id: "core-loop",
        name: "core!loop",
        category: "music",
        description: "Repete a música atual, a fila inteira ou desliga a repetição.",
        permission: "Membros",
        example: "core!loop",
    },
    {
        id: "core-help",
        name: "core!help",
        category: "music",
        description: "Mostra a lista rápida dos comandos de música no chat.",
        permission: "Membros",
        example: "core!help",
    },

    // ─── IA & SERVIDOR ───────────────────────────────────────────────
    {
        id: "construir-servidor",
        name: "/construir-servidor",
        category: "ia",
        description: "Monta canais, categorias e cargos do zero usando IA a partir da sua ideia.",
        permission: "Administrador",
        example: '/construir-servidor tema:"Comunidade de games com área VIP"',
        options: [
            { name: "tema", required: true, description: "Como você quer que seu servidor seja." },
            { name: "estilo", required: false, description: "gaming, comunidade, rpg, educacional ou outro." },
            { name: "tamanho", required: false, description: "enxuto (~10), medio (~20) ou completo (~30+)." },
        ],
    },
    {
        id: "desfazer-servidor",
        name: "/desfazer-servidor",
        category: "ia",
        description: "Apaga apenas os canais e cargos criados pelo último /construir-servidor (até 24h).",
        permission: "Administrador",
        example: "/desfazer-servidor",
    },
    {
        id: "ajustar-servidor",
        name: "/ajustar-servidor",
        category: "ia",
        description: "Cria, renomeia ou organiza canais e cargos pedindo em texto normal.",
        permission: "Administrador",
        example: '/ajustar-servidor acao:"Criar canal de voz Duo 1 na categoria Gaming"',
        options: [{ name: "acao", required: true, description: "O que você quer alterar no servidor." }],
    },
    {
        id: "config-ia",
        name: "/config-ia",
        category: "ia",
        description: "Configura o canal onde a IA responde, o jeito dela falar e quem pode mandar comandos.",
        permission: "Administrador",
        subcommands: [
            { name: "canal", description: "Escolhe o canal onde a IA conversa com os membros." },
            { name: "personalidade", description: "Define o estilo das respostas da IA." },
            { name: "cargos", description: "Define quais cargos podem pedir ações de admin para a IA." },
            { name: "status", description: "Mostra como a IA está configurada agora." },
        ],
    },
    {
        id: "ajuda-ia",
        name: "/ajuda-ia",
        category: "ia",
        description: "Mostra um resumo rápido dos comandos de IA no chat.",
        permission: "Membros",
        example: "/ajuda-ia",
    },

    // ─── CALLS PRIVADAS ──────────────────────────────────────────────
    {
        id: "call-criar",
        name: "/call criar",
        category: "calls",
        description: "Cria uma sala de voz só sua que some sozinha quando todo mundo sair.",
        permission: "Membros",
        example: "/call criar",
    },
    {
        id: "call-convidar",
        name: "/call convidar",
        category: "calls",
        description: "Libera um amigo para entrar na sua call privada.",
        permission: "Dono da Call",
        example: "/call convidar usuario:@Lucas",
        options: [{ name: "usuario", required: true, description: "Pessoa que você quer convidar." }],
    },
    {
        id: "call-expulsar",
        name: "/call expulsar",
        category: "calls",
        description: "Tira alguém da sua call privada.",
        permission: "Dono da Call",
        example: "/call expulsar usuario:@Membro",
        options: [{ name: "usuario", required: true, description: "Pessoa que você quer remover." }],
    },
    {
        id: "call-bloquear",
        name: "/call bloquear",
        category: "calls",
        description: "Tranca a call para ninguém novo entrar sem convite.",
        permission: "Dono da Call",
        example: "/call bloquear",
    },
    {
        id: "call-desbloquear",
        name: "/call desbloquear",
        category: "calls",
        description: "Destranca a call para qualquer membro entrar.",
        permission: "Dono da Call",
        example: "/call desbloquear",
    },
    {
        id: "call-limite",
        name: "/call limite",
        category: "calls",
        description: "Define quantas pessoas cabem na sua call privada.",
        permission: "Dono da Call",
        example: "/call limite quantidade:4",
        options: [{ name: "quantidade", required: true, description: "Número de vagas (0 = sem limite)." }],
    },

    // ─── TICKETS ─────────────────────────────────────────────────────
    {
        id: "ticket-painel",
        name: "/ticket-painel",
        category: "tickets",
        description: "Envia o painel com botões para os membros abrirem tickets privados de suporte.",
        permission: "Administrador",
        example: "/ticket-painel",
    },

    // ─── EXTRAS / ESPAÇO ─────────────────────────────────────────────
    {
        id: "space-apod",
        name: "/apod",
        category: "space",
        description: "Mostra a foto do dia da NASA.",
        permission: "Membros",
        example: "/apod",
    },
    {
        id: "space-spacex",
        name: "/spacex",
        category: "space",
        description: "Mostra o próximo lançamento da SpaceX.",
        permission: "Membros",
        example: "/spacex",
    },
    {
        id: "space-iss",
        name: "/iss",
        category: "space",
        description: "Mostra onde a Estação Espacial Internacional está agora.",
        permission: "Membros",
        example: "/iss",
    },
    {
        id: "space-mars",
        name: "/mars",
        category: "space",
        description: "Mostra uma foto real tirada pelos robôs da NASA em Marte.",
        permission: "Membros",
        example: "/mars",
    },
    {
        id: "space-spacenews",
        name: "/spacenews",
        category: "space",
        description: "Traz notícias recentes sobre o espaço.",
        permission: "Membros",
        example: "/spacenews",
    },
    {
        id: "space-spacefact",
        name: "/spacefact",
        category: "space",
        description: "Conta uma curiosidade aleatória sobre o universo.",
        permission: "Membros",
        example: "/spacefact",
    },
];

const CHAT_AI_EXAMPLES = [
    { label: "Castigo", syntax: "ia, coloque @usuario de castigo por 10 minutos por spam" },
    { label: "Limpar chat", syntax: "ia, limpe 25 mensagens" },
    { label: "Criar canal", syntax: "ia, crie um canal de texto chamado #avisos" },
    { label: "Trancar canal", syntax: "ia, tranque o canal #geral" },
    { label: "Dar cargo", syntax: "ia, dê o cargo VIP para @usuario" },
    { label: "Anúncio", syntax: "ia, faça um anúncio em #avisos dizendo que tem evento às 20h" },
];

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success(`Copiado: ${text.split(" ")[0]}`);
        setTimeout(() => setCopied(false), 1800);
    };

    return (
        <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors flex items-center gap-1 text-xs cursor-pointer shrink-0"
            title="Copiar comando"
        >
            {copied ? (
                <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400 font-mono">Copiado!</span>
                </>
            ) : (
                <Copy className="w-3.5 h-3.5" />
            )}
        </button>
    );
}

function CommandCard({ cmd }: { cmd: Command }) {
    return (
        <div className="border border-white/10 rounded-2xl p-5 bg-[#0A0A0E] hover:border-violet-500/40 transition-all duration-200 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <code className="text-violet-300 font-mono text-sm sm:text-base font-semibold">{cmd.name}</code>
                    <CopyButton text={cmd.example || cmd.name} />
                </div>

                <span
                    className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full font-semibold border ${
                        cmd.permission === "Administrador"
                            ? "bg-red-500/10 border-red-500/30 text-red-300"
                            : cmd.permission === "Dono da Call"
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    }`}
                >
                    {cmd.permission}
                </span>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed">{cmd.description}</p>

            {cmd.options && cmd.options.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-white/5">
                    {cmd.options.map((opt) => (
                        <div key={opt.name} className="text-xs flex items-baseline gap-2">
                            <code className="text-violet-300 font-mono shrink-0">
                                {opt.name}
                                {opt.required ? "*" : ""}
                            </code>
                            <span className="text-zinc-400">{opt.description}</span>
                        </div>
                    ))}
                </div>
            )}

            {cmd.subcommands && cmd.subcommands.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {cmd.subcommands.map((sub) => (
                        <div key={sub.name} className="rounded-xl bg-black/40 border border-white/5 p-2.5 space-y-1">
                            <div className="flex items-center justify-between">
                                <code className="text-xs font-mono text-violet-300">
                                    {cmd.name} {sub.name}
                                </code>
                                <CopyButton text={`${cmd.name} ${sub.name}`} />
                            </div>
                            <p className="text-[11px] text-zinc-400">{sub.description}</p>
                        </div>
                    ))}
                </div>
            )}

            {cmd.example && (
                <div className="flex items-center justify-between bg-black/50 border border-white/5 rounded-xl px-3 py-2">
                    <code className="text-xs font-mono text-zinc-300 overflow-x-auto">{cmd.example}</code>
                    <CopyButton text={cmd.example} />
                </div>
            )}
        </div>
    );
}

export default function DocsPage() {
    const locale = useLocale();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    const filteredCommands = useMemo(() => {
        return ALL_COMMANDS.filter((cmd) => {
            const matchesCategory = selectedCategory === "all" || cmd.category === selectedCategory;
            const query = searchQuery.toLowerCase().trim();
            if (!query) return matchesCategory;

            const matchesSearch =
                cmd.name.toLowerCase().includes(query) ||
                cmd.description.toLowerCase().includes(query) ||
                cmd.example?.toLowerCase().includes(query);

            return matchesCategory && matchesSearch;
        });
    }, [searchQuery, selectedCategory]);

    const navigationLinks = [
        { label: "Começar", href: "#inicio", icon: Sparkles },
        { label: "Ajuda (/helpcore)", href: "#helpcore-guide", icon: BookOpen },
        { label: "Música (core!)", href: "#sistema-musica", icon: Disc },
        { label: "Lista de Comandos", href: "#comandos-slash", icon: Terminal },
        { label: "Falar com a IA", href: "#comandos-chat-ia", icon: MessageSquare },
        { label: "Dúvidas Rápidas", href: "#faq", icon: HelpCircle },
    ];

    const categoryFilters = [
        { id: "all", label: "Todos", icon: Terminal },
        { id: "helpcore", label: "/helpcore", icon: BookOpen },
        { id: "music", label: "Música (core!)", icon: Disc },
        { id: "ia", label: "IA & Servidor", icon: Server },
        { id: "calls", label: "Calls Privadas", icon: Phone },
        { id: "tickets", label: "Tickets", icon: Ticket },
        { id: "space", label: "Espaço", icon: Rocket },
    ];

    const musicCommands = ALL_COMMANDS.filter((c) => c.category === "music");

    return (
        <div className="min-h-screen bg-[#060609] text-white flex flex-col font-sans">
            {/* Top Navigation */}
            <nav className="sticky top-0 z-50 bg-[#060609]/90 backdrop-blur-md border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                            className="p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white lg:hidden cursor-pointer"
                            aria-label="Abrir menu"
                        >
                            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>

                        <Link href={`/${locale}`} className="flex items-center gap-2.5">
                            <div className="relative w-8 h-8 shrink-0">
                                <Image src="/CoreBot.png" alt="CoreBot Logo" fill className="object-contain" priority />
                            </div>
                            <span className="font-semibold text-sm text-white">CoreBot • Guia</span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Link
                            href={`/${locale}`}
                            className="text-xs px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
                        >
                            <Home className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Início</span>
                        </Link>
                        <Link
                            href={`/${locale}/dashboard`}
                            className="text-xs px-3.5 py-2 rounded-lg bg-white text-black font-semibold hover:bg-zinc-200 transition-colors flex items-center gap-1.5"
                        >
                            <LayoutDashboard className="w-3.5 h-3.5" />
                            <span>Painel</span>
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 flex gap-8 flex-1">
                {/* Desktop Sidebar */}
                <aside className="hidden lg:block w-60 shrink-0 sticky top-24 self-start space-y-6 pr-3 border-r border-white/5">
                    <div className="space-y-1">
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold px-3 mb-2">
                            Nesta Página
                        </div>
                        {navigationLinks.map((item) => {
                            const ItemIcon = item.icon;
                            return (
                                <a
                                    key={item.href}
                                    href={item.href}
                                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    <ItemIcon className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                                    <span>{item.label}</span>
                                </a>
                            );
                        })}
                    </div>

                    <div className="space-y-1 pt-3 border-t border-white/5">
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold px-3 mb-2">
                            Filtrar Comandos
                        </div>
                        {categoryFilters.map((cat) => {
                            const CatIcon = cat.icon;
                            const isSelected = selectedCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                        isSelected
                                            ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                                            : "text-zinc-400 hover:text-white hover:bg-white/5"
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <CatIcon className="w-3.5 h-3.5 text-violet-400" />
                                        <span>{cat.label}</span>
                                    </div>
                                    {isSelected && <ChevronRight className="w-3.5 h-3.5 text-violet-400" />}
                                </button>
                            );
                        })}
                    </div>

                    <div className="space-y-1 pt-3 border-t border-white/5">
                        <Link
                            href={`/${locale}#pricing`}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/5"
                        >
                            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Ver Planos</span>
                        </Link>
                        <Link
                            href={`/${locale}#community`}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/5"
                        >
                            <Users className="w-3.5 h-3.5 text-blue-400" />
                            <span>Discord Oficial</span>
                        </Link>
                    </div>
                </aside>

                {/* Mobile Drawer */}
                {mobileSidebarOpen && (
                    <div className="fixed inset-0 z-40 lg:hidden">
                        <div className="fixed inset-0 bg-black/80" onClick={() => setMobileSidebarOpen(false)} />
                        <div className="fixed inset-y-0 left-0 w-72 bg-[#0A0A0C] border-r border-white/10 p-6 overflow-y-auto space-y-6 z-50">
                            <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                <span className="font-semibold text-sm text-white">Menu</span>
                                <button type="button" onClick={() => setMobileSidebarOpen(false)} className="text-zinc-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-1">
                                {navigationLinks.map((item) => {
                                    const ItemIcon = item.icon;
                                    return (
                                        <a
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setMobileSidebarOpen(false)}
                                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-zinc-300 hover:bg-white/5"
                                        >
                                            <ItemIcon className="w-3.5 h-3.5 text-violet-400" />
                                            <span>{item.label}</span>
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <main className="flex-1 min-w-0 space-y-10">
                    <header className="space-y-3">
                        <h1 className="text-3xl sm:text-5xl font-serif font-medium tracking-tight">
                            Como usar o CoreBot
                        </h1>
                        <p className="text-zinc-400 text-sm sm:text-base max-w-2xl">
                            Guia rápido dos comandos no Discord. Copie qualquer comando com um clique e cole no seu servidor.
                        </p>
                    </header>

                    {/* Search & Filter */}
                    <div className="bg-[#0A0A0E] border border-white/10 rounded-2xl p-4 space-y-3">
                        <div className="relative">
                            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar comando (ex: play, skip, call, ticket, helpcore)..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                            />
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                            {categoryFilters.map((cat) => {
                                const CatIcon = cat.icon;
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors border flex items-center gap-1.5 cursor-pointer ${
                                            selectedCategory === cat.id
                                                ? "bg-violet-600 text-white border-violet-500"
                                                : "bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10 hover:text-white"
                                        }`}
                                    >
                                        <CatIcon className="w-3.5 h-3.5" />
                                        <span>{cat.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 1. Começar */}
                    <section id="inicio" className="scroll-mt-24 space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-violet-400" />
                            <span>Comece em 3 passos</span>
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="border border-white/10 rounded-2xl p-5 bg-[#0A0A0E] space-y-2">
                                <span className="inline-flex w-7 h-7 rounded-lg bg-violet-500/20 text-violet-300 font-bold items-center justify-center text-xs">
                                    1
                                </span>
                                <h3 className="font-semibold text-white text-sm">Entre no Painel</h3>
                                <p className="text-xs text-zinc-400">Faça login com seu Discord e adicione o bot no seu servidor.</p>
                            </div>
                            <div className="border border-white/10 rounded-2xl p-5 bg-[#0A0A0E] space-y-2">
                                <span className="inline-flex w-7 h-7 rounded-lg bg-violet-500/20 text-violet-300 font-bold items-center justify-center text-xs">
                                    2
                                </span>
                                <h3 className="font-semibold text-white text-sm">Digite /helpcore</h3>
                                <p className="text-xs text-zinc-400">Veja todos os comandos direto no chat do Discord quando quiser.</p>
                            </div>
                            <div className="border border-white/10 rounded-2xl p-5 bg-[#0A0A0E] space-y-2">
                                <span className="inline-flex w-7 h-7 rounded-lg bg-violet-500/20 text-violet-300 font-bold items-center justify-center text-xs">
                                    3
                                </span>
                                <h3 className="font-semibold text-white text-sm">Toque músicas</h3>
                                <p className="text-xs text-zinc-400">Entre em uma call e mande <code className="text-violet-300 font-mono">core!play</code>.</p>
                            </div>
                        </div>
                    </section>

                    {/* 2. /helpcore */}
                    <section id="helpcore-guide" className="scroll-mt-24 space-y-4 pt-6 border-t border-white/10">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-violet-400" />
                                <span>Ajuda rápida no Discord (/helpcore)</span>
                            </h2>
                            <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-xl px-3 py-1.5">
                                <code className="text-xs font-mono text-violet-300">/helpcore</code>
                                <CopyButton text="/helpcore" />
                            </div>
                        </div>
                        <p className="text-sm text-zinc-400">
                            Quando alguém digita <code className="text-violet-300 font-mono">/helpcore</code> no Discord, aparece um menu com 7 categorias para escolher o que quer aprender (Visão Geral, Música, IA, Calls, Tickets, Moderação e Comandos Custom).
                        </p>
                    </section>

                    {/* 3. Música (core!) */}
                    <section id="sistema-musica" className="scroll-mt-24 space-y-4 pt-6 border-t border-white/10">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Headphones className="w-5 h-5 text-violet-400" />
                                <span>Música na Call (prefixo core!)</span>
                            </h2>
                            <span className="text-xs text-zinc-400">Entre em uma call e digite no chat</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {musicCommands.map((cmd) => (
                                <div
                                    key={cmd.id}
                                    className="rounded-2xl bg-[#0A0A0E] border border-white/10 p-4 flex items-start justify-between gap-3"
                                >
                                    <div className="space-y-1 min-w-0">
                                        <code className="text-xs sm:text-sm font-mono font-semibold text-violet-300 block">
                                            {cmd.name}
                                        </code>
                                        <p className="text-xs text-zinc-400">{cmd.description}</p>
                                    </div>
                                    <CopyButton text={cmd.example || cmd.name} />
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 4. Catálogo */}
                    <section id="comandos-slash" className="scroll-mt-24 space-y-4 pt-6 border-t border-white/10">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Terminal className="w-5 h-5 text-violet-400" />
                                <span>Todos os Comandos</span>
                            </h2>
                            <span className="text-xs text-zinc-400">{filteredCommands.length} resultados</span>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {filteredCommands.length > 0 ? (
                                filteredCommands.map((cmd) => <CommandCard key={cmd.id} cmd={cmd} />)
                            ) : (
                                <div className="border border-white/10 rounded-2xl p-8 text-center text-sm text-zinc-500">
                                    Nenhum comando encontrado para essa busca.
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 5. Falar com a IA */}
                    <section id="comandos-chat-ia" className="scroll-mt-24 space-y-4 pt-6 border-t border-white/10">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Bot className="w-5 h-5 text-violet-400" />
                            <span>Pedir coisas para a IA no chat</span>
                        </h2>
                        <p className="text-sm text-zinc-400">
                            Se você for admin, pode falar direto no chat usando <code className="text-violet-300 font-mono">ia, ...</code> ou marcando o bot:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {CHAT_AI_EXAMPLES.map((item) => (
                                <div
                                    key={item.label}
                                    className="rounded-2xl bg-[#0A0A0E] border border-white/10 p-4 flex items-center justify-between gap-3"
                                >
                                    <div className="min-w-0 space-y-1">
                                        <span className="text-[11px] font-semibold text-zinc-400 block">{item.label}</span>
                                        <code className="text-xs font-mono text-violet-300 block truncate">{item.syntax}</code>
                                    </div>
                                    <CopyButton text={item.syntax} />
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 6. FAQ */}
                    <section id="faq" className="scroll-mt-24 space-y-3 pt-6 border-t border-white/10">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <HelpCircle className="w-5 h-5 text-violet-400" />
                            <span>Dúvidas rápidas</span>
                        </h2>
                        {[
                            {
                                q: "Os comandos com / não aparecem no Discord. O que faço?",
                                a: "Dê Ctrl + R no Discord (ou feche e abra no celular) e confira se o bot tem permissão de enviar mensagens no canal.",
                            },
                            {
                                q: "Como o bot faz para tocar música?",
                                a: "Entre em qualquer canal de voz do servidor e digite core!play nome da música.",
                            },
                            {
                                q: "As calls privadas somem sozinhas?",
                                a: "Sim! Assim que todo mundo sair da sala criada com /call criar, o canal é apagado sozinho.",
                            },
                            {
                                q: "Por que o bot não consegue dar cargos ou banir alguém?",
                                a: "Coloque o cargo do CoreBot acima dos cargos dos membros nas configurações de cargos do seu servidor.",
                            },
                        ].map((item, i) => (
                            <details key={i} className="border border-white/10 rounded-2xl bg-[#0A0A0E] p-4 group">
                                <summary className="cursor-pointer font-medium text-white text-sm list-none flex items-center justify-between gap-2">
                                    <span>{item.q}</span>
                                    <ChevronRight className="w-4 h-4 text-zinc-500 group-open:rotate-90 transition-transform shrink-0" />
                                </summary>
                                <p className="text-zinc-400 text-xs mt-2.5 leading-relaxed">{item.a}</p>
                            </details>
                        ))}
                    </section>

                    {/* Suporte */}
                    <section className="border border-violet-500/20 rounded-2xl p-6 bg-linear-to-r from-violet-500/10 to-transparent flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-base font-semibold text-white">Precisa de ajuda?</h2>
                            <p className="text-xs text-zinc-400 mt-0.5">Tire suas dúvidas com a gente no Discord.</p>
                        </div>
                        <Link
                            href={`/${locale}#community`}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                        >
                            <span>Entrar no Discord</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                    </section>
                </main>
            </div>
        </div>
    );
}
