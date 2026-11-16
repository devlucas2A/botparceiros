"use client";

import { useState, useRef, useCallback } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Terminal, Disc3, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface Hero3DProps {
    locale?: string;
}

export function Hero3D({ locale = "pt" }: Hero3DProps) {
    const isEn = locale === "en";
    const cardRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<"builder" | "music">("builder");
    const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const springConfig = { damping: 22, stiffness: 140, mass: 0.5 };
    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [9, -9]), springConfig);
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-9, 9]), springConfig);

    const lightX = useTransform(mouseX, [-0.5, 0.5], ["15%", "85%"]);
    const lightY = useTransform(mouseY, [-0.5, 0.5], ["15%", "85%"]);

    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (!cardRef.current) return;
            const rect = cardRef.current.getBoundingClientRect();
            mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
            mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
        },
        [mouseX, mouseY]
    );

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    const copyCommand = (cmd: string) => {
        navigator.clipboard.writeText(cmd);
        setCopiedCmd(cmd);
        toast.success(isEn ? `Copied ${cmd}` : `Comando ${cmd} copiado!`);
        setTimeout(() => setCopiedCmd(null), 1800);
    };

    return (
        <div
            className="w-full flex justify-center items-center py-4 perspective-1200 select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <motion.div
                ref={cardRef}
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: "preserve-3d",
                }}
                className="relative w-full max-w-[540px] rounded-2xl bg-[#0B0B10]/95 border border-white/10 shadow-[0_30px_70px_-20px_rgba(124,58,237,0.35)] overflow-hidden transition-shadow duration-500 hover:shadow-[0_40px_90px_-15px_rgba(124,58,237,0.48)] group"
            >
                {/* Brilho 3D acompanhando o mouse */}
                <motion.div
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"
                    style={{
                        background: useTransform(
                            [lightX, lightY],
                            ([lx, ly]) =>
                                `radial-gradient(circle at ${lx} ${ly}, rgba(139, 92, 246, 0.16) 0%, transparent 65%)`
                        ),
                    }}
                />

                {/* Barra superior estilo janela macOS + abas */}
                <div className="relative z-20 h-12 border-b border-white/10 bg-white/[0.03] px-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-rose-500/70" />
                        <span className="w-3 h-3 rounded-full bg-amber-400/70" />
                        <span className="w-3 h-3 rounded-full bg-emerald-400/70" />
                    </div>

                    <div className="flex items-center gap-1 p-1 rounded-xl bg-black/50 border border-white/5">
                        <button
                            type="button"
                            onClick={() => setActiveTab("builder")}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                                activeTab === "builder"
                                    ? "bg-purple-600/30 text-white border border-purple-400/30"
                                    : "text-zinc-400 hover:text-white"
                            }`}
                        >
                            <Terminal className="w-3 h-3 text-purple-400" />
                            <span>{isEn ? "AI Builder" : "Criar Servidor"}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("music")}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                                activeTab === "music"
                                    ? "bg-violet-600/30 text-white border border-violet-400/30"
                                    : "text-zinc-400 hover:text-white"
                            }`}
                        >
                            <Disc3 className="w-3 h-3 text-violet-400" />
                            <span>{isEn ? "Music" : "Música"}</span>
                        </button>
                    </div>
                </div>

                {/* Corpo animado do Terminal */}
                <div className="relative z-20 p-6 sm:p-7 font-mono text-xs sm:text-sm min-h-[340px] flex flex-col justify-between">
                    {activeTab === "builder" ? (
                        <div key="builder" className="space-y-4">
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="flex items-center justify-between gap-2"
                            >
                                <div>
                                    <span className="text-emerald-400">você@discord:~$</span>{" "}
                                    <span className="text-white font-semibold">/construir-servidor</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => copyCommand("/construir-servidor")}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                    title={isEn ? "Copy" : "Copiar"}
                                >
                                    {copiedCmd === "/construir-servidor" ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                    )}
                                </button>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.25 }}
                                className="pl-3.5 border-l-2 border-purple-500/40 text-zinc-300 text-xs sm:text-sm"
                            >
                                {isEn
                                    ? '"Gaming server with VIP area, voice rooms and level roles"'
                                    : '"Comunidade de games com área VIP, calls e cargos"'}
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.55 }}
                                className="text-purple-300 text-xs flex items-center gap-2 pt-1"
                            >
                                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                                <span>{isEn ? "CoreBot is building your server..." : "CoreBot montando seu servidor..."}</span>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.85 }}
                                className="rounded-xl bg-white/[0.04] border border-white/10 p-4 space-y-2 text-xs font-sans"
                            >
                                <p className="text-emerald-400 font-semibold">
                                    {isEn ? "Ready! Structure created:" : "Pronto! Estrutura criada:"}
                                </p>
                                <ul className="space-y-1 text-zinc-300 pl-4 list-disc">
                                    <li>{isEn ? "5 categories (Welcome, Chat, Games, VIP, Staff)" : "5 categorias (Boas-vindas, Chat, Games, VIP, Staff)"}</li>
                                    <li>{isEn ? "12 text and voice channels" : "12 canais de texto e voz"}</li>
                                    <li>{isEn ? "Roles: @Member, @VIP, @Mod" : "Cargos: @Membro, @VIP, @Mod"}</li>
                                </ul>
                            </motion.div>
                        </div>
                    ) : (
                        <div key="music" className="space-y-4">
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="flex items-center justify-between gap-2"
                            >
                                <div>
                                    <span className="text-emerald-400">você@discord:~$</span>{" "}
                                    <span className="text-white font-semibold">
                                        {isEn ? "core!play chill beats" : "core!play musica feliz"}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => copyCommand(isEn ? "core!play chill beats" : "core!play musica feliz")}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                    title={isEn ? "Copy" : "Copiar"}
                                >
                                    {copiedCmd?.startsWith("core!play") ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                    )}
                                </button>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="rounded-xl bg-white/[0.04] border border-violet-500/25 p-4 space-y-3 font-sans"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300 shrink-0">
                                        <Disc3 className="w-5 h-5 animate-spin [animation-duration:5s]" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] text-violet-300 font-medium">
                                            {isEn ? "Playing in Voice Channel" : "Tocando na call"}
                                        </p>
                                        <p className="text-sm font-semibold text-white truncate">
                                            Sunset Vibes • Mix
                                        </p>
                                    </div>
                                </div>

                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: "20%" }}
                                        animate={{ width: "68%" }}
                                        transition={{ duration: 1.2, ease: "easeOut" }}
                                        className="h-full bg-linear-to-r from-violet-500 to-purple-400 rounded-full"
                                    />
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="flex flex-wrap gap-2 pt-1"
                            >
                                {["core!skip", "core!stop", "core!queue", "core!leave"].map((cmd) => (
                                    <button
                                        key={cmd}
                                        type="button"
                                        onClick={() => copyCommand(cmd)}
                                        className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
                                    >
                                        {cmd}
                                    </button>
                                ))}
                            </motion.div>
                        </div>
                    )}

                    <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500">
                        <span>{isEn ? "Type /helpcore in Discord for all commands" : "Digite /helpcore no Discord para ver tudo"}</span>
                        <span className="text-emerald-400 animate-pulse">● online</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
