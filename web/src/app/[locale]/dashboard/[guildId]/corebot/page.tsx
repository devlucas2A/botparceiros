import { database } from "@shared/services/database";
import { CoreBotForm } from "@/components/forms/CoreBotForm";
import { Bot, Sparkles, Brain } from "lucide-react";
import Link from "next/link";

interface Props {
    params: Promise<{
        guildId: string;
        locale: string;
    }>;
}

export default async function CoreBotPage({ params }: Props) {
    const { guildId, locale } = await params;

    // Ensure config exists or get default
    let config = await database.getGuildConfig(guildId);

    if (!config) {
        config = {
            guild_id: guildId,
            ia_enabled: true,
            ia_channel_id: null,
            ia_system_prompt: null,
            ia_temperature: 0.7,
            ia_triggers: ['Core,', 'Oi IA'],
            ia_ignored_channels: [],
            ia_ignored_roles: [],
            ia_voice_enabled: true,
            automod_channel: null,
            prohibited_words: [],
            vip_category_id: null,
            vip_role_id: null,
            welcome_channel_id: null,
            leave_channel_id: null,
            logs_channel_id: null,
            staff_role_id: null,
            updated_at: new Date()
        };
    }

    return (
        <div className="space-y-8 w-full max-w-4xl mx-auto font-sans animate-in fade-in duration-500">
            {/* Header com Glow */}
            <div className="bg-[#0A0A0C] border border-white/5 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-950/40 shrink-0">
                            <Bot className="w-7 h-7" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold tracking-wider uppercase text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                                    Inteligência Artificial
                                </span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                CoreBot AI & Personalidade
                            </h1>
                            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                                Ajuste o tom de voz, gatilhos de ativação, canais permitidos e integração de IA para o seu servidor.
                            </p>
                        </div>
                    </div>

                    <Link
                        href={`/${locale}/dashboard/${guildId}/knowledge`}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-colors shrink-0"
                    >
                        <Brain className="w-4 h-4 text-purple-400" />
                        Base de Conhecimento
                    </Link>
                </div>
            </div>

            <CoreBotForm config={config} guildId={guildId} locale={locale} />
        </div>
    );
}
