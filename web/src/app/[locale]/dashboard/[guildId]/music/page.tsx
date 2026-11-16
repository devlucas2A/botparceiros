import { getCurrentUser } from "@/lib/auth-service";
import { redirect } from "next/navigation";
import { MusicDashboardClient } from "./MusicDashboardClient";

interface PageProps {
    params: Promise<{
        guildId: string;
        locale: string;
    }>;
}

export default async function MusicPage({ params }: PageProps) {
    const { guildId, locale } = await params;
    const user = await getCurrentUser();

    if (!user) {
        redirect("/");
    }

    return (
        <div className="w-full max-w-7xl mx-auto p-2 sm:p-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <MusicDashboardClient guildId={guildId} locale={locale} />
        </div>
    );
}
