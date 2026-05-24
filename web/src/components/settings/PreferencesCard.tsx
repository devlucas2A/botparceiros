"use client";

import { useState } from "react";
import { Globe, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SettingsCard } from "./SettingsCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChannelSelect } from "@/components/discord/ChannelSelect";
import { updateGuildPreferences } from "@/actions/settings-actions";

interface Props {
    guildId: string;
    initialLocale: string;
    initialTimezone: string;
    initialNotifyChannel: string;
}

const LOCALES = [
    { value: "pt", label: "Português (BR)" },
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
];

const TIMEZONES = [
    { value: "America/Sao_Paulo", label: "São Paulo (UTC-3)" },
    { value: "America/New_York", label: "New York (UTC-5)" },
    { value: "America/Los_Angeles", label: "Los Angeles (UTC-8)" },
    { value: "Europe/Lisbon", label: "Lisboa (UTC+0)" },
    { value: "Europe/London", label: "London (UTC+0)" },
    { value: "Europe/Madrid", label: "Madrid (UTC+1)" },
    { value: "UTC", label: "UTC" },
];

export function PreferencesCard({
    guildId,
    initialLocale,
    initialTimezone,
    initialNotifyChannel,
}: Props) {
    const [locale, setLocale] = useState(initialLocale);
    const [timezone, setTimezone] = useState(initialTimezone);
    const [notifyChannel, setNotifyChannel] = useState(initialNotifyChannel);
    const [saving, setSaving] = useState(false);

    async function handleSave() {
        setSaving(true);
        const fd = new FormData();
        fd.set("guildId", guildId);
        fd.set("defaultLocale", locale);
        fd.set("timezone", timezone);
        fd.set("botNotifyChannel", notifyChannel);
        const res = await updateGuildPreferences({}, fd);
        if (res.success) toast.success(res.message || "Salvo!");
        else toast.error(res.error || "Erro.");
        setSaving(false);
    }

    return (
        <SettingsCard
            title="Preferências do Servidor"
            description="Idioma, fuso horário e canal para notificações do bot."
            icon={Globe}
            iconColor="text-violet-400"
            accent="violet"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-zinc-400 text-sm">Idioma padrão</Label>
                    <select
                        value={locale}
                        onChange={e => setLocale(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-white/10 bg-black/40 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500/50"
                    >
                        {LOCALES.map(l => (
                            <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <Label className="text-zinc-400 text-sm">Fuso horário</Label>
                    <select
                        value={timezone}
                        onChange={e => setTimezone(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-white/10 bg-black/40 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500/50"
                    >
                        {TIMEZONES.map(tz => (
                            <option key={tz.value} value={tz.value}>{tz.label}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label className="text-zinc-400 text-sm">Canal de notificações do bot</Label>
                    <ChannelSelect
                        guildId={guildId}
                        value={notifyChannel}
                        onChange={setNotifyChannel}
                        placeholder="Selecione um canal (opcional)..."
                    />
                    <p className="text-[10px] text-zinc-500">
                        Onde o bot manda avisos importantes (atualizações, problemas). Deixe vazio para desabilitar.
                    </p>
                </div>
            </div>

            <div className="flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-violet-500 hover:bg-violet-600 text-white"
                >
                    {saving ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
                    ) : (
                        <><Save className="w-4 h-4 mr-2" /> Salvar</>
                    )}
                </Button>
            </div>
        </SettingsCard>
    );
}
