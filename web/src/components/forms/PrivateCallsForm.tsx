'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { updatePrivateCallsConfig } from '@/actions/guild-actions';
import { GuildConfig } from '@shared/services/database';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Phone, Loader2, Save, Hash, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { RoleSelect } from '@/components/discord/RoleSelect';
import { CategorySelect } from '@/components/discord/CategorySelect';

interface PrivateCallsFormProps {
    config: GuildConfig | null;
    guildId: string;
}

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            disabled={pending}
            className="w-full py-6 rounded-xl bg-white text-black hover:bg-zinc-200 text-sm font-bold shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] transition-all"
        >
            {pending ? (
                <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                </span>
            ) : (
                <span className="flex items-center gap-2">
                    <Save className="w-4 h-4" /> Salvar Configurações
                </span>
            )}
        </Button>
    );
}

export function PrivateCallsForm({ config, guildId }: PrivateCallsFormProps) {
    const [enabled, setEnabled] = useState(config?.private_calls_enabled || false);
    const [categoryId, setCategoryId] = useState(config?.private_calls_category_id || '');
    const [managerRole, setManagerRole] = useState(config?.private_calls_manager_role || '');
    const [allowedRoles, setAllowedRoles] = useState<string[]>(
        config?.private_calls_allowed_roles || []
    );

    async function handleSubmit(formData: FormData) {
        formData.set('privateCallsEnabled', enabled.toString());
        formData.set('privateCallsCategoryId', categoryId);
        formData.set('privateCallsManagerRole', managerRole);
        formData.set('privateCallsAllowedRoles', JSON.stringify(allowedRoles));

        const result = await updatePrivateCallsConfig({}, formData);

        if (result?.success) {
            toast.success('Configurações de Calls Privadas salvas!');
        } else if (result?.error) {
            toast.error(result.error);
        }
    }

    return (
        <form action={handleSubmit} className="space-y-6 w-full max-w-4xl mx-auto font-sans">
            <input type="hidden" name="guildId" value={guildId} />

            <div className="grid grid-cols-1 gap-6">
                {/* ════════════════════════════════════════════════════
                    PRIVATE CALLS SYSTEM
                   ════════════════════════════════════════════════════ */}
                <div className="bg-[#0A0A0C] border border-violet-500/30 rounded-3xl p-8 relative overflow-hidden group hover:border-violet-500/50 transition-all duration-500 h-full">
                    {/* Glow Effect */}
                    <div className="absolute inset-0 bg-linear-to-b from-violet-500/10 to-transparent opacity-50 pointer-events-none"></div>

                    <div className="relative z-10 space-y-8">
                        <div className="flex items-center gap-6 mb-8">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center bg-linear-to-br from-violet-500/20 to-fuchsia-500/20 group-hover:scale-105 transition-transform duration-500 shadow-lg shadow-violet-500/10">
                                <Phone className="text-violet-400 w-8 h-8" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-5xl font-serif font-medium text-white">Calls Privadas</h1>
                                <p className="text-sm text-zinc-500 font-medium mt-1">Gerencie canais de voz temporários e privados.</p>
                            </div>
                        </div>

                        <div className="h-px w-full bg-white/5"></div>

                        {/* Enable Toggle */}
                        <div className="flex items-center justify-between p-4 bg-[#13111C] rounded-xl border border-white/5 hover:border-violet-500/30 transition-all duration-300 group/toggle">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center group-hover/toggle:bg-violet-500/20 transition-colors">
                                    <Hash className="w-5 h-5 text-violet-400" />
                                </div>
                                <div>
                                    <Label htmlFor="privateCallsEnabled" className="text-base font-medium text-white pointer-events-none block">Sistema de Calls</Label>
                                    <p className="text-xs text-zinc-400">Ativa ou desativa a criação de calls privadas.</p>
                                </div>
                            </div>
                            <Switch
                                id="privateCallsEnabled"
                                name="privateCallsEnabled"
                                checked={enabled}
                                onCheckedChange={setEnabled}
                                className="data-[state=checked]:bg-violet-500"
                            />
                        </div>

                        {/* Configuration Fields */}
                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <Label className="text-base font-medium text-zinc-300 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-white/5">
                                    <UserCog className="w-4 h-4 text-violet-400" />
                                </div>
                                Configurações Gerais
                            </Label>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Categoria pai */}
                                <div className="space-y-2">
                                    <Label className="text-zinc-400 text-sm">Categoria Pai</Label>
                                    <CategorySelect
                                        guildId={guildId}
                                        value={categoryId}
                                        onChange={setCategoryId}
                                        placeholder="Selecione uma categoria..."
                                    />
                                    <p className="text-[10px] text-zinc-500">Categoria onde os canais serão criados.</p>
                                </div>

                                {/* Cargo gerente */}
                                <div className="space-y-2">
                                    <Label className="text-zinc-400 text-sm">Cargo Gerente</Label>
                                    <RoleSelect
                                        guildId={guildId}
                                        value={managerRole}
                                        onChange={setManagerRole}
                                        placeholder="Selecione um cargo..."
                                    />
                                    <p className="text-[10px] text-zinc-500">Cargo que pode gerenciar qualquer call.</p>
                                </div>

                                {/* Cargos permitidos (multi) */}
                                <div className="col-span-1 md:col-span-2 space-y-2">
                                    <Label className="text-zinc-400 text-sm">Cargos Permitidos</Label>
                                    <RoleSelect
                                        multi
                                        guildId={guildId}
                                        value={allowedRoles}
                                        onChange={setAllowedRoles}
                                        placeholder="Selecione um ou mais cargos..."
                                    />
                                    <p className="text-[10px] text-zinc-500">Deixe vazio para permitir que todos usem.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-4 pb-12">
                <SubmitButton />
            </div>
        </form>
    );
}
