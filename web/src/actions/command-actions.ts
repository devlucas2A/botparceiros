"use server";

import { customCommandService as service } from "../../../src/bots/custom-commands/service";
import { revalidatePath } from "next/cache";
import { llmService } from "../../../src/shared/services/llm.service";
import { validateCommandSchema, formatValidationErrors } from "../../../src/bots/custom-commands/validator";

export interface CommandState {
    success?: boolean;
    error?: string;
    message?: string;
    schema?: any;
    /** Lista detalhada de erros de validacao (path + mensagem) para a UI destacar. */
    validationErrors?: { path: string; message: string }[];
}

export async function generateCommandAction(prompt: string, context: string): Promise<CommandState> {
    try {
        // Ate 2 tentativas: se a IA gerar schema invalido, devolve os erros para ela corrigir.
        let schema = await llmService.generateCommandSchema(prompt, context);
        if (!schema) {
            return { success: false, error: "Falha ao gerar comando. Tente novamente." };
        }

        let result = validateCommandSchema(schema);

        if (!result.valid) {
            console.warn("[generateCommandAction] Schema invalido na 1a tentativa:", result.errors);
            const retryPrompt =
                `${prompt}\n\n[RETRY] O schema anterior tinha estes problemas:\n${formatValidationErrors(result.errors)}\n` +
                `Corrija e retorne APENAS o JSON valido.`;
            const retried = await llmService.generateCommandSchema(retryPrompt, context);
            if (retried) {
                schema = retried;
                result = validateCommandSchema(retried);
            }
        }

        if (!result.valid) {
            return {
                success: false,
                error: "A IA gerou um comando inválido. Ajuste a descrição e tente novamente.",
                validationErrors: result.errors,
                schema, // devolve mesmo invalido para a UI exibir o que a IA produziu
            };
        }

        return { success: true, schema: result.normalized };
    } catch (error) {
        console.error("Generate Command Error:", error);
        return { success: false, error: "Erro interno na IA." };
    }
}

export async function createCustomCommandAction(prevState: CommandState, formData: FormData): Promise<CommandState> {
    try {
        const guildId = formData.get("guildId") as string;
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const response = formData.get("response") as string;
        const actionsJson = formData.get("actions") as string;
        const optionsJson = formData.get("options") as string;
        const userId = formData.get("userId") as string;

        if (!guildId || !name || !actionsJson) {
            return { success: false, error: "Dados inválidos." };
        }

        let actions: any[];
        let options: any[];
        try {
            actions = JSON.parse(actionsJson);
            options = optionsJson ? JSON.parse(optionsJson) : [];
        } catch {
            return { success: false, error: "JSON malformado em actions/options." };
        }

        // Validacao deterministica antes de salvar.
        const result = validateCommandSchema({ name, description, options, actions });
        if (!result.valid) {
            return {
                success: false,
                error: "Comando inválido. Corrija os erros abaixo:",
                validationErrors: result.errors,
            };
        }

        const normalized = result.normalized!;

        await service.create(
            guildId,
            normalized.name,
            normalized.description,
            response || null,
            normalized.actions,
            userId,
            normalized.options || []
        );

        revalidatePath(`/dashboard/${guildId}/commands`);
        return { success: true, message: "Comando criado com sucesso!" };
    } catch (error) {
        console.error("Create Command Error:", error);
        return { success: false, error: "Erro ao criar comando." };
    }
}

export async function deleteCustomCommandAction(commandId: string, guildId: string): Promise<CommandState> {
    try {
        await service.deleteWithGuild(commandId, guildId);
        revalidatePath(`/dashboard/${guildId}/commands`);
        return { success: true, message: "Comando removido!" };
    } catch (error) {
        console.error("Delete Command Error:", error);
        return { success: false, error: "Erro ao remover comando." };
    }
}

export async function toggleCustomCommandAction(commandId: string, enabled: boolean, guildId: string): Promise<CommandState> {
    try {
        await service.toggle(commandId, enabled);
        revalidatePath(`/dashboard/${guildId}/commands`);
        return { success: true, message: `Comando ${enabled ? 'ativado' : 'desativado'}!` };
    } catch (error) {
        console.error("Toggle Command Error:", error);
        return { success: false, error: "Erro ao alterar status." };
    }
}
