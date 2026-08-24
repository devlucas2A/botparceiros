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
                <div className="space-y-3.5">
                    {/* Export */}
                    <div className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-black/40 border border-white/5">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-white">Exportar Configurações (Backup)</h3>
                            <p className="text-xs text-zinc-400 mt-0.5">
                                Baixa um arquivo JSON completo com todas as configurações do servidor para cópia de segurança.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={handleExport}
                            disabled={loading === "export"}
                            className="rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold shrink-0 cursor-pointer"
                        >
                            {loading === "export" ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <><Download className="w-4 h-4 mr-1.5" /> Exportar JSON</>
                            )}
                        </Button>
                    </div>

                    {/* Reset */}
                    <div className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-rose-200">Redefinir Todas as Configurações</h3>
                            <p className="text-xs text-rose-300/70 mt-0.5">
                                Zera todos os módulos para os valores padrão de fábrica. Categorias de tickets são preservadas.
                            </p>
                        </div>
                        <Button
                            onClick={() => setDialog("reset")}
                            disabled={loading === "reset"}
                            className="rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 text-xs font-semibold shrink-0 cursor-pointer"
                        >
                            <RotateCcw className="w-4 h-4 mr-1.5" /> Redefinir
                        </Button>
                    </div>

                    {/* Leave guild */}
                    {botInGuild && (
                        <div className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-rose-200">Desconectar Bot do Servidor</h3>
                                <p className="text-xs text-rose-300/70 mt-0.5">
                                    O bot sairá imediatamente do servidor Discord. Os dados continuam salvos caso deseje adicioná-lo de volta.
                                </p>
                            </div>
                            <Button
                                onClick={() => setDialog("leave")}
                                disabled={loading === "leave"}
                                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 shadow-lg shadow-rose-900/30 cursor-pointer"
                            >
                                <LogOut className="w-4 h-4 mr-1.5" /> Remover Bot
                            </Button>
                        </div>
                    )}
                </div>
            </SettingsCard>
        </>
    );
}
