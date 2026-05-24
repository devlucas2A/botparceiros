/**
 * Validador deterministico de schemas de comando customizado.
 * Roda apos a geracao por IA (ou ao salvar manualmente) para garantir que:
 * - opcoes referenciadas em actions existem
 * - tipos batem (CHANNEL -> channel_id, ROLE -> role_id, USER -> user_id)
 * - nome do comando respeita as regras do Discord
 *
 * Sem dependencias externas — compativel com o bot (src/) e com o web (web/).
 */

export type OptionType =
    | 'STRING' | 'USER' | 'CHANNEL' | 'ROLE'
    | 'INTEGER' | 'BOOLEAN' | 'NUMBER' | 'ATTACHMENT';

export type ActionType =
    | 'REPLY' | 'AI_REPLY' | 'ADD_ROLE' | 'REMOVE_ROLE'
    | 'SEND_DM' | 'SEND_CHANNEL' | 'SET_NICKNAME'
    | 'RANDOM_IMAGE' | 'KICK' | 'BAN' | 'EXTERNAL_API';

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

const NAME_REGEX = /^[a-z0-9-]{1,32}$/;
const PLACEHOLDER_REGEX = /\{(\w+)\}/g;
const SNOWFLAKE_REGEX = /^\d{17,20}$/;

const VALID_OPTION_TYPES: OptionType[] = [
    'STRING', 'USER', 'CHANNEL', 'ROLE', 'INTEGER', 'BOOLEAN', 'NUMBER', 'ATTACHMENT'
];

const VALID_ACTION_TYPES: ActionType[] = [
    'REPLY', 'AI_REPLY', 'ADD_ROLE', 'REMOVE_ROLE', 'SEND_DM',
    'SEND_CHANNEL', 'SET_NICKNAME', 'RANDOM_IMAGE', 'KICK', 'BAN', 'EXTERNAL_API'
];

/** Mapeia campo "id" da action -> tipo de option esperado. */
const ID_FIELD_TO_OPTION_TYPE: Record<string, OptionType> = {
    channel_id: 'CHANNEL',
    role_id: 'ROLE',
    user_id: 'USER',
};

/** Normaliza nome para kebab-case ASCII. */
export function normalizeName(raw: string): string {
    return (raw || '')
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove diacriticos
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 32);
}

function extractPlaceholders(text: string): string[] {
    if (typeof text !== 'string') return [];
    const out: string[] = [];
    let m: RegExpExecArray | null;
    PLACEHOLDER_REGEX.lastIndex = 0;
    while ((m = PLACEHOLDER_REGEX.exec(text)) !== null) {
        out.push(m[1]);
    }
    return out;
}

export function validateCommandSchema(schema: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (!schema || typeof schema !== 'object') {
        return { valid: false, errors: [{ path: '$', message: 'Schema invalido (nao e um objeto).' }] };
    }

    // --- name ---
    const normalizedName = normalizeName(schema.name);
    if (!normalizedName) {
        errors.push({ path: 'name', message: 'Nome do comando obrigatorio.' });
    } else if (!NAME_REGEX.test(normalizedName)) {
        errors.push({ path: 'name', message: 'Nome deve conter apenas letras minusculas, numeros e hifen (max 32).' });
    }

    // --- description ---
    if (!schema.description || typeof schema.description !== 'string' || !schema.description.trim()) {
        errors.push({ path: 'description', message: 'Descricao do comando obrigatoria.' });
    } else if (schema.description.length > 100) {
        errors.push({ path: 'description', message: 'Descricao deve ter no maximo 100 caracteres (limite do Discord).' });
    }

    // --- options ---
    const options: CommandOption[] = Array.isArray(schema.options) ? schema.options : [];
    const optionMap = new Map<string, OptionType>();
    options.forEach((opt, idx) => {
        const path = `options[${idx}]`;
        if (!opt || typeof opt !== 'object') {
            errors.push({ path, message: 'Opcao invalida.' });
            return;
        }
        if (!opt.name || typeof opt.name !== 'string' || !/^[a-z0-9_-]{1,32}$/.test(opt.name)) {
            errors.push({ path: `${path}.name`, message: 'Nome da opcao deve ser minusculo, sem espacos (a-z, 0-9, _, -).' });
        }
        if (!opt.description || typeof opt.description !== 'string') {
            errors.push({ path: `${path}.description`, message: 'Descricao da opcao obrigatoria.' });
        }
        if (!VALID_OPTION_TYPES.includes(opt.type)) {
            errors.push({ path: `${path}.type`, message: `Tipo invalido. Use um de: ${VALID_OPTION_TYPES.join(', ')}.` });
        } else {
            if (optionMap.has(opt.name)) {
                errors.push({ path: `${path}.name`, message: `Opcao duplicada: "${opt.name}".` });
            }
            optionMap.set(opt.name, opt.type);
        }
    });

    // --- actions ---
    const actions: CommandAction[] = Array.isArray(schema.actions) ? schema.actions : [];
    if (actions.length === 0) {
        errors.push({ path: 'actions', message: 'O comando precisa de pelo menos uma acao.' });
    }

    actions.forEach((action, idx) => {
        const path = `actions[${idx}]`;
        if (!action || typeof action !== 'object') {
            errors.push({ path, message: 'Acao invalida.' });
            return;
        }
        if (!VALID_ACTION_TYPES.includes(action.type)) {
            errors.push({ path: `${path}.type`, message: `Tipo de acao invalido: "${action.type}". Use ${VALID_ACTION_TYPES.join(', ')}.` });
            return;
        }

        validateActionShape(action, idx, errors);
        validatePlaceholders(action, idx, optionMap, errors);
    });

    const valid = errors.length === 0;
    const normalized: CommandSchema | undefined = valid
        ? { ...schema, name: normalizedName, options, actions }
        : undefined;

    return { valid, errors, normalized };
}

/** Garante que cada action tem os campos minimos e que IDs literais sao snowflakes validos. */
function validateActionShape(
    action: CommandAction,
    idx: number,
    errors: ValidationError[]
): void {
    const path = `actions[${idx}]`;

    switch (action.type) {
        case 'REPLY':
            if (!action.content || typeof action.content !== 'string') {
                errors.push({ path: `${path}.content`, message: 'REPLY precisa de "content" (string).' });
            }
            break;

        case 'AI_REPLY':
            if (!action.prompt && !action.content) {
                errors.push({ path: `${path}.prompt`, message: 'AI_REPLY precisa de "prompt" (string).' });
            }
            break;

        case 'SEND_CHANNEL':
            if (!action.channel_id) {
                errors.push({ path: `${path}.channel_id`, message: 'SEND_CHANNEL precisa de "channel_id" (placeholder de option CHANNEL ou ID literal).' });
            }
            if (!action.content || typeof action.content !== 'string' || !action.content.trim()) {
                errors.push({ path: `${path}.content`, message: 'SEND_CHANNEL precisa de "content" (mensagem).' });
            }
            break;

        case 'SEND_DM':
            if (!action.content) {
                errors.push({ path: `${path}.content`, message: 'SEND_DM precisa de "content".' });
            }
            break;

        case 'ADD_ROLE':
        case 'REMOVE_ROLE':
            if (!action.role_id) {
                errors.push({ path: `${path}.role_id`, message: `${action.type} precisa de "role_id".` });
            }
            break;

        case 'SET_NICKNAME':
            if (!action.nickname) {
                errors.push({ path: `${path}.nickname`, message: 'SET_NICKNAME precisa de "nickname".' });
            }
            break;

        case 'KICK':
        case 'BAN':
            if (!action.user_id) {
                errors.push({ path: `${path}.user_id`, message: `${action.type} precisa de "user_id".` });
            }
            break;

        case 'RANDOM_IMAGE':
            if (!action.category) {
                errors.push({ path: `${path}.category`, message: 'RANDOM_IMAGE precisa de "category".' });
            }
            break;
    }

    // Para campos de ID: se vier literal (sem {}), deve ser snowflake.
    for (const field of Object.keys(ID_FIELD_TO_OPTION_TYPE)) {
        const value = action[field];
        if (typeof value === 'string' && value && !value.includes('{')) {
            const cleaned = value.replace(/[<@&#!>]/g, '');
            if (!SNOWFLAKE_REGEX.test(cleaned)) {
                errors.push({
                    path: `${path}.${field}`,
                    message: `Valor "${value}" nao e um placeholder {opcao} nem um ID valido. Use uma option do tipo ${ID_FIELD_TO_OPTION_TYPE[field]}.`
                });
            }
        }
    }
}

/** Confere que cada {placeholder} usado existe em options e que o tipo bate quando relevante. */
function validatePlaceholders(
    action: CommandAction,
    idx: number,
    optionMap: Map<string, OptionType>,
    errors: ValidationError[]
): void {
    const path = `actions[${idx}]`;

    for (const [key, raw] of Object.entries(action)) {
        if (typeof raw !== 'string') continue;
        const placeholders = extractPlaceholders(raw);
        if (placeholders.length === 0) continue;

        for (const ph of placeholders) {
            const optionType = optionMap.get(ph);
            if (!optionType) {
                errors.push({
                    path: `${path}.${key}`,
                    message: `Placeholder "{${ph}}" nao corresponde a nenhuma option declarada. Adicione uma option com name="${ph}" ou remova o placeholder.`
                });
                continue;
            }

            // Se o campo e um *_id, o tipo da option precisa bater.
            const expectedType = ID_FIELD_TO_OPTION_TYPE[key];
            if (expectedType && optionType !== expectedType) {
                errors.push({
                    path: `${path}.${key}`,
                    message: `"{${ph}}" e do tipo ${optionType}, mas ${key} exige uma option do tipo ${expectedType}.`
                });
            }
        }
    }
}

/** Helper para formatar erros em uma string amigavel (pt-BR). */
export function formatValidationErrors(errors: ValidationError[]): string {
    if (errors.length === 0) return '';
    return errors.map(e => `• [${e.path}] ${e.message}`).join('\n');
}
