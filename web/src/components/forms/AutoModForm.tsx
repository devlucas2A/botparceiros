"use client";

import { updateAutoModConfig } from "@/actions/guild-actions";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
    ShieldAlert, 
    Type, 
    ShieldCheck, 
    Sparkles, 
    Save, 
    Link as LinkIcon, 
    MessageSquare, 
    AlertTriangle, 
    X, 
    Bot, 
    Lock, 
    AtSign, 
    Shield, 
    Globe, 
    Radio,
    Sliders,
    Flame
} from "lucide-react";
import { usePlan } from "@/components/PlanGate";
import { RoleSelect } from "@/components/discord/RoleSelect";
import { ChannelSelect } from "@/components/discord/ChannelSelect";
import { toast } from "sonner";

interface AutoModConfig {
    guild_id: string;
    automod_links_enabled: boolean;
    automod_caps_enabled: boolean;
    automod_spam_enabled: boolean;
    prohibited_words: string[];
    automod_channel?: string | null;
    automod_action?: 'delete' | 'timeout' | 'kick' | 'ban';
    automod_timeout_duration?: number;
    automod_bypass_roles?: string[];
    automod_link_whitelist?: string[];
    automod_ignored_channels?: string[];
    automod_max_mentions?: number;
    antiraid_enabled?: boolean;
    antiraid_min_account_age_days?: number;
    antiraid_action?: 'kick' | 'ban' | 'quarantine';
}

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            disabled={pending}
            className="w-full py-6 rounded-2xl bg-white text-black hover:bg-zinc-200 text-sm font-bold shadow-[0_0_25px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_-2px_rgba(255,255,255,0.4)] transition-all cursor-pointer disabled:opacity-50"
        >
            {pending ? (
                <span className="flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4 animate-spin text-zinc-900" /> Salvando configurações...
                </span>
            ) : (
                <span className="flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" /> Salvar Configurações de Segurança
                </span>
            )}
        </Button>
    );
}

export function AutoModForm({ config, guildId }: { config: any, guildId: string, user?: any }) {
    const [state, formAction] = useActionState(updateAutoModConfig, { success: false, error: "", message: "" });
    const { canUse } = usePlan();
    const canUseAI = canUse('automod_ia');

    const [prohibitedWords, setProhibitedWords] = useState<string[]>(config?.prohibited_words || []);
    const [newWord, setNewWord] = useState("");

    const [linkWhitelist, setLinkWhitelist] = useState<string[]>(config?.automod_link_whitelist || []);
    const [newDomain, setNewDomain] = useState("");

    const [ignoredChannels, setIgnoredChannels] = useState<string[]>(config?.automod_ignored_channels || []);
    const [bypassRoles, setBypassRoles] = useState<string[]>(config?.automod_bypass_roles || []);
    const [automodChannel, setAutomodChannel] = useState<string>(config?.automod_channel || '');

    const [linksEnabled, setLinksEnabled] = useState<boolean>(Boolean(config?.automod_links_enabled));
    const [antiRaidEnabled, setAntiRaidEnabled] = useState<boolean>(Boolean(config?.antiraid_enabled));

    const [automodAction, setAutomodAction] = useState<AutoModConfig['automod_action']>(
        config?.automod_action || 'delete'
    );
    const [antiraidAction, setAntiraidAction] = useState<'kick' | 'ban'>(
        config?.antiraid_action || 'kick'
    );

    // Toast de notificação via Sonner
    useEffect(() => {
        if (state?.success && state.message) {
            toast.success("AutoMod Atualizado!", {
                description: state.message,
            });
        } else if (state?.error) {
            toast.error("Erro ao salvar", {
                description: state.error,
            });
        }
    }, [state]);

    const handleAddWord = (e: React.KeyboardEvent | React.MouseEvent) => {
        if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
        e.preventDefault();

        const word = newWord.trim().toLowerCase();
        if (!word) return;

        if (prohibitedWords.includes(word)) {
            toast.warning("Esta palavra já está na lista!");
            return;
        }

        setProhibitedWords([...prohibitedWords, word]);
        setNewWord("");
        toast.info(`Palavra "${word}" adicionada.`);
    };

    const handleRemoveWord = (wordToRemove: string) => {
        setProhibitedWords(prohibitedWords.filter(w => w !== wordToRemove));
        toast.info(`Palavra "${wordToRemove}" removida.`);
    };

    const handleAddDomain = (e: React.KeyboardEvent | React.MouseEvent) => {
        if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
        e.preventDefault();

        let domain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        if (!domain) return;

        if (linkWhitelist.includes(domain)) {
            toast.warning("Este domínio já está na lista!");
            return;
        }

        setLinkWhitelist([...linkWhitelist, domain]);
        setNewDomain("");
        toast.info(`Domínio "${domain}" liberado.`);
    };

    const handleRemoveDomain = (domainToRemove: string) => {
        setLinkWhitelist(linkWhitelist.filter(d => d !== domainToRemove));
        toast.info(`Domínio "${domainToRemove}" removido da whitelist.`);
    };

    return (
        <form action={formAction} className="space-y-8 w-full max-w-4xl mx-auto font-sans pb-16">
            <input type="hidden" name="guildId" value={guildId} />
            <input type="hidden" name="prohibitedWords" value={JSON.stringify(prohibitedWords)} />
            <input type="hidden" name="automodLinkWhitelist" value={JSON.stringify(linkWhitelist)} />
            <input type="hidden" name="automodIgnoredChannels" value={JSON.stringify(ignoredChannels)} />
            <input type="hidden" name="automodBypassRoles" value={JSON.stringify(bypassRoles)} />
            <input type="hidden" name="automodChannelId" value={automodChannel} />

            {/* ════════════════════════════════════════════════════
                HERO BANNER
               ════════════════════════════════════════════════════ */}
            <div className="bg-[#0A0A0C] border border-red-500/20 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-red-500/20 to-orange-500/10 border border-red-500/30 flex items-center justify-center shadow-lg shadow-red-500/10 shrink-0">
                            <ShieldAlert className="text-red-400 w-7 h-7" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">AutoModeração & Segurança</h1>
                            </div>
                            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                                Proteja sua comunidade 24/7 contra spam, links maliciosos, invasões e comportamentos tóxicos.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════
                CARD 1: REGRAS DE FILTRAGEM DE CONTEÚDO
               ════════════════════════════════════════════════════ */}
            <div className="bg-[#0D0D11] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                    <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                        <Flame className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Filtros de Mensagens</h2>
                        <p className="text-xs text-zinc-400">Ative os mecanismos automáticos de inspeção de mensagens em tempo real.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Anti-Links */}
                    <div className="p-5 bg-black/40 rounded-2xl border border-white/5 hover:border-red-500/30 transition-all space-y-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                                    <LinkIcon className="w-5 h-5 text-red-400" />
                                </div>
                                <div>
                                    <Label htmlFor="automod-links" className="text-sm font-semibold text-white block cursor-pointer">
                                        Bloquear Links (Anti-Invite / URLs)
                                    </Label>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        Impede envio de links externos e convites de outros servidores.
                                    </p>
                                </div>
                            </div>
                            <Switch
                                id="automod-links"
                                name="automodLinks"
                                checked={linksEnabled}
                                onCheckedChange={setLinksEnabled}
                                className="data-[state=checked]:bg-red-500"
                            />
                        </div>

                        {/* Whitelist e canais de links (visível quando ativo) */}
                        {linksEnabled && (
                            <div className="pt-4 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                                        <Globe className="w-3.5 h-3.5 text-red-400" /> Domínios Permitidos (Whitelist)
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="ex: youtube.com"
                                            value={newDomain}
                                            onChange={(e) => setNewDomain(e.target.value)}
                                            onKeyDown={handleAddDomain}
                                            className="bg-black/60 border-white/10 text-white rounded-xl h-9 text-xs focus:border-red-500/40"
                                        />
                                        <Button
                                            type="button"
                                            onClick={handleAddDomain}
                                            className="h-9 px-3 text-xs rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 cursor-pointer"
                                        >
                                            Adicionar
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 min-h-[34px] p-2.5 rounded-xl bg-black/50 border border-white/5">
                                        {linkWhitelist.length === 0 ? (
                                            <span className="text-zinc-600 text-xs italic">Nenhum domínio liberado (bloqueia qualquer link).</span>
                                        ) : (
                                            linkWhitelist.map((domain) => (
                                                <div key={domain} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                                                    <span>{domain}</span>
                                                    <button type="button" onClick={() => handleRemoveDomain(domain)} className="hover:text-white cursor-pointer">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                                        <Radio className="w-3.5 h-3.5 text-blue-400" /> Canais Liberados para Links
                                    </Label>
                                    <ChannelSelect
                                        multi
                                        guildId={guildId}
                                        value={ignoredChannels}
                                        onChange={setIgnoredChannels}
                                        placeholder="Selecione canais liberados..."
                                    />
                                    <p className="text-[11px] text-zinc-500">Links não serão bloqueados nestes canais (ex: #divulgação).</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Anti-Caps & Anti-Spam (Grid 2 colunas) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Anti-Caps */}
                        <div className="p-5 bg-black/40 rounded-2xl border border-white/5 hover:border-red-500/30 transition-all flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                                    <Type className="w-5 h-5 text-red-400" />
                                </div>
                                <div>
                                    <Label htmlFor="automod-caps" className="text-sm font-semibold text-white block cursor-pointer">
                                        Anti-Caps Lock & Flood
                                    </Label>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        Bloqueia excesso de maiúsculas (&gt;70%) ou repetições.
                                    </p>
                                </div>
                            </div>
                            <Switch
                                id="automod-caps"
                                name="automodCaps"
                                defaultChecked={config?.automod_caps_enabled}
                                className="data-[state=checked]:bg-red-500 shrink-0"
                            />
                        </div>

                        {/* Anti-Spam */}
                        <div className="p-5 bg-black/40 rounded-2xl border border-white/5 hover:border-red-500/30 transition-all flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                                    <MessageSquare className="w-5 h-5 text-red-400" />
                                </div>
                                <div>
                                    <Label htmlFor="automod-spam" className="text-sm font-semibold text-white block cursor-pointer">
                                        Anti-Spam & Mensagens Rápidas
                                    </Label>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        Impede envio em massa (&gt;5 msgs em 5s).
                                    </p>
                                </div>
                            </div>
                            <Switch
                                id="automod-spam"
                                name="automodSpam"
                                defaultChecked={config?.automod_spam_enabled}
                                className="data-[state=checked]:bg-red-500 shrink-0"
                            />
                        </div>
                    </div>

                    {/* Anti-Mass Mention & AutoMod IA (Grid 2 colunas) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Anti-Mass Mention */}
                        <div className="p-5 bg-black/40 rounded-2xl border border-white/5 hover:border-red-500/30 transition-all flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                                    <AtSign className="w-5 h-5 text-red-400" />
                                </div>
                                <div>
                                    <Label htmlFor="automodMaxMentions" className="text-sm font-semibold text-white block">
                                        Anti-Mass Mention
                                    </Label>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        Bloqueia mensagens com excesso de menções. (0 = desativado)
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <Input
                                    id="automodMaxMentions"
                                    name="automodMaxMentions"
                                    type="number"
                                    min="0"
                                    max="50"
                                    defaultValue={config?.automod_max_mentions || 0}
                                    className="w-16 bg-black/60 border-white/10 text-white rounded-xl h-9 text-center text-sm font-bold focus:border-red-500/40"
                                />
                            </div>
                        </div>

                        {/* AutoMod IA */}
                        <div className="p-5 bg-black/40 rounded-2xl border border-purple-500/20 hover:border-purple-500/40 transition-all flex items-center justify-between gap-4 relative overflow-hidden">
                            <div className="absolute inset-0 bg-linear-to-r from-purple-500/5 to-transparent pointer-events-none"></div>
                            <div className="flex items-center gap-3.5 relative z-10">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                                    <Bot className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="automod-ai" className="text-sm font-semibold text-white block cursor-pointer">
                                            AutoMod com IA
                                        </Label>
                                        <span className="text-[10px] bg-purple-500/20 border border-purple-500/30 text-purple-300 px-1.5 py-0.2 rounded-md font-bold uppercase tracking-wider">
                                            PRO
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        Detecção semântica de toxicidade, racismo e evasão.
                                    </p>
                                </div>
                            </div>
                            <div className="relative z-10 shrink-0">
                                <Switch
                                    id="automod-ai"
                                    name="automodAiEnabled"
                                    defaultChecked={config?.automod_ai_enabled}
                                    disabled={!canUseAI}
                                    className="data-[state=checked]:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </div>

                    {!canUseAI && (
                        <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-amber-300 text-xs">
                            <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                            <span>O módulo de IA do AutoMod requer plano Pro ou superior. Faça upgrade para desbloquear.</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ════════════════════════════════════════════════════
                CARD 2: PROTEÇÃO ANTI-RAID & CONTA NOVA
               ════════════════════════════════════════════════════ */}
            <div className="bg-[#0D0D11] border border-rose-500/20 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Proteção Anti-Raid & Contas Recentes</h2>
                            <p className="text-xs text-zinc-400">Defesa automática contra contas recém-criadas e ataques de bots.</p>
                        </div>
                    </div>
                    <Switch
                        id="antiraid-enabled"
                        name="antiraidEnabled"
                        checked={antiRaidEnabled}
                        onCheckedChange={setAntiRaidEnabled}
                        className="data-[state=checked]:bg-rose-500"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                    <div className="space-y-2">
                        <Label htmlFor="antiraidMinAccountAgeDays" className="text-zinc-300 text-xs font-medium">
                            Idade mínima da conta no Discord (em dias)
                        </Label>
                        <Input
                            id="antiraidMinAccountAgeDays"
                            name="antiraidMinAccountAgeDays"
                            type="number"
                            min="0"
                            max="365"
                            placeholder="Ex: 3"
                            defaultValue={config?.antiraid_min_account_age_days || 0}
                            className="bg-black/50 border-white/10 text-white rounded-xl focus:border-rose-500/40 h-11"
                        />
                        <p className="text-[11px] text-zinc-500">Contas criadas há menos dias que isso serão barradas ao entrar.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="antiraidAction" className="text-zinc-300 text-xs font-medium">
                            Ação contra conta suspeita
                        </Label>
                        <select
                            id="antiraidAction"
                            name="antiraidAction"
                            value={antiraidAction}
                            onChange={(e) => setAntiraidAction(e.target.value as any)}
                            className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-black/50 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/40 cursor-pointer"
                        >
                            <option value="kick">Expulsar (Kick com aviso no privado)</option>
                            <option value="ban">Banir (Ban permanente)</option>
                        </select>
                        <p className="text-[11px] text-zinc-500">Penalidade aplicada assim que o usuário entrar no servidor.</p>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════
                CARD 3: AÇÕES, CASTIGO & EXCEÇÕES (CARGOS BYPASS)
               ════════════════════════════════════════════════════ */}
            <div className="bg-[#0D0D11] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                    <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                        <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Ações ao Detectar Infração</h2>
                        <p className="text-xs text-zinc-400">Configure a punição global e os cargos imunes às regras.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <Label htmlFor="automodAction" className="text-zinc-300 text-xs font-medium">Ação ao violar regra</Label>
                        <select
                            id="automodAction"
                            name="automodAction"
                            value={automodAction}
                            onChange={(e) => setAutomodAction(e.target.value as AutoModConfig['automod_action'])}
                            className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-black/50 text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500/40 cursor-pointer"
                        >
                            <option value="delete">Apenas Apagar Mensagem</option>
                            <option value="timeout">Castigo Temporário (Timeout)</option>
                            <option value="kick">Expulsar do Servidor (Kick)</option>
                            <option value="ban">Banir Permanentemente (Ban)</option>
                        </select>
                    </div>

                    {automodAction === 'timeout' ? (
                        <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                            <Label htmlFor="automodTimeoutDuration" className="text-zinc-300 text-xs font-medium">Duração do Castigo (minutos)</Label>
                            <Input
                                id="automodTimeoutDuration"
                                name="automodTimeoutDuration"
                                type="number"
                                placeholder="Ex: 5"
                                defaultValue={config?.automod_timeout_duration || 5}
                                min="1"
                                className="bg-black/50 border-white/10 text-white rounded-xl focus:border-violet-500/40 h-11"
                            />
                        </div>
                    ) : (
                        <input
                            type="hidden"
                            name="automodTimeoutDuration"
                            value={config?.automod_timeout_duration || 0}
                        />
                    )}

                    <div className="col-span-1 md:col-span-2 space-y-2">
                        <Label className="text-zinc-300 text-xs font-medium">Cargos Imunes (Bypass)</Label>
                        <RoleSelect
                            multi
                            guildId={guildId}
                            value={bypassRoles}
                            onChange={setBypassRoles}
                            placeholder="Selecione os cargos que ignoram todas as regras de AutoMod..."
                        />
                        <p className="text-[11px] text-zinc-500">Membros com estes cargos não sofrerão nenhum bloqueio do AutoMod.</p>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════
                CARD 4: PALAVRAS PROIBIDAS (BLACKLIST)
               ════════════════════════════════════════════════════ */}
            <div className="bg-[#0D0D11] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Palavras Proibidas (Blacklist)</h2>
                        <p className="text-xs text-zinc-400">Mensagens contendo qualquer uma destas palavras serão tratadas de imediato.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex gap-2.5">
                        <Input
                            placeholder="Digite uma palavra ou termo e pressione Enter..."
                            value={newWord}
                            onChange={(e) => setNewWord(e.target.value)}
                            onKeyDown={handleAddWord}
                            className="bg-black/50 border-white/10 text-white rounded-xl focus:border-amber-500/40 h-11 pl-4"
                        />
                        <Button
                            type="button"
                            onClick={handleAddWord}
                            className="h-11 px-5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 cursor-pointer font-medium text-xs"
                        >
                            Adicionar
                        </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 min-h-[56px] p-4 rounded-2xl bg-black/40 border border-white/5">
                        {prohibitedWords.length === 0 ? (
                            <span className="text-zinc-600 text-xs italic self-center">Nenhuma palavra proibida cadastrada até o momento.</span>
                        ) : (
                            prohibitedWords.map((word) => (
                                <div 
                                    key={word} 
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium animate-in fade-in zoom-in duration-200"
                                >
                                    <span>{word}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveWord(word)}
                                        className="text-red-400 hover:text-white transition-colors cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════
                CARD 5: CANAL DE AUDITORIA & LOGS
               ════════════════════════════════════════════════════ */}
            <div className="bg-[#0D0D11] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
                <div className="flex items-center gap-3 pb-2">
                    <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Canal de Logs de Moderação (Opcional)</h2>
                        <p className="text-xs text-zinc-400">Onde o bot enviará os relatórios de mensagens apagadas, punições e bloqueios anti-raid.</p>
                    </div>
                </div>

                <div className="pt-2">
                    <ChannelSelect
                        guildId={guildId}
                        value={automodChannel}
                        onChange={setAutomodChannel}
                        placeholder="Selecione um canal de texto para os registros..."
                    />
                </div>
            </div>

            {/* Submit Action */}
            <div className="pt-4">
                <SubmitButton />
            </div>
        </form>
    );
}

