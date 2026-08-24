"use client";

import { useState, useEffect } from "react";
import { upsertKnowledgeTopicAction, deleteKnowledgeTopicAction } from "@/actions/knowledge-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Plus, Search, Trash2, Edit3, Sparkles, BookOpen, Tag, X, Check, Bot } from "lucide-react";
import { useActionState } from "react";
import { toast } from "sonner";

interface KnowledgeTopic {
    id: string;
    topic: string;
    content: string;
    tags: string[];
    created_at: string | Date;
}

export function KnowledgeBaseForm({
    topics = [],
    guildId,
    userId
}: {
    topics: KnowledgeTopic[];
    guildId: string;
    userId: string;
}) {
    const [search, setSearch] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [editingTopic, setEditingTopic] = useState<KnowledgeTopic | null>(null);

    const [formTopic, setFormTopic] = useState("");
    const [formContent, setFormContent] = useState("");
    const [formTags, setFormTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");

    const [state, formAction] = useActionState(upsertKnowledgeTopicAction, { success: false, error: "", message: "" });
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (state?.success && state.message) {
            toast.success("Base de Conhecimento", {
                description: state.message,
            });
            setIsEditing(false);
        } else if (state?.error) {
            toast.error("Erro ao salvar tópico", {
                description: state.error,
            });
        }
    }, [state]);

    const openCreateModal = () => {
        setEditingTopic(null);
        setFormTopic("");
        setFormContent("");
        setFormTags([]);
        setNewTag("");
        setIsEditing(true);
    };

    const openEditModal = (topic: KnowledgeTopic) => {
        setEditingTopic(topic);
        setFormTopic(topic.topic);
        setFormContent(topic.content);
        setFormTags(topic.tags || []);
        setNewTag("");
        setIsEditing(true);
    };

    const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
        if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
        e.preventDefault();

        const tag = newTag.trim().toLowerCase();
        if (tag && !formTags.includes(tag)) {
            setFormTags([...formTags, tag]);
            setNewTag("");
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setFormTags(formTags.filter(t => t !== tagToRemove));
    };

    const handleDelete = async (topicId: string) => {
        if (!confirm("Tem certeza que deseja excluir este tópico de conhecimento?")) return;
        setDeletingId(topicId);
        const res = await deleteKnowledgeTopicAction(topicId, guildId);
        if (res.success) {
            toast.success("Tópico Excluído!", { description: res.message || "Tópico removido com sucesso." });
        } else {
            toast.error("Erro ao excluir", { description: res.error || "Não foi possível excluir o tópico." });
        }
        setDeletingId(null);
    };

    const filtered = topics.filter(t => {
        const query = search.toLowerCase();
        return (
            t.topic.toLowerCase().includes(query) ||
            t.content.toLowerCase().includes(query) ||
            t.tags?.some(tag => tag.toLowerCase().includes(query))
        );
    });

    return (
        <div className="space-y-6 w-full max-w-5xl mx-auto font-sans">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0A0A0C] p-6 rounded-3xl border border-white/5 shadow-xl">
                <div className="space-y-1">
                    <div className="inline-block px-3 py-1 border border-purple-500/30 bg-purple-500/10 rounded text-[10px] tracking-widest uppercase text-purple-300 font-medium mb-1">
                        RAG • Contexto Próprio da IA
                    </div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-400" />
                        Base de Conhecimento do Servidor
                    </h2>
                    <p className="text-xs text-zinc-400">
                        Ensine horários, regras, links e dados da sua comunidade para a IA do bot responder com precisão.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative grow sm:w-60">
                        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            placeholder="Buscar tópicos ou tags..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-zinc-900/70 border-zinc-800 text-white text-xs h-10 rounded-xl focus:border-purple-500/50"
                        />
                    </div>

                    <Button
                        type="button"
                        onClick={openCreateModal}
                        className="px-4 h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-purple-900/20 shrink-0 cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Adicionar Tópico
                    </Button>
                </div>
            </div>

            {/* Modal / Form de Edição */}
            {isEditing && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-[#0f0f14] border border-purple-500/30 rounded-3xl p-6 md:p-8 max-w-2xl w-full space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Bot className="w-5 h-5 text-purple-400" />
                                {editingTopic ? "Editar Tópico de Conhecimento" : "Novo Tópico para a IA"}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="text-zinc-500 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form action={formAction} className="space-y-5">
                            <input type="hidden" name="guildId" value={guildId} />
                            <input type="hidden" name="userId" value={userId} />
                            {editingTopic && <input type="hidden" name="topicId" value={editingTopic.id} />}
                            <input type="hidden" name="tags" value={JSON.stringify(formTags)} />

                            <div className="space-y-2">
                                <Label htmlFor="topic" className="text-zinc-300 text-xs font-semibold">
                                    Título do Tópico (ex: "Horário de Suporte", "Como se tornar VIP", "IP do Servidor")
                                </Label>
                                <Input
                                    id="topic"
                                    name="topic"
                                    required
                                    placeholder="Ex: Como comprar na loja"
                                    value={formTopic}
                                    onChange={(e) => setFormTopic(e.target.value)}
                                    className="bg-black/60 border-zinc-800 text-white rounded-xl h-11 focus:border-purple-500/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="content" className="text-zinc-300 text-xs font-semibold">
                                    Conteúdo Explicativo (Instruções detalhadas que a IA usará como resposta)
                                </Label>
                                <Textarea
                                    id="content"
                                    name="content"
                                    required
                                    rows={5}
                                    placeholder="Ex: Para comprar em nossa loja, acesse o canal #loja e digite /comprar. Aceitamos PIX e Cartão de Crédito..."
                                    value={formContent}
                                    onChange={(e) => setFormContent(e.target.value)}
                                    className="bg-black/60 border-zinc-800 text-white rounded-xl focus:border-purple-500/50 min-h-[140px] text-sm leading-relaxed"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-zinc-300 text-xs font-semibold">
                                    Tags / Palavras-chave (Opcional, ajuda a IA a identificar o contexto)
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="ex: pix, loja, pagamento"
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        onKeyDown={handleAddTag}
                                        className="bg-black/60 border-zinc-800 text-white rounded-xl h-10 text-xs"
                                    />
                                    <Button
                                        type="button"
                                        onClick={handleAddTag}
                                        className="h-10 px-4 text-xs rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10"
                                    >
                                        Adicionar
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-xl bg-black/30 border border-white/5">
                                    {formTags.length === 0 ? (
                                        <span className="text-zinc-600 text-xs italic">Nenhuma tag adicionada.</span>
                                    ) : (
                                        formTags.map((tag) => (
                                            <div key={tag} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium">
                                                <span>#{tag}</span>
                                                <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-white">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setIsEditing(false)}
                                    className="text-zinc-400 hover:text-white text-xs cursor-pointer"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    className="px-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-lg shadow-purple-900/20 cursor-pointer"
                                >
                                    Salvar Tópico
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* List of Topics */}
            {filtered.length === 0 ? (
                <div className="text-center py-20 px-4 rounded-3xl bg-[#0A0A0C] border border-white/5 space-y-3">
                    <BookOpen className="w-12 h-12 text-zinc-600 mx-auto" />
                    <h4 className="text-white font-semibold text-base">Nenhum tópico cadastrado</h4>
                    <p className="text-zinc-500 text-xs max-w-md mx-auto">
                        Cadastre tópicos e regras do seu servidor. Sempre que um membro fizer uma pergunta no Discord, o CoreBot utilizará esse conhecimento para responder!
                    </p>
                    <Button
                        type="button"
                        onClick={openCreateModal}
                        className="mt-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                    >
                        Criar Primeiro Tópico
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map((topic) => (
                        <div
                            key={topic.id}
                            className="p-6 rounded-3xl bg-[#0A0A0C] border border-white/5 hover:border-purple-500/30 transition-all duration-300 flex flex-col justify-between space-y-4 group"
                        >
                            <div className="space-y-2">
                                <div className="flex justify-between items-start gap-3">
                                    <h4 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                                        {topic.topic}
                                    </h4>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => openEditModal(topic)}
                                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                            title="Editar"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(topic.id)}
                                            disabled={deletingId === topic.id}
                                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                                            title="Excluir"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <p className="text-xs text-zinc-300/90 leading-relaxed whitespace-pre-wrap line-clamp-4">
                                    {topic.content}
                                </p>
                            </div>

                            {topic.tags && topic.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                                    {topic.tags.map(tag => (
                                        <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
