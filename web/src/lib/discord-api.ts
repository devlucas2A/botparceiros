import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

// Cache em memoria por (accessToken, guildId).
// O endpoint /users/@me/guilds do Discord rate-limita agressivamente
// (~3-5 req/min por usuario). Sem cache, multiplos componentes na mesma
// pagina batiam no limit e o 429 era propagado como 403 "Acesso negado".
const ACCESS_TTL_MS = 60_000;
const accessCache = new Map<string, { value: boolean; expiresAt: number }>();
interface DiscordUserGuild {
    id: string;
    permissions: string;
    owner?: boolean;
}

// Cache da resposta crua de /users/@me/guilds (compartilhada entre guildIds).
const guildsListCache = new Map<string, { guilds: DiscordUserGuild[]; expiresAt: number }>();

function pruneCache<T extends { expiresAt: number }>(map: Map<string, T>) {
    const now = Date.now();
    for (const [k, v] of map.entries()) {
        if (v.expiresAt < now) map.delete(k);
    }
}

/**
 * Verifica na API do Discord se a sessão autenticada possui token e tem a permissão MANAGE_GUILD
 * para o guildId fornecido.
 * Isso previne vulnerabilidades do tipo IDOR nas Server Actions e garantem que
 * ações destrutivas ou de configuração apenas passem por Admins.
 *
 * Cache de 60s por (accessToken, guildId). Permissoes nao mudam tao rapido
 * que justifique bater no Discord toda vez.
 */
export async function verifyUserGuildAccess(guildId: string): Promise<boolean> {
    try {
        const session = await getServerSession(authOptions);

        const accessToken: string | undefined = session?.accessToken;

        if (!accessToken) return false;

        const cacheKey = `${accessToken.slice(-12)}:${guildId}`;
        const now = Date.now();

        // 1. Cache da decisao final (mais quente)
        const cached = accessCache.get(cacheKey);
        if (cached && cached.expiresAt > now) return cached.value;

        // 2. Cache da lista de guilds (1 chamada serve pra todos os guildIds)
        const tokenKey = accessToken.slice(-12);
        let guilds: DiscordUserGuild[] | undefined = guildsListCache.get(tokenKey)?.guilds;
        const guildsCacheValid = guildsListCache.get(tokenKey)?.expiresAt ?? 0 > now;
        if (!guilds || !guildsCacheValid) {
            const res = await fetch("https://discord.com/api/users/@me/guilds", {
                headers: { Authorization: `Bearer ${accessToken}` },
                cache: "no-store",
            });

            if (res.status === 429) {
                // Rate-limited: se ja temos resposta cacheada (mesmo expirada), reutiliza.
                console.warn("[Discord API] 429 em /users/@me/guilds — usando cache stale");
                const stale = guildsListCache.get(tokenKey);
                if (stale) {
                    guilds = stale.guilds;
                } else {
                    return false;
                }
            } else if (!res.ok) {
                console.error("[Discord API] Erro:", res.status, res.statusText);
                return false;
            } else {
                guilds = await res.json();
                guildsListCache.set(tokenKey, { guilds: guilds!, expiresAt: now + ACCESS_TTL_MS });
                pruneCache(guildsListCache);
            }
        }

        const targetGuild = guilds!.find((g: DiscordUserGuild) => g.id === guildId);
        if (!targetGuild) {
            accessCache.set(cacheKey, { value: false, expiresAt: now + ACCESS_TTL_MS });
            return false;
        }

        const permissions = BigInt(targetGuild.permissions || 0);
        const MANAGE_GUILD = BigInt(0x20);
        const ADMINISTRATOR = BigInt(0x8);
        const hasAccess =
            targetGuild.owner ||
            (permissions & MANAGE_GUILD) === MANAGE_GUILD ||
            (permissions & ADMINISTRATOR) === ADMINISTRATOR;

        accessCache.set(cacheKey, { value: hasAccess, expiresAt: now + ACCESS_TTL_MS });
        pruneCache(accessCache);
        return hasAccess;
    } catch (error) {
        console.error("verifyUserGuildAccess error:", error);
        return false;
    }
}

/**
 * Permissoes que o bot precisa pra funcionar plenamente.
 * Cada flag e uma chave do PermissionFlagsBits do Discord.js / Discord API.
 * Documentacao: https://discord.com/developers/docs/topics/permissions
 */
const REQUIRED_BOT_PERMISSIONS: Record<string, bigint> = {
    "Gerenciar Canais": 1n << 4n,         // MANAGE_CHANNELS
    "Gerenciar Cargos": 1n << 28n,        // MANAGE_ROLES
    "Gerenciar Mensagens": 1n << 13n,     // MANAGE_MESSAGES
    "Expulsar Membros": 1n << 1n,         // KICK_MEMBERS
    "Banir Membros": 1n << 2n,            // BAN_MEMBERS
    "Castigar Membros": 1n << 40n,        // MODERATE_MEMBERS (timeout)
    "Ver Canais": 1n << 10n,              // VIEW_CHANNEL
    "Enviar Mensagens": 1n << 11n,        // SEND_MESSAGES
    "Embed Links": 1n << 14n,             // EMBED_LINKS
    "Anexar Arquivos": 1n << 15n,         // ATTACH_FILES
    "Conectar (voz)": 1n << 20n,          // CONNECT
    "Falar (voz)": 1n << 21n,             // SPEAK
};

export interface BotGuildStatus {
    inGuild: boolean;
    botUserId: string | null;
    botName: string | null;
    botJoinedAt: string | null;
    missingPermissions: string[];
    hasAdministrator: boolean;
}

/**
 * Verifica se o bot esta no servidor e quais permissoes faltam.
 * Usa bot token (nao user OAuth). Retorna status estruturado para a UI.
 */
export async function getBotGuildStatus(guildId: string): Promise<BotGuildStatus> {
    const botToken = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN || "";
    const empty: BotGuildStatus = {
        inGuild: false,
        botUserId: null,
        botName: null,
        botJoinedAt: null,
        missingPermissions: [],
        hasAdministrator: false,
    };
    if (!botToken) return empty;

    try {
        // 1. Identidade do bot (cacheada pelo Discord lado do servidor, leve)
        const meRes = await fetch("https://discord.com/api/v10/users/@me", {
            headers: { Authorization: `Bot ${botToken}` },
            cache: "no-store",
        });
        if (!meRes.ok) return empty;
        const me = await meRes.json();

        // 2. Member do bot na guild
        const memberRes = await fetch(
            `https://discord.com/api/v10/guilds/${guildId}/members/${me.id}`,
            {
                headers: { Authorization: `Bot ${botToken}` },
                cache: "no-store",
            }
        );
        if (memberRes.status === 404) {
            return { ...empty, botUserId: me.id, botName: me.username };
        }
        if (!memberRes.ok) return { ...empty, botUserId: me.id, botName: me.username };
        const member = await memberRes.json();

        // 3. Calcular permissoes efetivas via roles
        const rolesRes = await fetch(
            `https://discord.com/api/v10/guilds/${guildId}/roles`,
            { headers: { Authorization: `Bot ${botToken}` }, cache: "no-store" }
        );
        const roles = rolesRes.ok ? await rolesRes.json() : [];
        const botRoleIds = new Set<string>(member.roles || []);
        let effectivePerms = 0n;
        for (const role of roles) {
            if (botRoleIds.has(role.id) || role.id === guildId /* @everyone */) {
                try { effectivePerms |= BigInt(role.permissions); } catch { /* ignore */ }
            }
        }

        const ADMIN = 1n << 3n;
        const hasAdmin = (effectivePerms & ADMIN) === ADMIN;
        const missing: string[] = [];
        if (!hasAdmin) {
            for (const [label, bit] of Object.entries(REQUIRED_BOT_PERMISSIONS)) {
                if ((effectivePerms & bit) !== bit) missing.push(label);
            }
        }

        return {
            inGuild: true,
            botUserId: me.id,
            botName: me.username,
            botJoinedAt: member.joined_at || null,
            missingPermissions: missing,
            hasAdministrator: hasAdmin,
        };
    } catch (err) {
        console.error("[getBotGuildStatus] error", err);
        return empty;
    }
}
