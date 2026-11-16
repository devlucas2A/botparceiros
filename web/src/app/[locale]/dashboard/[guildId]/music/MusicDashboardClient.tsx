"use client";

import { useState } from "react";
import Link from "next/link";
import { Disc3, Copy, Check, ArrowLeft, Headphones, ListMusic } from "lucide-react";
import { toast } from "sonner";

interface MusicDashboardClientProps {
    guildId: string;
    locale: string;
}

export function MusicDashboardClient({ guildId, locale }: MusicDashboardClientProps) {
    const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

    const commands = [
        { name: "core!play <música ou link>", desc: "Entra na sua call e toca a música ou coloca na fila.", group: "Tocar" },
        { name: "core!skip", desc: "Pula para a próxima música da fila.", group: "Fila" },
        { name: "core!stop", desc: "Para tudo e limpa a fila.", group: "Controle" },
        { name: "core!leave", desc: "Tira o bot do canal de voz.", group: "Controle" },
        { name: "core!queue", desc: "Mostra as músicas que estão na fila.", group: "Fila" },
        { name: "core!pause", desc: "Pausa a música atual.", group: "Controle" },
        { name: "core!resume", desc: "Continua a música de onde parou.", group: "Controle" },
        { name: "core!np", desc: "Mostra qual música está tocando agora.", group: "Info" },
        { name: "core!loop", desc: "Repete a música atual ou a fila inteira.", group: "Modo" },
        { name: "core!help", desc: "Mostra essa lista de comandos no Discord.", group: "Ajuda" },
    ];

    const copyCommand = (cmd: string) => {
        navigator.clipboard.writeText(cmd);
        setCopiedCmd(cmd);
        toast.success(`Copiado: ${cmd.split(" ")[0]}`);
        setTimeout(() => setCopiedCmd(null), 1800);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 font-sans">
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                <div>
                    <Link
                        href={`/${locale}/dashboard/${guildId}`}
                        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors mb-2 group"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                        <span>Voltar</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
                            <Disc3 className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
                                Música
                                <span className="px-2.5 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-mono">
                                    core!
                                </span>
                            </h1>
                            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                                Toque suas músicas direto na call usando o prefixo <code className="text-violet-300 font-mono">core!</code>.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Como usar em 3 passos simples */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-[#0A0A0F] border border-white/10 p-5 space-y-2">
                    <span className="inline-flex w-7 h-7 rounded-lg bg-violet-500/20 text-violet-300 text-xs font-bold items-center justify-center">
                        1
                    </span>
                    <h2 className="text-sm font-semibold text-white">Entre em uma call</h2>
                    <p className="text-xs text-zinc-400">
                        Conecte em qualquer canal de voz do servidor antes de chamar o bot.
                    </p>
                </div>

                <div className="rounded-2xl bg-[#0A0A0F] border border-white/10 p-5 space-y-2">
                    <span className="inline-flex w-7 h-7 rounded-lg bg-violet-500/20 text-violet-300 text-xs font-bold items-center justify-center">
                        2
                    </span>
                    <h2 className="text-sm font-semibold text-white">Peça sua música</h2>
                    <p className="text-xs text-zinc-400">
                        Digite <code className="text-violet-300 font-mono">core!play música feliz</code> ou cole um link no chat.
                    </p>
                </div>

                <div className="rounded-2xl bg-[#0A0A0F] border border-white/10 p-5 space-y-2">
                    <span className="inline-flex w-7 h-7 rounded-lg bg-violet-500/20 text-violet-300 text-xs font-bold items-center justify-center">
                        3
                    </span>
                    <h2 className="text-sm font-semibold text-white">Controle fácil</h2>
                    <p className="text-xs text-zinc-400">
                        Pule com <code className="text-violet-300 font-mono">core!skip</code> ou pare com{" "}
                        <code className="text-violet-300 font-mono">core!stop</code>. Ele sai sozinho se a call esvaziar.
                    </p>
                </div>
            </div>

            {/* Lista de Comandos */}
            <div className="rounded-3xl bg-[#0A0A0F] border border-white/10 p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <Headphones className="w-5 h-5 text-violet-400" />
                        <div>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                Comandos de Música
                            </h2>
                            <p className="text-xs text-zinc-400">Clique em qualquer card para copiar.</p>
                        </div>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-300 self-start">
                        <ListMusic className="w-3.5 h-3.5 text-violet-400" />
                        <span>{commands.length} comandos</span>
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {commands.map((cmd) => (
                        <button
                            key={cmd.name}
                            type="button"
                            onClick={() => copyCommand(cmd.name)}
                            className="text-left p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-violet-500/40 hover:bg-white/[0.04] transition-all cursor-pointer group flex flex-col justify-between space-y-2.5"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <code className="text-xs font-mono font-bold text-violet-300 group-hover:text-white transition-colors">
                                    {cmd.name}
                                </code>
                                <span className="p-1.5 rounded-lg bg-white/5 text-zinc-400 group-hover:text-violet-300 shrink-0">
                                    {copiedCmd === cmd.name ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                    )}
                                </span>
                            </div>

                            <p className="text-xs text-zinc-400 leading-relaxed">{cmd.desc}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
