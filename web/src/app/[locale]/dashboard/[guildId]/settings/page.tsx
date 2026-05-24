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
    const { guildId } = await params;

    const [config, botStatus, auditLogs] = await Promise.all([
        database.getGuildConfig(guildId),
        getBotGuildStatus(guildId),
        database.getAuditLogs(guildId, 25),
    ]);

    return (
        <div className="space-y-6 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 font-sans">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center shadow-lg shadow-violet-500/10">
                    <Settings className="w-7 h-7 text-violet-400" />
                </div>
                <div>
                    <h1 className="text-3xl md:text-4xl font-serif font-medium text-white">Configurações</h1>
                    <p className="text-sm text-zinc-500 font-medium mt-1">
                        Status do bot, acesso, auditoria e preferências do servidor.
                    </p>
                </div>
            </div>

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

            <AuditLogCard logs={auditLogs} />

            <DangerZoneCard guildId={guildId} botInGuild={botStatus.inGuild} />
        </div>
    );
}
