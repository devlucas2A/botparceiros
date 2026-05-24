"use client";

import { useState } from "react";
import { Users, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SettingsCard } from "./SettingsCard";
import { Button } from "@/components/ui/button";
import { RoleSelect } from "@/components/discord/RoleSelect";
import { updateAdminRoles } from "@/actions/settings-actions";

interface Props {
    guildId: string;
    initialAdminRoles: string[];
}

export function AdminAccessCard({ guildId, initialAdminRoles }: Props) {
    const [roles, setRoles] = useState<string[]>(initialAdminRoles);
    const [saving, setSaving] = useState(false);

    async function handleSave() {
        setSaving(true);
        const fd = new FormData();
        fd.set("guildId", guildId);
        fd.set("adminRoles", JSON.stringify(roles));
        const res = await updateAdminRoles({}, fd);
        if (res.success) toast.success(res.message || "Salvo!");
        else toast.error(res.error || "Erro.");
        setSaving(false);
    }

    return (
        <SettingsCard
            title="Acesso ao Painel"
            description="Cargos que podem usar comandos administrativos do bot no Discord."
            icon={Users}
            iconColor="text-blue-400"
            accent="blue"
        >
            <div className="space-y-2">
                <RoleSelect
                    multi
                    guildId={guildId}
                    value={roles}
                    onChange={setRoles}
                    placeholder="Selecione cargos com acesso admin..."
                />
                <p className="text-[10px] text-zinc-500">
                    Quem tem MANAGE_GUILD no Discord sempre acessa o painel. Esta lista controla apenas comandos admin via Discord.
                </p>
            </div>

            <div className="flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
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
