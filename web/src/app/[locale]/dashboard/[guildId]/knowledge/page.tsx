import { database } from "@shared/services/database";
import { KnowledgeBaseForm } from "@/components/forms/KnowledgeBaseForm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { verifyUserGuildAccess } from "@/lib/discord-api";

interface Props {
    params: Promise<{
        guildId: string;
    }>;
}

export default async function KnowledgeBasePage({ params }: Props) {
    const { guildId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/api/auth/signin");
    }

    const hasAccess = await verifyUserGuildAccess(guildId);
    if (!hasAccess) {
        redirect("/dashboard");
    }

    const topics = await database.getKnowledgeBase(guildId);

    return (
        <div className="space-y-8 flex flex-col items-center w-full max-w-7xl mx-auto px-4">
            <KnowledgeBaseForm
                topics={topics || []}
                guildId={guildId}
                userId={(session.user as any).id || ""}
            />
        </div>
    );
}
