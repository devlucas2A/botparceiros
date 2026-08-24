import { database } from "@shared/services/database";
import { getBotGuildStatus } from "@/lib/discord-api";
import { Settings } from "lucide-react";
import { BotHealthCard } from "@/components/settings/BotHealthCard";
import { AdminAccessCard } from "@/components/settings/AdminAccessCard";
import { AuditLogCard } from "@/components/settings/AuditLogCard";
import { PreferencesCard } from "@/components/settings/PreferencesCard";
import { DangerZoneCard } from "@/components/settings/DangerZoneCard";

interface Props {
    params: Promise<{ guildId: string; locale: string }>;
}

export default async function SettingsPage({ params }: Props) {
    const { guildId, locale } = await params;

    const [config, botStatus, auditLogs] = await Promise.all([
        database.getGuildConfig(guildId),
        getBotGuildStatus(guildId),
        database.getAuditLogs(guildId, 25),
    ]);

    return (
        <div className="space-y-8 w-full max-w-5xl mx-auto pb-16 font-sans animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-[#0A0A0C] border border-white/5 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>

                <div className="relative z-10 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-purple-500/20 to-fuchsia-500/20 border border-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-500/10 shrink-0">
                        <Settings className="w-7 h-7 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Configurações Gerais</h1>
                        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                            Status de conectividade, permissões de administradores, preferências de idioma e manutenção do servidor.
                        </p>
                    </div>
                </div>
            </div>

            {/* Cards */}
            <div className="space-y-6">
                <BotHealthCard botStatus={botStatus} guildId={guildId} />

                <AdminAccessCard
                    guildId={guildId}
                    initialAdminRoles={config?.ia_admin_roles || []}
                />

                <PreferencesCard
                    guildId={guildId}
                    initialLocale={config?.default_locale || "pt"}
                    initialTimezone={config?.timezone || "America/Sao_Paulo"}
                    initialNotifyChannel={config?.bot_notify_channel || ""}
                />

                <AuditLogCard logs={auditLogs} guildId={guildId} locale={locale} />

                <DangerZoneCard guildId={guildId} botInGuild={botStatus.inGuild} />
            </div>
        </div>
    );
}
