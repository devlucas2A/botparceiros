"use client";

import { updateCoreBotConfig } from "@/actions/guild-actions";
import { useActionState, useState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
    Bot, 
    MessageSquare, 
    Save, 
    Sparkles, 
    Sliders, 
    Shield, 
    Plus, 
    X, 
    Brain, 
    Flame, 
    ArrowRight,
    Wand2,
    CheckCircle2
} from "lucide-react";
import { AiUsageStats } from "../dashboard/AiUsageStats";
import { ChannelSelect } from "@/components/discord/ChannelSelect";
import { RoleSelect } from "@/components/discord/RoleSelect";
import { toast } from "sonner";
import Link from "next/link";

interface GuildConfig {
    guild_id: string;
    ia_enabled: boolean;
    ia_channel_id: string | null;
    ia_system_prompt: string | null;
    ia_temperature?: number;
    ia_triggers?: string[];
    ia_ignored_channels?: string[];
    ia_ignored_roles?: string[];
}

const SYSTEM_PROMPT_PRESETS = [
    {
        name: "Suporte Profissional",
        emoji: "💼",
        prompt: "Você é um assistente virtual profissional e atencioso. Responda de forma clara, educada e objetiva, ajudando os membros com dúvidas, regras e informações sobre o servidor."
    },
    {
        name: "Comunidade Gamer",
        emoji: "🎮",
        prompt: "Você é o mascote do servidor! Seu tom é descontraído, divertido e gamer. Ajude a galera, faça referências legais e mantenha o chat animado e amigável."
    },
    {
        name: "Direto & Objetivo",
        emoji: "⚡",
        prompt: "Você é um assistente ultra-focado e direto. Forneça respostas concisas, precisas e em tópicos sempre que possível, sem introduções ou enrolação."
    },
    {
        name: "Atendente Comercial",
        emoji: "🛍️",
        prompt: "Você é um especialista em vendas e atendimento. Explique produtos, serviços, planos VIP e orientações de compra com empatia e alto poder de persuasão."
    }
];

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            disabled={pending}
            className="w-full py-6 rounded-2xl bg-white text-black hover:bg-zinc-200 text-sm font-bold shadow-[0_0_25px_-5px_rgba(255,255,255,0.3)] transition-all cursor-pointer"
        >
            {pending ? (
                <span className="flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5 animate-spin text-purple-600" /> Salvando Configurações...
                </span>
            ) : (
                <span className="flex items-center justify-center gap-2">
                    <Save className="w-5 h-5" /> Salvar Alterações da IA
                </span>
            )}
        </Button>
    );
}

export function CoreBotForm({ config, guildId, locale = "pt" }: { config: any; guildId: string; locale?: string }) {
    const [state, formAction] = useActionState(updateCoreBotConfig, {});
    const [iaEnabled, setIaEnabled] = useState<boolean>(config?.ia_enabled ?? true);
    const [iaChannel, setIaChannel] = useState<string>(config?.ia_channel_id || '');
    const [prompt, setPrompt] = useState<string>(config?.ia_system_prompt || '');
    const [temperature, setTemperature] = useState<number>(config?.ia_temperature ?? 0.7);
    const [triggers, setTriggers] = useState<string[]>(config?.ia_triggers || ['Core,', 'Oi IA']);
    const [newTrigger, setNewTrigger] = useState<string>('');
    const [ignoredChannels, setIgnoredChannels] = useState<string[]>(config?.ia_ignored_channels || []);
    const [ignoredRoles, setIgnoredRoles] = useState<string[]>(config?.ia_ignored_roles || []);

    useEffect(() => {
        if (state?.success && state.message) {
            toast.success("CoreBot AI Atualizado!", {
                description: state.message || "A personalidade e o comportamento da IA foram salvos com sucesso.",
            });
        } else if (state?.error) {
            toast.error("Erro ao salvar", {
                description: state.error,
            });
        }
    }, [state]);

    const handleAddTrigger = (e: React.KeyboardEvent | React.MouseEvent) => {
        if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
        e.preventDefault();

        const tag = newTrigger.trim();
        if (tag && !triggers.includes(tag)) {
            setTriggers([...triggers, tag]);
            setNewTrigger('');
            toast.info(`Gatilho "${tag}" adicionado.`);
        }
    };

    const handleRemoveTrigger = (triggerToRemove: string) => {
        setTriggers(triggers.filter(t => t !== triggerToRemove));
    };

    const applyPreset = (presetPrompt: string, presetName: string) => {
        setPrompt(presetPrompt);
        toast.success(`Preset "${presetName}" aplicado ao System Prompt!`);
    };

    return (
        <form action={formAction} className="space-y-8 w-full max-w-4xl mx-auto font-sans pb-16">
            <input type="hidden" name="guildId" value={guildId} />

            {/* AI Usage Stats */}
            <AiUsageStats guildId={guildId} />

            {/* ════════════════════════════════════════════════════
                CARD 1: ATIVAÇÃO & CANAL DE ATENDIMENTO
               ════════════════════════════════════════════════════ */}
            <div className="bg-[#0D0D11] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
                <div className="flex items-center gap-4 pb-4 border-b border-white/5">
                    <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-purple-500/20 to-fuchsia-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-lg shadow-black/40 shrink-0">
                        <Bot className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Ativação & Canal Padrão</h2>
                        <p className="text-xs text-zinc-400 mt-0.5">Defina a disponibilidade do assistente e o canal exclusivo de atendimento.</p>
                    </div>
                </div>

                <div className="space-y-5">
                    {/* Switch de Ativação Geral */}
                    <div className="flex items-center justify-between p-5 bg-black/40 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all">
                        <div className="flex items-center gap-4">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iaEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-500'}`}>
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <Label htmlFor="ia-enabled" className="text-sm sm:text-base font-bold text-white cursor-pointer flex items-center gap-2">
                                    Ativar CoreBot AI
                                    {iaEnabled && (
                                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wider font-bold">
                                            Online
                                        </span>
                                    )}
                                </Label>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    O assistente responderá automaticamente menções (@bot) e gatilhos de texto configurados.
                                </p>
                            </div>
                        </div>
                        <Switch
                            id="ia-enabled"
                            name="iaEnabled"
                            checked={iaEnabled}
                            onCheckedChange={setIaEnabled}
                            className="data-[state=checked]:bg-emerald-500"
                        />
                    </div>

                    {/* Canal de Interação Exclusivo */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                            <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                            Canal Exclusivo de Interação (Opcional)
                        </Label>
                        <ChannelSelect
                            guildId={guildId}
                            value={iaChannel}
                            onChange={setIaChannel}
                            placeholder="Selecione um canal específico (ou deixe em branco para todos)..."
                        />
                        <input type="hidden" name="channelId" value={iaChannel} />
                        <p className="text-[11px] text-zinc-500">
                            Se selecionado, a IA só responderá neste canal. Se deixar em branco, ela responderá em qualquer canal autorizado.
                        </p>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════
                CARD 2: PERSONALIDADE & TEMPLATES
               ════════════════════════════════════════════════════ */}
            <div className="bg-[#0D0D11] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
                <div className="flex items-center gap-4 pb-4 border-b border-white/5">
                    <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-black/40 shrink-0">
                        <Wand2 className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Personalidade & Comportamento (System Prompt)</h2>
                        <p className="text-xs text-zinc-400 mt-0.5">Instruções fundamentais que guiam o tom de voz e as respostas da IA.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Presets Rápidos */}
                    <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            Modelos Prontos (Clique para aplicar)
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {SYSTEM_PROMPT_PRESETS.map((preset) => (
                                <button
                                    key={preset.name}
                                    type="button"
                                    onClick={() => applyPreset(preset.prompt, preset.name)}
                                    className="p-2.5 rounded-xl bg-black/40 border border-white/5 hover:border-purple-500/40 hover:bg-purple-500/5 text-left transition-all group cursor-pointer"
                                >
                                    <span className="text-base block mb-1">{preset.emoji}</span>
                                    <span className="text-xs font-semibold text-zinc-300 group-hover:text-white block">
                                        {preset.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Textarea do Prompt */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="prompt" className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                                Instruções Customizadas da Personalidade
                            </Label>
                            <span className="text-[10px] text-zinc-500 font-mono">
                                {prompt.length}/2000 caracteres
                            </span>
                        </div>
                        <Textarea
                            id="prompt"
                            name="systemPrompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            maxLength={2000}
                            placeholder="Ex: Você é um assistente amigável do servidor..."
                            className="bg-black/50 border-white/10 text-white rounded-2xl focus:border-purple-500/50 min-h-[140px] resize-none p-4 text-xs sm:text-sm leading-relaxed"
                        />
                        <p className="text-[11px] text-zinc-500">
                            Dica: Você pode incluir o nome do servidor, links importantes, regras gerais ou estilo de atendimento.
                        </p>
                    </div>

                    {/* Temperatura / Criatividade */}
                    <div className="pt-4 border-t border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="iaTemperature" className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                                    <Sliders className="w-3.5 h-3.5 text-purple-400" />
                                    Criatividade (Temperatura): <span className="text-purple-300 font-mono font-bold text-sm">{temperature}</span>
                                </Label>
                                <p className="text-[11px] text-zinc-500 mt-0.5">
                                    Valores baixos geram respostas mais precisas e diretas; valores altos estimulam respostas mais criativas.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { label: "0.2 • Preciso & Focado", val: 0.2 },
                                { label: "0.7 • Equilibrado (Padrão)", val: 0.7 },
                                { label: "1.0 • Muito Criativo", val: 1.0 },
                            ].map((opt) => (
                                <button
                                    key={opt.val}
                                    type="button"
                                    onClick={() => setTemperature(opt.val)}
                                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                                        temperature === opt.val
                                            ? "bg-purple-600/20 border-purple-500/50 text-purple-200 shadow-md shadow-purple-950/30"
                                            : "bg-black/30 border-white/5 text-zinc-400 hover:text-white"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <input type="hidden" name="iaTemperature" value={temperature} />
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════
                CARD 3: GATILHOS DE ATIVAÇÃO
               ════════════════════════════════════════════════════ */}
            <div className="bg-[#0D0D11] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
                <div className="flex items-center gap-4 pb-4 border-b border-white/5">
                    <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-lg shadow-black/40 shrink-0">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Gatilhos de Mensagem</h2>
                        <p className="text-xs text-zinc-400 mt-0.5">Prefixos e frases que acionam a IA automaticamente sem precisar de menção direta.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Digite um gatilho e pressione Enter (ex: Core,, Oi IA, Ajuda)..."
                            value={newTrigger}
                            onChange={(e) => setNewTrigger(e.target.value)}
                            onKeyDown={handleAddTrigger}
                            className="bg-black/50 border-white/10 text-white rounded-xl text-xs h-10"
                        />
                        <Button
                            type="button"
                            onClick={handleAddTrigger}
                            className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 h-10 shrink-0 cursor-pointer"
                        >
                            <Plus className="w-4 h-4 mr-1" /> Adicionar
                        </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 min-h-[42px] p-3 rounded-2xl bg-black/40 border border-white/5">
                        {triggers.length === 0 ? (
                            <span className="text-zinc-600 text-xs italic">Nenhum gatilho cadastrado. O bot responderá apenas quando mencionado.</span>
                        ) : (
                            triggers.map((tag) => (
                                <div
                                    key={tag}
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium animate-in fade-in"
                                >
                                    <span>{tag}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveTrigger(tag)}
                                        className="hover:text-white cursor-pointer ml-1"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                    <input type="hidden" name="iaTriggers" value={JSON.stringify(triggers)} />
                </div>
            </div>

            {/* ════════════════════════════════════════════════════
                CARD 4: CANAIS & CARGOS IGNORADOS + BASE DE CONHECIMENTO
               ════════════════════════════════════════════════════ */}
            <div className="bg-[#0D0D11] border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
                <div className="flex items-center gap-4 pb-4 border-b border-white/5">
                    <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-rose-500/20 to-orange-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-black/40 shrink-0">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Exceções & Base de Conhecimento</h2>
                        <p className="text-xs text-zinc-400 mt-0.5">Controle onde a IA não pode atuar e conecte seus tópicos de conhecimento.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Canais Ignorados */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                            Canais Ignorados
                        </Label>
                        <ChannelSelect
                            multi
                            guildId={guildId}
                            value={ignoredChannels}
                            onChange={setIgnoredChannels}
                            placeholder="Selecione canais onde a IA não deve responder..."
                        />
                        <input type="hidden" name="iaIgnoredChannels" value={JSON.stringify(ignoredChannels)} />
                        <p className="text-[11px] text-zinc-500">
                            A IA ignorará mensagens mesmo que seja mencionada nestes canais.
                        </p>
                    </div>

                    {/* Cargos Ignorados */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                            Cargos Ignorados
                        </Label>
                        <RoleSelect
                            multi
                            guildId={guildId}
                            value={ignoredRoles}
                            onChange={setIgnoredRoles}
                            placeholder="Selecione cargos que a IA não responderá..."
                        />
                        <input type="hidden" name="iaIgnoredRoles" value={JSON.stringify(ignoredRoles)} />
                        <p className="text-[11px] text-zinc-500">
                            Membros com estes cargos não receberão respostas da IA.
                        </p>
                    </div>
                </div>

                {/* Banner de atalho para Base de Conhecimento */}
                <div className="p-4 rounded-2xl bg-linear-to-r from-purple-500/10 via-fuchsia-500/5 to-transparent border border-purple-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300">
                            <Brain className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-xs sm:text-sm font-bold text-white">Treinar a IA com a Base de Conhecimento</h4>
                            <p className="text-[11px] text-zinc-400">Cadastre perguntas frequentes, regras e tópicos específicos do seu servidor.</p>
                        </div>
                    </div>

                    <Link
                        href={`/${locale}/dashboard/${guildId}/knowledge`}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md shadow-purple-950/40 transition-colors shrink-0"
                    >
                        <span>Abrir Conhecimento</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>

            {/* Botão de Salvar */}
            <div className="pt-2">
                <SubmitButton />
            </div>
        </form>
    );
}
