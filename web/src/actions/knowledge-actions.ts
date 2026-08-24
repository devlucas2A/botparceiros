"use server";

import { z } from "zod";
import { database } from "@shared/services/database";
import { revalidatePath } from "next/cache";
import { verifyUserGuildAccess } from "@/lib/discord-api";

const JSONStringArray = z.string().optional().nullable().transform((str) => {
    if (!str) return [];
    try {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed)) return parsed.map(String);
        return [];
    } catch {
        if (str.includes(',')) return str.split(',').map(s => s.trim()).filter(Boolean);
        return [str.trim()].filter(Boolean);
    }
});

export const KnowledgeTopicSchema = z.object({
    guildId: z.string().min(17),
    topicId: z.string().optional().nullable(),
    topic: z.string().min(2, "O título do tópico deve ter pelo menos 2 caracteres.").max(120),
    content: z.string().min(5, "O conteúdo deve ter pelo menos 5 caracteres.").max(3000, "Limite de 3000 caracteres por tópico."),
    tags: JSONStringArray,
    userId: z.string().optional().nullable()
});

export interface KnowledgeActionState {
    success?: boolean;
    error?: string;
    message?: string;
}

export async function upsertKnowledgeTopicAction(prevState: KnowledgeActionState, formData: FormData): Promise<KnowledgeActionState> {
    try {
        const rawData = Object.fromEntries(formData.entries());
        const parsed = KnowledgeTopicSchema.safeParse(rawData);

        if (!parsed.success) {
            console.error("Zod Validation Failed Knowledge:", parsed.error.format());
            return { success: false, error: "Dados inválidos enviados pelo formulário." };
        }

        const data = parsed.data;

        const hasAccess = await verifyUserGuildAccess(data.guildId);
        if (!hasAccess) return { success: false, error: "Acesso Negado ou Sessão Inválida." };

        if (data.topicId) {
            await database.updateKnowledgeTopic(data.topicId, data.topic, data.content, data.tags);
        } else {
            const newId = `kb_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
            await database.createKnowledgeTopic(newId, data.guildId, data.topic, data.content, data.tags, data.userId || undefined);
        }

        revalidatePath(`/dashboard/${data.guildId}/knowledge`);
        return { success: true, message: data.topicId ? "Tópico atualizado com sucesso!" : "Novo tópico adicionado à base da IA!" };
    } catch (error) {
        console.error("Failed to upsert knowledge topic:", error);
        return { success: false, error: "Erro ao salvar tópico de conhecimento." };
    }
}

export async function deleteKnowledgeTopicAction(topicId: string, guildId: string): Promise<KnowledgeActionState> {
    try {
        if (!guildId || !topicId) return { success: false, error: "IDs obrigatórios ausentes." };

        const hasAccess = await verifyUserGuildAccess(guildId);
        if (!hasAccess) return { success: false, error: "Acesso Negado ou Sessão Inválida." };

        await database.deleteKnowledgeTopic(topicId);
        revalidatePath(`/dashboard/${guildId}/knowledge`);
        return { success: true, message: "Tópico removido com sucesso!" };
    } catch (error) {
        console.error("Failed to delete knowledge topic:", error);
        return { success: false, error: "Erro ao remover tópico de conhecimento." };
    }
}
