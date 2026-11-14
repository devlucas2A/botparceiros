/**
 * Validador deterministico de schemas de comando customizado.
 * Roda apos a geracao por IA (ou ao salvar manualmente) para garantir que:
 * - opcoes referenciadas em actions existem
 * - tipos batem (CHANNEL -> channel_id, ROLE -> role_id, USER -> user_id)
 * - nome do comando respeita as regras do Discord
 *
 * Sem dependencias externas — compativel com o bot (src/) e com o web (web/).
 */
export type OptionType = 'STRING' | 'USER' | 'CHANNEL' | 'ROLE' | 'INTEGER' | 'BOOLEAN' | 'NUMBER' | 'ATTACHMENT';
export type ActionType = 'REPLY' | 'AI_REPLY' | 'ADD_ROLE' | 'REMOVE_ROLE' | 'SEND_DM' | 'SEND_CHANNEL' | 'SET_NICKNAME' | 'RANDOM_IMAGE' | 'KICK' | 'BAN' | 'EXTERNAL_API';
export interface CommandOption {
    name: string;
    description: string;
    type: OptionType;
    required?: boolean;
}
export interface CommandAction {
    type: ActionType;
    [key: string]: any;
}
export interface CommandSchema {
    name: string;
    description: string;
    options?: CommandOption[];
    actions: CommandAction[];
}
export interface ValidationError {
    path: string;
    message: string;
}
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    /** Schema normalizado (nome em kebab-case, placeholders limpos). Mesmo conteudo se valid=true. */
    normalized?: CommandSchema;
}
/** Normaliza nome para kebab-case ASCII. */
export declare function normalizeName(raw: string): string;
export declare function validateCommandSchema(schema: any): ValidationResult;
/** Helper para formatar erros em uma string amigavel (pt-BR). */
export declare function formatValidationErrors(errors: ValidationError[]): string;
//# sourceMappingURL=validator.d.ts.map