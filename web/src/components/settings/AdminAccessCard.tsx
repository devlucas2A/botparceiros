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
            title="Acesso ao Painel & Comandos"
            description="Cargos autorizados a executar comandos administrativos do bot no Discord."
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
                <p className="text-[11px] text-zinc-500">
                    Quem possui a permissão <code className="text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded font-mono">GERENCIAR SERVIDOR (MANAGE_GUILD)</code> no Discord sempre tem acesso total. Esta lista concede permissão a comandos administrativos extras via chat.
                </p>
            </div>

            <div className="flex justify-end pt-2">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-xl px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-900/20 cursor-pointer"
                >
                    {saving ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
                    ) : (
                        <><Save className="w-4 h-4 mr-2" /> Salvar Cargos</>
                    )}
                </Button>
            </div>
        </SettingsCard>
    );
}
