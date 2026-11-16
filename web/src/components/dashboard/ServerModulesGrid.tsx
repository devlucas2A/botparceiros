"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Layers,
    ChevronRight,
    ArrowRight,
    Bot,
    Disc3,
    ShieldCheck,
    ShieldAlert,
    Ticket,
    Hand,
    Phone,
    BookOpen,
    Terminal,
    LucideIcon,
} from "lucide-react";

export type ModuleIconName =
    | "bot"
    | "music"
    | "shield-check"
    | "shield-alert"
    | "ticket"
    | "hand"
    | "phone"
    | "book"
    | "terminal";

const ICON_MAP: Record<ModuleIconName, LucideIcon> = {
    bot: Bot,
    music: Disc3,
    "shield-check": ShieldCheck,
    "shield-alert": ShieldAlert,
    ticket: Ticket,
    hand: Hand,
    phone: Phone,
    book: BookOpen,
    terminal: Terminal,
};

export interface ServerModuleItem {
    id?: string;
    category: "ia" | "media" | "sec" | "ops";
    title: string;
    subtitle: string;
    iconName: ModuleIconName;
    href: string;
    isActive: boolean;
    theme: {
        gradient: string;
        border: string;
        iconBg: string;
        glow: string;
        badgeActive: string;
    };
    summary: string;
}

interface ServerModulesGridProps {
    modules: ServerModuleItem[];
}

export function ServerModulesGrid({ modules }: ServerModulesGridProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    const categories = [
        { key: "all", label: `Todos (${modules.length})` },
        { key: "ia", label: "IA" },
        { key: "media", label: "Música & Voz" },
        { key: "sec", label: "Segurança" },
        { key: "ops", label: "Comunidade" },
    ];

    const filteredModules =
        selectedCategory === "all"
            ? modules
            : modules.filter((m) => m.category === selectedCategory);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Layers className="w-5 h-5 text-purple-400" />
                        Módulos do Servidor
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                        Escolha um recurso para configurar ou ativar.
                    </p>
                </div>

                <div className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
                    {categories.map((cat) => (
                        <button
                            key={cat.key}
                            type="button"
                            onClick={() => setSelectedCategory(cat.key)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                selectedCategory === cat.key
                                    ? "bg-white text-black shadow-md"
                                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {filteredModules.map((module) => {
                    const Icon = ICON_MAP[module.iconName] ?? Bot;
                    return (
                        <Link
                            key={module.title}
                            href={module.href}
                            className={`group relative flex flex-col justify-between p-6 rounded-3xl bg-[#0B0A0F]/90 border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5 overflow-hidden backdrop-blur-xl ${module.theme.border} ${module.theme.glow}`}
                        >
                            <div
                                className={`absolute inset-0 bg-gradient-to-br ${module.theme.gradient} opacity-25 group-hover:opacity-90 transition-opacity rounded-3xl pointer-events-none`}
                            />

                            <div className="relative z-10 flex flex-col h-full justify-between space-y-5">
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div
                                            className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all duration-300 ${module.theme.iconBg}`}
                                        >
                                            <Icon className="w-5 h-5" />
                                        </div>

                                        {module.isActive ? (
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${module.theme.badgeActive}`}
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                ATIVO
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-900 text-zinc-400 border border-white/5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                                                INATIVO
                                            </span>
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-base text-white group-hover:text-purple-200 transition-colors flex items-center justify-between">
                                            <span>{module.title}</span>
                                            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                                        </h3>
                                        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                                            {module.subtitle}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
                                    <span className="text-zinc-400 font-medium truncate max-w-[140px]">
                                        {module.summary}
                                    </span>
                                    <span className="text-zinc-300 group-hover:text-purple-300 font-semibold flex items-center gap-1 shrink-0">
                                        <span>Abrir</span>
                                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                    </span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
