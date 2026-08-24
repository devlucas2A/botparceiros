import { getTicketTranscriptById } from "@shared/services/database";
import { verifyUserGuildAccess } from "@/lib/discord-api";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-service";
import Link from "next/link";
import { ArrowLeft, Download, FileText, Bot, Calendar, MessageSquare } from "lucide-react";

interface Props {
    params: Promise<{
        locale: string;
        guildId: string;
        transcriptId: string;
    }>;
}

export default async function TranscriptViewPage({ params }: Props) {
    const { locale, guildId, transcriptId } = await params;
    const user = await getCurrentUser();

    if (!user) {
        redirect("/api/auth/signin");
    }

    const hasAccess = await verifyUserGuildAccess(guildId);
    if (!hasAccess) {
        notFound();
    }

    const transcript = await getTicketTranscriptById(transcriptId);
    if (!transcript || transcript.guild_id !== guildId) {
        notFound();
    }

    const dateStr = new Date(transcript.created_at).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

    return (
        <div className="space-y-6 w-full max-w-6xl mx-auto px-4 py-6 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0A0A0C] p-6 rounded-2xl border border-white/5 shadow-xl">
                <div className="space-y-2">
                    <Link
                        href={`/${locale}/dashboard/${guildId}/tickets`}
                        className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Voltar para Tickets
                    </Link>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <FileText className="w-6 h-6 text-violet-400" />
                        #{transcript.ticket_name}
                    </h1>
                    <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20 font-bold uppercase text-[10px]">
                            {transcript.category}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> {dateStr}
                        </span>
                        <span className="flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" /> {transcript.message_count} mensagens
                        </span>
                    </div>
                </div>

                <a
                    href={`data:text/html;charset=utf-8,${encodeURIComponent(transcript.transcript_html)}`}
                    download={`transcript-${transcript.ticket_name}.html`}
                    className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-violet-900/20 shrink-0"
                >
                    <Download className="w-4 h-4" />
                    Baixar HTML
                </a>
            </div>

            {/* AI Summary Box (if present) */}
            {transcript.summary && (
                <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                    <div className="flex items-center gap-2 text-purple-300 font-bold text-xs uppercase tracking-wider">
                        <Bot className="w-4 h-4" />
                        Resumo do Atendimento por Inteligência Artificial
                    </div>
                    <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                        {transcript.summary}
                    </p>
                </div>
            )}

            {/* Sandboxed HTML Transcript Viewer */}
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#313338]">
                <iframe
                    srcDoc={transcript.transcript_html}
                    title={`Transcrição ${transcript.ticket_name}`}
                    className="w-full h-[750px] border-0"
                    sandbox="allow-same-origin allow-popups"
                />
            </div>
        </div>
    );
}
