import { Guild } from 'discord.js';
interface ServerChannel {
    name: string;
    type: 'text' | 'voice' | 'stage' | 'forum' | 'announcement';
    description?: string;
    user_limit?: number;
    is_private?: boolean;
    is_readonly?: boolean;
    slowmode?: number;
    nsfw?: boolean;
    allowed_roles?: string[];
    writable_roles?: string[];
    initial_message?: string;
}
interface ServerCategory {
    name: string;
    channels: ServerChannel[];
}
interface ServerRole {
    name: string;
    color: string;
    permissions: string[];
    hoist?: boolean;
    mentionable?: boolean;
}
interface ServerSchema {
    roles: ServerRole[];
    categories: ServerCategory[];
}
/** Resultado da construcao — IDs criados, para suporte a undo. */
export interface BuildResult {
    role_ids: string[];
    category_ids: string[];
    channel_ids: string[];
    errors: string[];
}
/** Estado atual do servidor — passado a IA para evitar duplicatas. */
export interface ExistingServerState {
    roles: string[];
    categories: string[];
    channels: string[];
}
/** Opcoes do gerador. */
export interface BuilderOptions {
    estilo?: 'gaming' | 'comunidade' | 'rpg' | 'educacional' | 'empresa' | 'outro';
    tamanho?: 'enxuto' | 'medio' | 'completo';
    idioma?: 'pt' | 'en' | 'es';
}
/** Evento de progresso estruturado durante a construcao. */
export interface BuildProgress {
    phase: 'roles' | 'categories' | 'channels' | 'messages' | 'done';
    current: number;
    total: number;
    label: string;
}
interface AdjustmentAction {
    type: 'create_category' | 'create_channel' | 'rename_category' | 'rename_channel' | 'delete_category' | 'delete_channel' | 'create_role' | 'set_user_limit';
    name?: string;
    category_name?: string;
    channel_type?: 'text' | 'voice' | 'stage' | 'forum' | 'announcement';
    old_name?: string;
    new_name?: string;
    color?: string;
    user_limit?: number;
}
interface AdjustmentSchema {
    actions: AdjustmentAction[];
    message: string;
}
export declare class ServerBuilderService {
    /**
     * Mapeia tipo de canal do schema para ChannelType do Discord.js
     */
    private getChannelType;
    /**
     * Pós-processador: Garante que todos os nomes sigam o padrão decorativo
     */
    private postProcessSchema;
    /**
     * Passo 1: Gerar o plano JSON com a LLM.
     * Aceita opcoes estruturadas e contexto do servidor existente para
     * que a IA evite duplicatas e personalize tamanho/estilo/idioma.
     */
    generateServerPlan(theme: string, options?: BuilderOptions, existingState?: ExistingServerState): Promise<ServerSchema | null>;
    /** Coleta o estado atual do servidor para passar a IA na Fase 2 (awareness). */
    collectExistingState(guild: Guild): ExistingServerState;
    /**
     * Passo 2: Construir o servidor com todas as features.
     *
     * Paridade com a rota web /api/server-builder/apply:
     * - is_readonly + writable_roles (somente staff posta)
     * - is_private + allowed_roles (visivel apenas para alguns cargos)
     * - Fallback Community: se servidor nao e Community, converte
     *   Stage/Forum/Announcement em Voice/Text automaticamente
     * - Mensagens iniciais postadas em canais especiais (regras/portal/faq)
     * - Retorna BuildResult com os IDs criados (suporte a undo)
     */
    buildServer(guild: Guild, schema: ServerSchema, progressCallback?: (progress: BuildProgress) => void): Promise<BuildResult>;
    /** Constroi permission overwrites para is_private e is_readonly. */
    private buildChannelPermissions;
    /**
     * Gerar plano de ajustes
     */
    generateAdjustmentPlan(userRequest: string): Promise<AdjustmentSchema | null>;
    /**
     * Aplicar ajustes no servidor
     */
    applyAdjustments(guild: Guild, schema: AdjustmentSchema, progressCallback?: (msg: string) => void): Promise<void>;
}
export declare const serverBuilder: ServerBuilderService;
export {};
//# sourceMappingURL=server-builder.service.d.ts.map