"use client";

import { useState } from "react";
import { AlertTriangle, Download, RotateCcw, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { SettingsCard } from "./SettingsCard";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    resetGuildSettings,
    exportGuildConfig,
    botLeaveGuild,
} from "@/actions/settings-actions";

interface Props {
    guildId: string;
    botInGuild: boolean;
}

type DialogKey = null | "reset" | "leave";

export function DangerZoneCard({ guildId, botInGuild }: Props) {
    const router = useRouter();
    const [dialog, setDialog] = useState<DialogKey>(null);
    const [loading, setLoading] = useState<string | null>(null);

    async function handleExport() {
        setLoading("export");
        const res = await exportGuildConfig(guildId);
        if (!res.success || !res.data) {
            toast.error(res.error || "Erro ao exportar.");
            setLoading(null);
            return;
        }
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `coreia-backup-${guildId}-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Backup gerado.");
        setLoading(null);
    }

    async function handleReset() {
        setLoading("reset");
        const res = await resetGuildSettings(guildId);
        if (res.success) {
            toast.success(res.message || "Resetado.");
            router.refresh();
        } else {
            toast.error(res.error || "Erro.");
        }
        setDialog(null);
        setLoading(null);
    }

    async function handleLeave() {
        setLoading("leave");
        const res = await botLeaveGuild(guildId);
        if (res.success) {
            toast.success(res.message || "Bot removido.");
            // Redireciona pro dashboard inicial — o servidor agora está sem bot
            router.push("/dashboard");
        } else {
            toast.error(res.error || "Erro.");
        }
        setDialog(null);
        setLoading(null);
    }

    return (
        <>
            <ConfirmDialog
                isOpen={dialog === "reset"}
                title="Resetar configurações"
                description="Isso zera TODOS os módulos (CoreBot, AutoMod, Welcome, Tickets, Calls etc) para os defaults. Categorias de ticket e dados ativos NÃO são apagados. Esta ação é irreversível — recomendamos exportar o backup antes."
                confirmLabel="Sim, resetar tudo"
                onConfirm={handleReset}
                onCancel={() => setDialog(null)}
            />
            <ConfirmDialog
                isOpen={dialog === "leave"}
                title="Remover bot do servidor"
                description="O bot vai sair imediatamente do servidor. Os comandos pararão de funcionar e as configurações permanecem no banco — basta readicionar o bot para restaurar. Tem certeza?"
                confirmLabel="Sim, remover bot"
                onConfirm={handleLeave}
                onCancel={() => setDialog(null)}
            />

            <SettingsCard
                title="Zona Perigosa"
                description="Ações irreversíveis. Faça backup antes."
                icon={AlertTriangle}
                iconColor="text-red-400"
                accent="red"
            >
                <div className="space-y-3">
                    {/* Export */}
                    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-[#13111C] border border-white/5">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-white">Exportar configurações</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">
                                Baixa um JSON com toda a configuração do servidor para backup.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={handleExport}
                            disabled={loading === "export"}
                            className="border-white/10 hover:bg-white/5 text-white shrink-0"
                        >
                            {loading === "export" ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <><Download className="w-4 h-4 mr-2" /> Exportar</>
                            )}
                        </Button>
                    </div>

                    {/* Reset */}
                    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-red-200">Resetar configurações</h3>
                            <p className="text-xs text-red-300/60 mt-0.5">
                                Zera todos os módulos. Categorias de ticket são mantidas.
                            </p>
                        </div>
                        <Button
                            onClick={() => setDialog("reset")}
                            disabled={loading === "reset"}
                            className="bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 shrink-0"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" /> Resetar
                        </Button>
                    </div>

                    {/* Leave guild */}
                    {botInGuild && (
                        <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium text-red-200">Remover bot do servidor</h3>
                                <p className="text-xs text-red-300/60 mt-0.5">
                                    O bot sai imediatamente. Configurações ficam salvas para se ele voltar.
                                </p>
                            </div>
                            <Button
                                onClick={() => setDialog("leave")}
                                disabled={loading === "leave"}
                                className="bg-red-600 hover:bg-red-700 text-white shrink-0"
                            >
                                <LogOut className="w-4 h-4 mr-2" /> Remover
                            </Button>
                        </div>
                    )}
                </div>
            </SettingsCard>
        </>
    );
}
