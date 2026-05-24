"use server";

import { database } from "@shared/services/database";
import { revalidatePath } from "next/cache";
import { verifyUserGuildAccess } from "@/lib/discord-api";

export interface SettingsState {
    success?: boolean;
    error?: string;
    message?: string;
    data?: any;
}

// ─── Bloco 2: Cargos admin ───────────────────────────────────────────────

export async function updateAdminRoles(
    _prev: SettingsState,
    formData: FormData
): Promise<SettingsState> {
    try {
        const guildId = formData.get("guildId") as string;
        const rolesJson = formData.get("adminRoles") as string;
        if (!guildId) return { success: false, error: "guildId invalido." };

        const hasAccess = await verifyUserGuildAccess(guildId);
        if (!hasAccess) return { success: false, error: "Acesso negado." };

        let roles: string[] = [];
        try {
            const parsed = JSON.parse(rolesJson || "[]");
            if (Array.isArray(parsed)) roles = parsed.map(String);
        } catch {
            return { success: false, error: "Lista de cargos invalida." };
        }

        await database.upsertGuildConfig(guildId, {
            ia_admin_roles: roles as any,
        });
        revalidatePath(`/dashboard/${guildId}/settings`);
        return { success: true, message: "Cargos administradores atualizados." };
    } catch (e) {
        console.error("updateAdminRoles:", e);
        return { success: false, error: "Erro ao salvar." };
    }
}

// ─── Bloco 4: Preferencias gerais ────────────────────────────────────────

const VALID_LOCALES = ["pt", "en", "es"] as const;
const VALID_TIMEZONES = [
    "America/Sao_Paulo",
    "America/New_York",
    "America/Los_Angeles",
    "Europe/Lisbon",
    "Europe/London",
    "Europe/Madrid",
    "UTC",
];

export async function updateGuildPreferences(
    _prev: SettingsState,
    formData: FormData
): Promise<SettingsState> {
    try {
        const guildId = formData.get("guildId") as string;
        const locale = String(formData.get("defaultLocale") || "pt");
        const timezone = String(formData.get("timezone") || "America/Sao_Paulo");
        const notifyChannel = String(formData.get("botNotifyChannel") || "");

        if (!guildId) return { success: false, error: "guildId invalido." };

        const hasAccess = await verifyUserGuildAccess(guildId);
        if (!hasAccess) return { success: false, error: "Acesso negado." };

        if (!VALID_LOCALES.includes(locale as any)) {
            return { success: false, error: "Idioma invalido." };
        }
        if (!VALID_TIMEZONES.includes(timezone)) {
            return { success: false, error: "Fuso horario invalido." };
        }

        await database.upsertGuildConfig(guildId, {
            default_locale: locale,
            timezone,
            bot_notify_channel: notifyChannel || null,
        });
        revalidatePath(`/dashboard/${guildId}/settings`);
        return { success: true, message: "Preferencias salvas." };
    } catch (e) {
        console.error("updateGuildPreferences:", e);
        return { success: false, error: "Erro ao salvar preferencias." };
    }
}

// ─── Bloco 5: Danger zone ────────────────────────────────────────────────

/** Reseta os campos editaveis do guild_configs para os defaults (mantem tickets/calls/etc). */
export async function resetGuildSettings(guildId: string): Promise<SettingsState> {
    try {
        const hasAccess = await verifyUserGuildAccess(guildId);
        if (!hasAccess) return { success: false, error: "Acesso negado." };

        await database.upsertGuildConfig(guildId, {
            // CoreIA
            ia_enabled: false,
            ia_channel_id: null,
            ia_system_prompt: null,
            ia_triggers: [],
            ia_temperature: 0.7,
            ia_admin_roles: [],
            ia_ignored_channels: [],
            ia_ignored_roles: [],
            // AutoMod
            automod_channel: null,
            automod_links_enabled: false,
            automod_caps_enabled: false,
            automod_spam_enabled: false,
            automod_ai_enabled: false,
            automod_action: "delete",
            automod_timeout_duration: 0,
            automod_bypass_roles: [],
            prohibited_words: [],
            // Welcome
            welcome_message: null,
            welcome_channel_id: null,
            leave_message: null,
            leave_channel_id: null,
            autorole_id: null,
            // Private Calls
            private_calls_enabled: false,
            private_calls_category_id: null,
            private_calls_manager_role: null,
            private_calls_allowed_roles: [],
            // Whitelabel
            whitelabel_name: null,
            whitelabel_avatar_url: null,
            // Settings
            default_locale: "pt",
            timezone: "America/Sao_Paulo",
            bot_notify_channel: null,
        } as any);

        revalidatePath(`/dashboard/${guildId}`);
        return { success: true, message: "Configuracoes resetadas." };
    } catch (e) {
        console.error("resetGuildSettings:", e);
        return { success: false, error: "Erro ao resetar." };
    }
}

/** Retorna toda a config como JSON para download/backup. */
export async function exportGuildConfig(guildId: string): Promise<SettingsState> {
    try {
        const hasAccess = await verifyUserGuildAccess(guildId);
        if (!hasAccess) return { success: false, error: "Acesso negado." };

        const config = await database.getGuildConfig(guildId);
        const categories = await database.getTicketCategories(guildId);

        const payload = {
            exported_at: new Date().toISOString(),
            guild_id: guildId,
            config,
            ticket_categories: categories,
        };
        return { success: true, data: payload };
    } catch (e) {
        console.error("exportGuildConfig:", e);
        return { success: false, error: "Erro ao exportar." };
    }
}

/** Faz o bot sair da guild. Usa bot token + Discord REST API. */
export async function botLeaveGuild(guildId: string): Promise<SettingsState> {
    try {
        const hasAccess = await verifyUserGuildAccess(guildId);
        if (!hasAccess) return { success: false, error: "Acesso negado." };

        const botToken = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
        if (!botToken) return { success: false, error: "Token do bot nao configurado." };

        const res = await fetch(`https://discord.com/api/v10/users/@me/guilds/${guildId}`, {
            method: "DELETE",
            headers: { Authorization: `Bot ${botToken}` },
        });

        if (!res.ok && res.status !== 204) {
            const txt = await res.text();
            console.error("[botLeaveGuild] Discord API:", res.status, txt);
            return { success: false, error: `Discord rejeitou (${res.status}).` };
        }

        return { success: true, message: "Bot removido do servidor." };
    } catch (e) {
        console.error("botLeaveGuild:", e);
        return { success: false, error: "Erro ao remover bot." };
    }
}
