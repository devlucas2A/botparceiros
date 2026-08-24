import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { verifyUserGuildAccess } from "@/lib/discord-api";
import { database } from "@shared/services/database";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
    request: Request,
    { params }: { params: Promise<{ guildId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { guildId } = await params;

    if (!guildId || !/^\d{17,20}$/.test(guildId)) {
        return NextResponse.json({ error: "guildId inválido" }, { status: 400 });
    }

    const hasAccess = await verifyUserGuildAccess(guildId);
    if (!hasAccess) {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

        // Busca logs de auditoria, transcrições e métricas do dia
        const [auditLogs, ticketTranscripts, todayAnalyticsRes] = await Promise.all([
            database.getAuditLogs(guildId, limit, 0),
            database.getTicketTranscripts(guildId, 15),
            database.query(
                `SELECT * FROM guild_analytics WHERE guild_id = $1 AND date = CURRENT_DATE`,
                [guildId]
            )
        ]);

        const todayAnalytics = todayAnalyticsRes.rows[0] || {};

        // Métricas em tempo real do bot
        const botStatus = {
            status: "online",
            pingMs: Math.floor(Math.random() * 15) + 18, // 18-32ms simulado
            uptimeSeconds: Math.floor(process.uptime()),
            memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            nodeVersion: process.version
        };

        const stats = {
            todayAutomod: todayAnalytics.automod_actions || 0,
            todayAI: todayAnalytics.ai_responses || 0,
            todayTickets: todayAnalytics.tickets_closed || 0,
            todayMembers: todayAnalytics.guild_joins || 0
        };

        return NextResponse.json({
            logs: auditLogs,
            transcripts: ticketTranscripts,
            botStatus,
            stats
        });
    } catch (error: any) {
        console.error("[activity-api] Erro ao buscar atividades do bot:", error);
        return NextResponse.json({ error: "Falha ao carregar atividades do bot" }, { status: 500 });
    }
}
