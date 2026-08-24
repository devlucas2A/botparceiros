"use client";

import { useState } from "react";
import { Search, FileText, Calendar, MessageSquare, User, Bot, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useParams } from "next/navigation";

interface TranscriptItem {
    id: string;
    ticket_name: string;
    category: string;
    summary?: string | null;
    message_count: number;
    created_at: string | Date;
}

export function TicketTranscriptsList({
    transcripts = [],
    guildId
}: {
    transcripts: TranscriptItem[];
    guildId: string;
}) {
    const params = useParams();
    const locale = (params?.locale as string) || "pt";
    const [search, setSearch] = useState("");

    const filtered = transcripts.filter(t => {
        const query = search.toLowerCase();
        return (
            t.ticket_name.toLowerCase().includes(query) ||
            t.category.toLowerCase().includes(query) ||
            (t.summary && t.summary.toLowerCase().includes(query)) ||
            t.id.toLowerCase().includes(query)
        );
    });

    return (
        <div className="space-y-6 font-sans">
            {/* Header & Search */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-violet-400" />
                        Histórico de Transcrições
                    </h3>
                    <p className="text-xs text-zinc-400">
                        {transcripts.length} chamado(s) arquivado(s) com histórico completo de mensagens.
                    </p>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                        placeholder="Buscar ticket ou resumo..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-zinc-900/60 border-zinc-800 text-white text-xs h-9 rounded-xl focus:border-violet-500/50"
                    />
                </div>
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 px-4 rounded-2xl bg-[#0A0A0C] border border-white/5">
                    <FileText className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                    <h4 className="text-white font-medium text-sm">Nenhuma transcrição encontrada</h4>
                    <p className="text-zinc-500 text-xs mt-1 max-w-sm mx-auto">
                        Quando um ticket for encerrado no Discord, sua transcrição em HTML e resumo por IA aparecerão listados aqui.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {filtered.map((item) => {
                        const dateStr = new Date(item.created_at).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                        });

                        return (
                            <div
                                key={item.id}
                                className="p-5 rounded-2xl bg-[#0A0A0C] border border-white/5 hover:border-violet-500/30 transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group"
                            >
                                <div className="space-y-2 grow min-w-0">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="font-bold text-white text-sm group-hover:text-violet-300 transition-colors">
                                            #{item.ticket_name}
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 border border-violet-500/20 text-violet-300">
                                            {item.category}
                                        </span>
                                        <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> {dateStr}
                                        </span>
                                        <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                                            <MessageSquare className="w-3 h-3" /> {item.message_count} mensagens
                                        </span>
                                    </div>

                                    {item.summary && (
                                        <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/15 text-xs text-purple-200/90 leading-relaxed flex items-start gap-2">
                                            <Bot className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                                            <span className="line-clamp-2">{item.summary}</span>
                                        </div>
                                    )}
                                </div>

                                <Link
                                    href={`/${locale}/dashboard/${guildId}/tickets/transcripts/${item.id}`}
                                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-violet-600 text-white text-xs font-semibold border border-white/10 hover:border-violet-500 transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-xs"
                                >
                                    <span>Ver Transcrição</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
