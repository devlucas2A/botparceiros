"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
    Bot,
    Disc3,
    ShieldCheck,
    Ticket,
    Hand,
    Phone,
    Sparkles,
    Crown,
    ArrowRight,
    LucideIcon,
} from "lucide-react";

interface ModuleItem {
    id: string;
    category: "ia" | "media" | "sec" | "ops";
    title: string;
    desc: string;
    icon: LucideIcon;
    iconStyle: string;
    borderGlow: string;
    hint: string;
}

function TiltCard({ mod }: { mod: ModuleItem }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const springConfig = { damping: 24, stiffness: 180, mass: 0.4 };
    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), springConfig);
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-6, 6]), springConfig);

    const handleMove = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (!cardRef.current) return;
            const rect = cardRef.current.getBoundingClientRect();
            mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
            mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
        },
        [mouseX, mouseY]
    );

    const handleLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    const Icon = mod.icon;

    return (
        <div className="perspective-1000 h-full">
            <motion.div
                ref={cardRef}
                onMouseMove={handleMove}
                onMouseLeave={handleLeave}
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: "preserve-3d",
                }}
                className={`group h-full rounded-3xl bg-[#0A0A0F]/90 border border-white/10 p-6 flex flex-col justify-between transition-colors duration-300 ${mod.borderGlow} shadow-lg`}
            >
                <div className="space-y-4">
                    <div
                        style={{ transform: "translateZ(18px)" }}
                        className={`w-11 h-11 rounded-2xl border border-white/10 flex items-center justify-center transition-all duration-300 ${mod.iconStyle}`}
                    >
                        <Icon className="w-5 h-5" />
                    </div>

                    <div style={{ transform: "translateZ(12px)" }}>
                        <h3 className="text-base font-semibold text-white group-hover:text-purple-200 transition-colors">
                            {mod.title}
                        </h3>
                        <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">
                            {mod.desc}
                        </p>
                    </div>
                </div>

                <div
                    style={{ transform: "translateZ(10px)" }}
                    className="mt-6 pt-3.5 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500"
                >
                    <code className="font-mono text-zinc-400">{mod.hint}</code>
                </div>
            </motion.div>
        </div>
    );
}

interface ModulesShowcaseProps {
    locale: string;
}

export function ModulesShowcase({ locale }: ModulesShowcaseProps) {
    const isEn = locale === "en";
    const [activeFilter, setActiveFilter] = useState<string>("all");

    const modules: ModuleItem[] = isEn
        ? [
              {
                  id: "builder",
                  category: "ia",
                  title: "Server Builder",
                  desc: "Creates channels, roles and categories from one message.",
                  icon: Bot,
                  iconStyle: "bg-purple-500/15 text-purple-400 group-hover:bg-purple-500 group-hover:text-white",
                  borderGlow: "hover:border-purple-500/40",
                  hint: "/construir-servidor",
              },
              {
                  id: "music",
                  category: "media",
                  title: "Music in Voice",
                  desc: "Play songs and queue tracks straight in your voice call.",
                  icon: Disc3,
                  iconStyle: "bg-violet-500/15 text-violet-400 group-hover:bg-violet-500 group-hover:text-white",
                  borderGlow: "hover:border-violet-500/40",
                  hint: "core!play",
              },
              {
                  id: "corebot",
                  category: "ia",
                  title: "Chat AI",
                  desc: "Answers member questions using what you teach it.",
                  icon: Sparkles,
                  iconStyle: "bg-indigo-500/15 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white",
                  borderGlow: "hover:border-indigo-500/40",
                  hint: "@CoreBot",
              },
              {
                  id: "automod",
                  category: "sec",
                  title: "Auto Protection",
                  desc: "Blocks spam, bad links and raids automatically.",
                  icon: ShieldCheck,
                  iconStyle: "bg-rose-500/15 text-rose-400 group-hover:bg-rose-500 group-hover:text-white",
                  borderGlow: "hover:border-rose-500/40",
                  hint: "24/7 active",
              },
              {
                  id: "tickets",
                  category: "ops",
                  title: "Tickets",
                  desc: "Private support channels to help your members fast.",
                  icon: Ticket,
                  iconStyle: "bg-blue-500/15 text-blue-400 group-hover:bg-blue-500 group-hover:text-white",
                  borderGlow: "hover:border-blue-500/40",
                  hint: "/ticket",
              },
              {
                  id: "welcome",
                  category: "ops",
                  title: "Welcome Banner",
                  desc: "Greets new members with a custom card and role.",
                  icon: Hand,
                  iconStyle: "bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white",
                  borderGlow: "hover:border-emerald-500/40",
                  hint: "Auto role",
              },
              {
                  id: "calls",
                  category: "media",
                  title: "Private Calls",
                  desc: "Temporary voice rooms created on demand.",
                  icon: Phone,
                  iconStyle: "bg-cyan-500/15 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white",
                  borderGlow: "hover:border-cyan-500/40",
                  hint: "/call criar",
              },
              {
                  id: "whitelabel",
                  category: "ops",
                  title: "Your Own Bot",
                  desc: "Set your server's own name and avatar on the bot.",
                  icon: Crown,
                  iconStyle: "bg-amber-500/15 text-amber-400 group-hover:bg-amber-500 group-hover:text-white",
                  borderGlow: "hover:border-amber-500/40",
                  hint: "PRO",
              },
          ]
        : [
              {
                  id: "builder",
                  category: "ia",
                  title: "Criar Servidor",
                  desc: "Monta canais, cargos e categorias só com uma mensagem.",
                  icon: Bot,
                  iconStyle: "bg-purple-500/15 text-purple-400 group-hover:bg-purple-500 group-hover:text-white",
                  borderGlow: "hover:border-purple-500/40",
                  hint: "/construir-servidor",
              },
              {
                  id: "music",
                  category: "media",
                  title: "Música na Call",
                  desc: "Toca músicas e organiza a fila direto no canal de voz.",
                  icon: Disc3,
                  iconStyle: "bg-violet-500/15 text-violet-400 group-hover:bg-violet-500 group-hover:text-white",
                  borderGlow: "hover:border-violet-500/40",
                  hint: "core!play",
              },
              {
                  id: "corebot",
                  category: "ia",
                  title: "IA no Chat",
                  desc: "Conversa e tira dúvidas dos membros usando o que você ensinar.",
                  icon: Sparkles,
                  iconStyle: "bg-indigo-500/15 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white",
                  borderGlow: "hover:border-indigo-500/40",
                  hint: "@CoreBot",
              },
              {
                  id: "automod",
                  category: "sec",
                  title: "Proteção no Chat",
                  desc: "Bloqueia spam, links suspeitos e invasões sozinho.",
                  icon: ShieldCheck,
                  iconStyle: "bg-rose-500/15 text-rose-400 group-hover:bg-rose-500 group-hover:text-white",
                  borderGlow: "hover:border-rose-500/40",
                  hint: "Ativo 24h",
              },
              {
                  id: "tickets",
                  category: "ops",
                  title: "Tickets",
                  desc: "Canais privados organizados para atender sua comunidade.",
                  icon: Ticket,
                  iconStyle: "bg-blue-500/15 text-blue-400 group-hover:bg-blue-500 group-hover:text-white",
                  borderGlow: "hover:border-blue-500/40",
                  hint: "/ticket",
              },
              {
                  id: "welcome",
                  category: "ops",
                  title: "Boas-vindas",
                  desc: "Recebe novos membros com imagem e cargo automático.",
                  icon: Hand,
                  iconStyle: "bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white",
                  borderGlow: "hover:border-emerald-500/40",
                  hint: "Cargo automático",
              },
              {
                  id: "calls",
                  category: "media",
                  title: "Calls Privadas",
                  desc: "Salas de voz temporárias que somem quando todo mundo sai.",
                  icon: Phone,
                  iconStyle: "bg-cyan-500/15 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white",
                  borderGlow: "hover:border-cyan-500/40",
                  hint: "/call criar",
              },
              {
                  id: "whitelabel",
                  category: "ops",
                  title: "Bot com a sua Cara",
                  desc: "Troque o nome e a foto do bot para combinar com o servidor.",
                  icon: Crown,
                  iconStyle: "bg-amber-500/15 text-amber-400 group-hover:bg-amber-500 group-hover:text-white",
                  borderGlow: "hover:border-amber-500/40",
                  hint: "PRO",
              },
          ];

    const filters = isEn
        ? [
              { key: "all", label: "All" },
              { key: "ia", label: "AI" },
              { key: "media", label: "Music & Voice" },
              { key: "sec", label: "Safety" },
              { key: "ops", label: "Community" },
          ]
        : [
              { key: "all", label: "Todos" },
              { key: "ia", label: "IA" },
              { key: "media", label: "Música & Voz" },
              { key: "sec", label: "Segurança" },
              { key: "ops", label: "Comunidade" },
          ];

    const filteredModules =
        activeFilter === "all" ? modules : modules.filter((m) => m.category === activeFilter);

    return (
        <section id="features" className="py-24 relative z-10 border-t border-white/5">
            <div className="max-w-7xl mx-auto px-6 sm:px-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                    <div>
                        <h2 className="text-3xl md:text-5xl font-serif text-white font-medium tracking-tight">
                            {isEn ? "Everything in one bot." : "Tudo para o seu servidor."}
                        </h2>
                        <p className="text-zinc-400 text-sm md:text-base mt-3 max-w-md">
                            {isEn
                                ? "Easy to set up, fast to use."
                                : "Fácil de configurar, rápido de usar."}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
                        {filters.map((filter) => (
                            <button
                                key={filter.key}
                                type="button"
                                onClick={() => setActiveFilter(filter.key)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                                    activeFilter === filter.key
                                        ? "bg-white text-black font-semibold shadow-md"
                                        : "text-zinc-400 hover:text-white"
                                }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {filteredModules.map((mod) => (
                        <TiltCard key={mod.id} mod={mod} />
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <Link
                        href={`/${locale}/docs`}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-all group"
                    >
                        <span>{isEn ? "See all commands" : "Ver todos os comandos"}</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
