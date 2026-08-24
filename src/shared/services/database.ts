/**
* ╔═══════════════════════════════════════════════════════════════════════════╗
* ║                     COREBOT DATABASE SERVICE                             ║
* ║                   PostgreSQL Connection + Queries                         ║
* ╚═══════════════════════════════════════════════════════════════════════════╝
*/

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from './config.service';
import { logger } from './logger.service';
import { redisService } from './redis.service';

// ═══════════════════════════════════════════════════════════════════════════
// 📊 TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface GuildConfig extends QueryResultRow {
    guild_id: string;
    automod_channel: string | null;
    prohibited_words: string[];
    vip_category_id: string | null;
    vip_role_id: string | null;
    welcome_channel_id: string | null;
    leave_channel_id: string | null;
    logs_channel_id: string | null;
    staff_role_id: string | null;

    // Configurações Welcome/Leave
    welcome_message?: string | null;
    leave_message?: string | null;
    autorole_id?: string | null;
    welcome_font_changes_count?: number;

    // Configurações AutoMod
    automod_links_enabled?: boolean;
    automod_caps_enabled?: boolean;
    automod_spam_enabled?: boolean;
    automod_action?: 'delete' | 'timeout' | 'kick' | 'ban';
    automod_timeout_duration?: number;
    automod_log_channel?: string | null;
    automod_bypass_roles?: string[];
    automod_ai_enabled?: boolean;
    automod_link_whitelist?: string[];
    automod_ignored_channels?: string[];
    automod_max_mentions?: number;

    // Configurações Anti-Raid
    antiraid_enabled?: boolean;
    antiraid_min_account_age_days?: number;
    antiraid_action?: 'kick' | 'ban' | 'quarantine';

    // Configurações CoreIA (SaaS)
    ia_enabled?: boolean;
    ia_channel_id?: string | null;
    ia_system_prompt?: string | null;
    ia_triggers?: string[] | null;
    ia_admin_roles?: string[];
    ia_voice_enabled?: boolean;
    ia_temperature?: number;
    ia_ignored_channels?: string[];
    ia_ignored_roles?: string[];

    // Configurações Private Calls
    private_calls_enabled?: boolean;
    private_calls_category_id?: string | null;
    private_calls_allowed_roles?: string[];
    private_calls_manager_role?: string | null;

    // Configurações Ticket Panel
    ticket_panel_title?: string | null;
    ticket_panel_description?: string | null;
    ticket_panel_banner_url?: string | null;
    ticket_panel_color?: string | null;
    ticket_panel_button_text?: string | null;
    ticket_panel_button_emoji?: string | null;
    ticket_panel_footer?: string | null;
    ticket_logs_channel_id?: string | null;

    // Configurações Whitelabel
    whitelabel_name?: string | null;
    whitelabel_avatar_url?: string | null;

    // Configurações gerais (settings page)
    default_locale?: string | null;
    timezone?: string | null;
    bot_notify_channel?: string | null;

    updated_at: Date;
}

export interface AuditLog {
    id: number;
    guild_id: string;
    user_id: string;
    action: string;
    target_id: string | null;
    details: Record<string, unknown>;
    created_at: Date;
}

export interface Subscription extends QueryResultRow {
    id: string; // preapproval_id from Mercado Pago
    user_id: string;
    plan: 'starter' | 'pro' | 'ultimate';
    status: 'pending' | 'authorized' | 'paused' | 'cancelled';
    next_payment: Date;
    created_at: Date;
    updated_at: Date;
}

export interface Payment extends QueryResultRow {
    id: number; // payment_id from Mercado Pago
    subscription_id: string;
    amount: number;
    status: 'approved' | 'rejected' | 'pending' | 'refunded';
    created_at: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔗 CONNECTION POOL
// ═══════════════════════════════════════════════════════════════════════════

let pool: Pool | null = null;

export function getPool(): Pool {
    if (!pool) {
        const databaseUrl = config.getOptional('DATABASE_URL');

        if (!databaseUrl) {
            throw new Error('DATABASE_URL não configurada. Database desabilitado.');
        }

        const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');

        pool = new Pool({
            connectionString: databaseUrl,
            max: 5, // Limite conservador para evitar erros no Railway/Dev
            idleTimeoutMillis: 10000, // Fecha conexões ociosas após 10s
            connectionTimeoutMillis: 10000, // Timeout de conexão de 10s
            allowExitOnIdle: false,
            ssl: isLocal ? false : {
                rejectUnauthorized: false
            }
        });

        pool.on('error', (err) => {
            logger.error('Erro no pool do PostgreSQL:', { error: err.message });
        });

        pool.on('connect', () => {
            logger.info('📦 Nova conexão PostgreSQL estabelecida');
        });
    }
    return pool;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔧 QUERY HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export async function query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
): Promise<QueryResult<T>> {
    const pool = getPool();
    const start = Date.now();

    try {
        const result = await pool.query<T>(text, params);
        const duration = Date.now() - start;

        if (duration > 1000) {
            logger.warn(`Query lenta (${duration}ms): ${text.substring(0, 50)}...`);
        }

        return result;
    } catch (error: any) {
        logger.error(`Erro na query: `, { error: error.message || error });
        throw error;
    }
}

export async function getClient(): Promise<PoolClient> {
    const pool = getPool();
    return pool.connect();
}

interface TimeResult extends QueryResultRow {
    now: Date;
}

export async function testConnection(): Promise<boolean> {
    try {
        const result = await query<TimeResult>('SELECT NOW()');
        logger.info(`✅ Conexão PostgreSQL OK: ${result.rows[0]?.now}`);
        return true;
    } catch (error: any) {
        logger.error(`❌ Falha na conexão PostgreSQL: `, { error: error.message || error });
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📋 SCHEMA INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

const SCHEMA_SQL = `
-- Guild Configs Table
CREATE TABLE IF NOT EXISTS guild_configs (
    guild_id VARCHAR(20) PRIMARY KEY,
    automod_channel VARCHAR(20),
    prohibited_words TEXT[] DEFAULT '{}',
    automod_action VARCHAR(20) DEFAULT 'delete',
    automod_timeout_duration INTEGER DEFAULT 0,
    automod_log_channel VARCHAR(20),
    automod_bypass_roles TEXT[] DEFAULT '{}',
    automod_links_enabled BOOLEAN DEFAULT false,
    automod_caps_enabled BOOLEAN DEFAULT false,
    automod_spam_enabled BOOLEAN DEFAULT false,
    vip_category_id VARCHAR(20),
    vip_role_id VARCHAR(20),
    welcome_channel_id VARCHAR(20),
    leave_channel_id VARCHAR(20),
    logs_channel_id VARCHAR(20),
    staff_role_id VARCHAR(20),
    welcome_message TEXT,
    leave_message TEXT,
    autorole_id VARCHAR(20),
    welcome_font VARCHAR(50),
    welcome_banner_url VARCHAR(255),
    ia_enabled BOOLEAN DEFAULT true,
    ia_channel_id VARCHAR(20),
    ia_system_prompt TEXT DEFAULT 'Você é a IA da CoreIA. Personalidade Única.',
    ia_admin_roles TEXT[] DEFAULT '{}',
    ia_voice_enabled BOOLEAN DEFAULT true,
    ia_temperature DECIMAL(3, 2) DEFAULT 0.7,
    ia_ignored_channels TEXT[] DEFAULT '{}',
    ia_ignored_roles TEXT[] DEFAULT '{}',
    private_calls_enabled BOOLEAN DEFAULT false,
    private_calls_category_id VARCHAR(20),
    private_calls_allowed_roles TEXT[] DEFAULT '{}',
    private_calls_manager_role VARCHAR(20),
    ticket_panel_title VARCHAR(255),
    ticket_panel_description TEXT,
    ticket_panel_banner_url VARCHAR(255),
    ticket_panel_color VARCHAR(20),
    ticket_panel_button_text VARCHAR(50),
    ticket_panel_button_emoji VARCHAR(50),
    ticket_panel_footer VARCHAR(255),
    ticket_logs_channel_id VARCHAR(20),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit Log Table
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    action VARCHAR(50) NOT NULL,
    target_id VARCHAR(20),
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_guild ON audit_log(guild_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);

-- Private Calls Table (Restored)
CREATE TABLE IF NOT EXISTS private_calls (
    channel_id VARCHAR(20) PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    owner_id VARCHAR(20) NOT NULL,
    is_open BOOLEAN DEFAULT true,
    member_limit INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_private_calls_guild ON private_calls(guild_id);
CREATE INDEX IF NOT EXISTS idx_private_calls_owner ON private_calls(owner_id);

-- Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    plan VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    next_payment TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id BIGINT PRIMARY KEY,
    subscription_id VARCHAR(50) REFERENCES subscriptions(id),
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_subscription ON payments(subscription_id);

-- Tickets Table (Restored)
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    channel_id VARCHAR(20),
    user_id VARCHAR(20) NOT NULL,
    category VARCHAR(50),
    status VARCHAR(20) DEFAULT 'open',
    claimed_by VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    closed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tickets_guild ON tickets(guild_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_channel ON tickets(channel_id);

-- Ticket Transcripts Table (HTML & AI Summary)
CREATE TABLE IF NOT EXISTS ticket_transcripts (
    id VARCHAR(64) PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    ticket_channel_id VARCHAR(20),
    ticket_name VARCHAR(100) NOT NULL,
    user_id VARCHAR(20),
    closed_by_id VARCHAR(20),
    category VARCHAR(100),
    summary TEXT,
    transcript_html TEXT NOT NULL,
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_transcripts_guild ON ticket_transcripts(guild_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transcripts_created ON ticket_transcripts(created_at);

-- Ticket Categories Table (New)
CREATE TABLE IF NOT EXISTS ticket_categories (
    id VARCHAR(50) PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    emoji VARCHAR(50),
    color VARCHAR(10) DEFAULT '#7B68EE',
    ticket_channel_category_id VARCHAR(20),
    support_role_id VARCHAR(20),
    welcome_title VARCHAR(255),
    welcome_description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_ticket_categories_guild ON ticket_categories(guild_id);

-- Custom Commands Table
CREATE TABLE IF NOT EXISTS custom_commands (
    id VARCHAR(50) PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    response TEXT,
    actions JSONB DEFAULT '[]',
    options JSONB DEFAULT '[]',
    enabled BOOLEAN DEFAULT true,
    created_by VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(guild_id, name)
);

CREATE INDEX IF NOT EXISTS idx_custom_commands_guild ON custom_commands(guild_id);

-- Guild Analytics (Daily Metrics)
CREATE TABLE IF NOT EXISTS guild_analytics (
    guild_id VARCHAR(20) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    messages_count INTEGER DEFAULT 0,
    members_joined INTEGER DEFAULT 0,
    members_left INTEGER DEFAULT 0,
    tickets_opened INTEGER DEFAULT 0,
    tickets_closed INTEGER DEFAULT 0,
    automod_actions INTEGER DEFAULT 0,
    commands_used INTEGER DEFAULT 0,
    ai_responses INTEGER DEFAULT 0,
    guild_joins INTEGER DEFAULT 0,
    guild_leaves INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id, date)
);

CREATE INDEX IF NOT EXISTS idx_guild_analytics_guild ON guild_analytics(guild_id);

-- Guild Knowledge Base (RAG / FAQs customizados para IA)
CREATE TABLE IF NOT EXISTS guild_knowledge_base (
    id VARCHAR(50) PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    topic VARCHAR(120) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    created_by VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guild_knowledge_guild ON guild_knowledge_base(guild_id);
 
-- Partnerships
CREATE TABLE IF NOT EXISTS partnerships (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    partner_guild_id VARCHAR(20) NOT NULL,
    partner_guild_name VARCHAR(100) NOT NULL,
    partner_invite VARCHAR(100),
    partner_description TEXT,
    channel_id VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    created_by VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(guild_id, partner_guild_id)
);

CREATE INDEX IF NOT EXISTS idx_partnerships_guild ON partnerships(guild_id);


-- AI Usage Tracking (Daily per User per Guild)
CREATE TABLE IF NOT EXISTS ai_usage (
    user_id VARCHAR(20) NOT NULL,
    guild_id VARCHAR(20) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    count INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, guild_id, date)
);


CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage(user_id);

-- Server Generation Usage (Monthly per User)
CREATE TABLE IF NOT EXISTS server_generation_usage (
    user_id VARCHAR(20) NOT NULL,
    month_year VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    count INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, month_year)
);

-- Server Generations (Historico para suporte a undo)
CREATE TABLE IF NOT EXISTS server_generations (
    id UUID PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    theme TEXT NOT NULL,
    schema JSONB NOT NULL,
    role_ids TEXT[] DEFAULT '{}',
    category_ids TEXT[] DEFAULT '{}',
    channel_ids TEXT[] DEFAULT '{}',
    undone BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_server_generations_guild ON server_generations(guild_id, created_at DESC);
`;

export async function initializeSchema(): Promise<void> {
    try {
        await query(SCHEMA_SQL);

        // 🛠️ MIGRATION: Ensure columns exist for existing tables
        try {
            await query(`
                ALTER TABLE guild_configs 
                ADD COLUMN IF NOT EXISTS automod_channel VARCHAR(20),
                ADD COLUMN IF NOT EXISTS prohibited_words TEXT[] DEFAULT '{}',
                ADD COLUMN IF NOT EXISTS automod_action VARCHAR(20) DEFAULT 'delete',
                ADD COLUMN IF NOT EXISTS automod_timeout_duration INTEGER DEFAULT 0,
                ADD COLUMN IF NOT EXISTS automod_log_channel VARCHAR(20),
                ADD COLUMN IF NOT EXISTS automod_bypass_roles TEXT[] DEFAULT '{}',
                ADD COLUMN IF NOT EXISTS automod_links_enabled BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS automod_caps_enabled BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS automod_spam_enabled BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS ia_temperature DECIMAL(3, 2) DEFAULT 0.7,
                ADD COLUMN IF NOT EXISTS ia_ignored_channels TEXT[] DEFAULT '{}',
                ADD COLUMN IF NOT EXISTS ia_ignored_roles TEXT[] DEFAULT '{}',
                ADD COLUMN IF NOT EXISTS private_calls_enabled BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS private_calls_category_id VARCHAR(20),
                ADD COLUMN IF NOT EXISTS private_calls_allowed_roles TEXT[] DEFAULT '{}',
                ADD COLUMN IF NOT EXISTS private_calls_manager_role VARCHAR(20),
                
                ADD COLUMN IF NOT EXISTS welcome_message TEXT,
                ADD COLUMN IF NOT EXISTS leave_message TEXT,
                ADD COLUMN IF NOT EXISTS autorole_id VARCHAR(20),
                ADD COLUMN IF NOT EXISTS welcome_font VARCHAR(50),
                ADD COLUMN IF NOT EXISTS welcome_banner_url VARCHAR(255),
                ADD COLUMN IF NOT EXISTS welcome_font_changes_count INTEGER DEFAULT 0,
                
                -- Ticket Panel Customization
                ADD COLUMN IF NOT EXISTS ticket_panel_title VARCHAR(255),
                ADD COLUMN IF NOT EXISTS ticket_panel_description TEXT,
                ADD COLUMN IF NOT EXISTS ticket_panel_banner_url VARCHAR(255),
                ADD COLUMN IF NOT EXISTS ticket_panel_color VARCHAR(20),
                ADD COLUMN IF NOT EXISTS ticket_panel_button_text VARCHAR(50),
                ADD COLUMN IF NOT EXISTS ticket_panel_button_emoji VARCHAR(50),
                ADD COLUMN IF NOT EXISTS ticket_panel_footer VARCHAR(255),
                ADD COLUMN IF NOT EXISTS ticket_logs_channel_id VARCHAR(20),
                ADD COLUMN IF NOT EXISTS automod_ai_enabled BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS whitelabel_name VARCHAR(32),
                ADD COLUMN IF NOT EXISTS ia_triggers TEXT[] DEFAULT '{}',
                ADD COLUMN IF NOT EXISTS whitelabel_avatar_url VARCHAR(255),

                -- Settings page (preferences gerais)
                ADD COLUMN IF NOT EXISTS default_locale VARCHAR(5) DEFAULT 'pt',
                ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
                ADD COLUMN IF NOT EXISTS bot_notify_channel VARCHAR(20),

                -- AutoMod Whitelist & Anti-Raid
                ADD COLUMN IF NOT EXISTS automod_link_whitelist TEXT[] DEFAULT '{}',
                ADD COLUMN IF NOT EXISTS automod_ignored_channels TEXT[] DEFAULT '{}',
                ADD COLUMN IF NOT EXISTS automod_max_mentions INTEGER DEFAULT 0,
                ADD COLUMN IF NOT EXISTS antiraid_enabled BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS antiraid_min_account_age_days INTEGER DEFAULT 0,
                ADD COLUMN IF NOT EXISTS antiraid_action VARCHAR(20) DEFAULT 'kick';
            `);

            // Ticket Migration
            await query(`
                ALTER TABLE tickets 
                ADD COLUMN IF NOT EXISTS claimed_by VARCHAR(20),
                ADD COLUMN IF NOT EXISTS category VARCHAR(50),
                ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'open';
            `);

            // Ticket Category Migration
            await query(`
                ALTER TABLE ticket_categories
                ADD COLUMN IF NOT EXISTS emoji VARCHAR(50),
                ADD COLUMN IF NOT EXISTS ticket_channel_category_id VARCHAR(20),
                ADD COLUMN IF NOT EXISTS support_role_id VARCHAR(20),
                ADD COLUMN IF NOT EXISTS welcome_title VARCHAR(255),
                ADD COLUMN IF NOT EXISTS welcome_description TEXT;
            `);

            // Custom Commands Migration
            await query(`
                ALTER TABLE custom_commands
                ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]';
            `);

            // Analytics Migration
            await query(`
                ALTER TABLE guild_analytics
                ADD COLUMN IF NOT EXISTS guild_joins INTEGER DEFAULT 0,
                ADD COLUMN IF NOT EXISTS guild_leaves INTEGER DEFAULT 0;
            `);

            logger.info('✅ Schema migrado: colunas verificadas.');
        } catch (migError) {
            logger.warn('⚠️ Erro na migração (pode ser ignorado se colunas existirem):', { error: migError });
        }

        logger.info('✅ Schema do banco inicializado com sucesso');
    } catch (error: any) {
        logger.error(`❌ Erro ao inicializar schema: ${error.message}`);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📊 GUILD CONFIG OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

// Cache em memória como fallback rápido
const memoryGuildCache = new Map<string, { data: GuildConfig; expires: number }>();
const CACHE_TTL_SECONDS = 300; // 5 minutos

export async function getGuildConfig(guildId: string): Promise<GuildConfig | null> {
    // 1. Tentar ler do Cache (Redis ou Memória)
    try {
        const redis = redisService.getClient();
        if (redis) {
            const cached = await redis.get(`guild_config:${guildId}`);
            if (cached) {
                return JSON.parse(cached);
            }
        } else {
            const mem = memoryGuildCache.get(guildId);
            if (mem && mem.expires > Date.now()) {
                return mem.data;
            }
        }
    } catch {
        // Fallback silencioso para o banco
    }

    // 2. Buscar no PostgreSQL
    const result = await query<GuildConfig>(
        'SELECT * FROM guild_configs WHERE guild_id = $1',
        [guildId]
    );
    const configData = result.rows[0] || null;

    // 3. Salvar no Cache
    if (configData) {
        try {
            const redis = redisService.getClient();
            if (redis) {
                await redis.set(`guild_config:${guildId}`, JSON.stringify(configData), 'EX', CACHE_TTL_SECONDS);
            } else {
                memoryGuildCache.set(guildId, { data: configData, expires: Date.now() + (CACHE_TTL_SECONDS * 1000) });
            }
        } catch {
            // Ignora erro de gravação no cache
        }
    }

    return configData;
}

export async function invalidateGuildConfigCache(guildId: string): Promise<void> {
    memoryGuildCache.delete(guildId);
    try {
        const redis = redisService.getClient();
        if (redis) {
            await redis.del(`guild_config:${guildId}`);
        }
    } catch {
        // Ignora erro
    }
}

// Whitelist de colunas permitidas para prevenir SQL Injection
const GUILD_CONFIG_COLUMNS = new Set([
    'automod_channel', 'prohibited_words', 'vip_category_id', 'vip_role_id',
    'welcome_channel_id', 'leave_channel_id', 'logs_channel_id', 'staff_role_id',
    'welcome_message', 'leave_message', 'autorole_id', 'welcome_font', 'welcome_banner_url', 'welcome_font_changes_count',
    'automod_links_enabled', 'automod_caps_enabled', 'automod_spam_enabled',
    'automod_action', 'automod_timeout_duration', 'automod_log_channel', 'automod_bypass_roles',
    'ia_enabled', 'ia_channel_id', 'ia_system_prompt', 'ia_admin_roles', 'ia_triggers',
    'ia_voice_enabled', 'ia_temperature', 'ia_ignored_channels', 'ia_ignored_roles',
    'private_calls_enabled', 'private_calls_category_id', 'private_calls_allowed_roles', 'private_calls_manager_role',
    'ticket_panel_title', 'ticket_panel_description', 'ticket_panel_banner_url',
    'ticket_panel_color', 'ticket_panel_button_text', 'ticket_panel_button_emoji', 'ticket_panel_footer',
    'ticket_logs_channel_id',
    'automod_ai_enabled',
    'whitelabel_name', 'whitelabel_avatar_url',
    // Settings page (preferences gerais)
    'default_locale', 'timezone', 'bot_notify_channel',
    // AutoMod Whitelist & Anti-Raid
    'automod_link_whitelist', 'automod_ignored_channels', 'automod_max_mentions',
    'antiraid_enabled', 'antiraid_min_account_age_days', 'antiraid_action'
]);

const PRIVATE_CALL_COLUMNS = new Set(['is_open', 'member_limit', 'owner_id']);

const TICKET_CATEGORY_COLUMNS = new Set([
    'name', 'description', 'emoji', 'color',
    'ticket_channel_category_id', 'support_role_id', 'welcome_title', 'welcome_description'
]);

export async function upsertGuildConfig(
    guildId: string,
    updates: Partial<Omit<GuildConfig, 'guild_id' | 'updated_at'>>
): Promise<GuildConfig> {
    const fields = Object.keys(updates).filter(f => GUILD_CONFIG_COLUMNS.has(f));
    const values = fields.map(f => (updates as Record<string, unknown>)[f]);

    if (fields.length === 0) {
        throw new Error('No fields to update');
    }

    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const insertFields = ['guild_id', ...fields].join(', ');
    const insertValues = ['$1', ...fields.map((_, i) => `$${i + 2}`)].join(', ');

    const sql = `
        INSERT INTO guild_configs (${insertFields}, updated_at)
        VALUES (${insertValues}, NOW())
        ON CONFLICT (guild_id) 
        DO UPDATE SET ${setClause}, updated_at = NOW()
        RETURNING *
    `;

    const result = await query<GuildConfig>(sql, [guildId, ...values]);
    
    // Invalida cache após atualizar
    await invalidateGuildConfigCache(guildId);

    return result.rows[0];
}

// ═══════════════════════════════════════════════════════════════════════════
// 📝 AUDIT LOG OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function logAudit(
    guildId: string,
    userId: string,
    action: string,
    targetId?: string,
    details?: Record<string, unknown>
): Promise<AuditLog> {
    const result = await query<AuditLog>(
        `INSERT INTO audit_log (guild_id, user_id, action, target_id, details)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [guildId, userId, action, targetId || null, JSON.stringify(details || {})]
    );
    return result.rows[0];
}

export async function getAuditLogs(
    guildId: string,
    limit: number = 50,
    offset: number = 0
): Promise<AuditLog[]> {
    const result = await query<AuditLog>(
        `SELECT * FROM audit_log 
         WHERE guild_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [guildId, limit, offset]
    );
    return result.rows;
}

// ═══════════════════════════════════════════════════════════════════════════
// 📞 PRIVATE CALLS OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface PrivateCall extends QueryResultRow {
    channel_id: string;
    guild_id: string;
    owner_id: string;
    is_open: boolean;
    member_limit: number | null;
    created_at: Date;
}

export async function createPrivateCall(
    channelId: string,
    guildId: string,
    ownerId: string,
    isOpen: boolean = true,
    memberLimit?: number
): Promise<PrivateCall> {
    const result = await query<PrivateCall>(
        `INSERT INTO private_calls (channel_id, guild_id, owner_id, is_open, member_limit)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (channel_id) DO UPDATE SET 
            owner_id = $3, is_open = $4, member_limit = $5
         RETURNING *`,
        [channelId, guildId, ownerId, isOpen, memberLimit || null]
    );
    return result.rows[0];
}

export async function getPrivateCall(channelId: string): Promise<PrivateCall | null> {
    const result = await query<PrivateCall>(
        'SELECT * FROM private_calls WHERE channel_id = $1',
        [channelId]
    );
    return result.rows[0] || null;
}

export async function getPrivateCallByOwner(guildId: string, ownerId: string): Promise<PrivateCall | null> {
    const result = await query<PrivateCall>(
        'SELECT * FROM private_calls WHERE guild_id = $1 AND owner_id = $2',
        [guildId, ownerId]
    );
    return result.rows[0] || null;
}

export async function updatePrivateCall(
    channelId: string,
    updates: { is_open?: boolean; member_limit?: number | null; owner_id?: string }
): Promise<PrivateCall | null> {
    const fields = Object.keys(updates).filter(k => PRIVATE_CALL_COLUMNS.has(k) && updates[k as keyof typeof updates] !== undefined);
    if (fields.length === 0) return null;

    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = fields.map(f => updates[f as keyof typeof updates]);

    const result = await query<PrivateCall>(
        `UPDATE private_calls SET ${setClause} WHERE channel_id = $1 RETURNING *`,
        [channelId, ...values]
    );
    return result.rows[0] || null;
}

export async function deletePrivateCall(channelId: string): Promise<boolean> {
    const result = await query(
        'DELETE FROM private_calls WHERE channel_id = $1',
        [channelId]
    );
    return (result.rowCount ?? 0) > 0;
}

export async function getAllPrivateCalls(guildId: string): Promise<PrivateCall[]> {
    const result = await query<PrivateCall>(
        'SELECT * FROM private_calls WHERE guild_id = $1',
        [guildId]
    );
    return result.rows;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎫 TICKETS OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface Ticket extends QueryResultRow {
    id: number;
    guild_id: string;
    channel_id: string | null;
    user_id: string;
    category: string | null;
    status: string;
    claimed_by: string | null;
    created_at: Date;
    closed_at: Date | null;
}

export async function createTicket(
    guildId: string,
    channelId: string,
    userId: string,
    category?: string
): Promise<Ticket> {
    const result = await query<Ticket>(
        `INSERT INTO tickets (guild_id, channel_id, user_id, category, status)
         VALUES ($1, $2, $3, $4, 'open')
         RETURNING *`,
        [guildId, channelId, userId, category || null]
    );
    return result.rows[0];
}

export interface TicketCategory extends QueryResultRow {
    id: string;
    guild_id: string;
    name: string;
    description: string;
    emoji?: string;
    color: string;
    ticket_channel_category_id?: string;
    support_role_id?: string;
    welcome_title?: string;
    welcome_description?: string;
    created_at: Date;
    created_by: string;
}

export async function createTicketCategory(
    id: string,
    guildId: string,
    name: string,
    description: string,
    color: string,
    createdBy: string,
    emoji?: string,
    ticketChannelCategoryId?: string,
    supportRoleId?: string,
    welcomeTitle?: string,
    welcomeDescription?: string
): Promise<TicketCategory> {
    const result = await query<TicketCategory>(
        `INSERT INTO ticket_categories (
            id, guild_id, name, description, color, created_by,
            emoji, ticket_channel_category_id, support_role_id, welcome_title, welcome_description
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
            id, guildId, name, description, color, createdBy,
            emoji || null, ticketChannelCategoryId || null, supportRoleId || null, welcomeTitle || null, welcomeDescription || null
        ]
    );
    return result.rows[0];
}

export async function getTicketCategories(guildId: string): Promise<TicketCategory[]> {
    const result = await query<TicketCategory>(
        'SELECT * FROM ticket_categories WHERE guild_id = $1 ORDER BY created_at ASC',
        [guildId]
    );
    return result.rows;
}

export async function updateTicketCategory(
    id: string,
    updates: Partial<Omit<TicketCategory, 'id' | 'guild_id' | 'created_at' | 'created_by'>>
): Promise<TicketCategory | null> {
    const fields = Object.keys(updates).filter(f => TICKET_CATEGORY_COLUMNS.has(f));
    const values = fields.map(f => (updates as Record<string, unknown>)[f]);

    if (fields.length === 0) return null;

    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');

    const result = await query<TicketCategory>(
        `UPDATE ticket_categories SET ${setClause} WHERE id = $1 RETURNING *`,
        [id, ...values]
    );
    return result.rows[0] || null;
}

export async function deleteTicketCategory(id: string): Promise<boolean> {
    const result = await query(
        'DELETE FROM ticket_categories WHERE id = $1',
        [id]
    );
    return (result.rowCount ?? 0) > 0;
}

export async function getTicketCategory(id: string): Promise<TicketCategory | null> {
    const result = await query<TicketCategory>(
        'SELECT * FROM ticket_categories WHERE id = $1',
        [id]
    );
    return result.rows[0] || null;
}

export async function claimTicket(channelId: string, userId: string): Promise<Ticket | null> {
    const result = await query<Ticket>(
        `UPDATE tickets SET claimed_by = $2 WHERE channel_id = $1 RETURNING *`,
        [channelId, userId]
    );
    return result.rows[0] || null;
}

export async function getTicket(channelId: string): Promise<Ticket | null> {
    const result = await query<Ticket>(
        'SELECT * FROM tickets WHERE channel_id = $1',
        [channelId]
    );
    return result.rows[0] || null;
}

export async function getTicketsByUser(guildId: string, userId: string): Promise<Ticket[]> {
    const result = await query<Ticket>(
        `SELECT * FROM tickets WHERE guild_id = $1 AND user_id = $2 AND status = 'open'`,
        [guildId, userId]
    );
    return result.rows;
}

export async function closeTicket(channelId: string): Promise<Ticket | null> {
    const result = await query<Ticket>(
        `UPDATE tickets SET status = 'closed', closed_at = NOW() 
         WHERE channel_id = $1 RETURNING *`,
        [channelId]
    );
    return result.rows[0] || null;
}

export async function deleteTicket(channelId: string): Promise<boolean> {
    const result = await query(
        'DELETE FROM tickets WHERE channel_id = $1',
        [channelId]
    );
    return (result.rowCount ?? 0) > 0;
}

export async function getOpenTickets(guildId: string): Promise<Ticket[]> {
    const result = await query<Ticket>(
        `SELECT * FROM tickets WHERE guild_id = $1 AND status = 'open' ORDER BY created_at DESC`,
        [guildId]
    );
    return result.rows;
}

// ═══════════════════════════════════════════════════════════════════════════
// 📜 TICKET TRANSCRIPTS
// ═══════════════════════════════════════════════════════════════════════════

export interface TicketTranscript extends QueryResultRow {
    id: string;
    guild_id: string;
    ticket_channel_id?: string | null;
    ticket_name: string;
    user_id: string;
    closed_by_id: string;
    category: string;
    summary?: string | null;
    transcript_html: string;
    message_count: number;
    created_at: Date;
}

export async function saveTicketTranscript(data: {
    id: string;
    guild_id: string;
    ticket_channel_id?: string | null;
    ticket_name: string;
    user_id: string;
    closed_by_id: string;
    category: string;
    summary?: string | null;
    transcript_html: string;
    message_count: number;
}): Promise<TicketTranscript> {
    const result = await query<TicketTranscript>(
        `INSERT INTO ticket_transcripts (id, guild_id, ticket_channel_id, ticket_name, user_id, closed_by_id, category, summary, transcript_html, message_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET transcript_html = EXCLUDED.transcript_html, summary = EXCLUDED.summary
         RETURNING *`,
        [data.id, data.guild_id, data.ticket_channel_id || null, data.ticket_name, data.user_id, data.closed_by_id, data.category, data.summary || null, data.transcript_html, data.message_count]
    );
    return result.rows[0];
}

export async function getTicketTranscripts(guildId: string, limit = 50): Promise<TicketTranscript[]> {
    const result = await query<TicketTranscript>(
        `SELECT id, guild_id, ticket_channel_id, ticket_name, user_id, closed_by_id, category, summary, message_count, created_at 
         FROM ticket_transcripts 
         WHERE guild_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [guildId, limit]
    );
    return result.rows;
}

export async function getTicketTranscriptById(id: string): Promise<TicketTranscript | null> {
    const result = await query<TicketTranscript>(
        `SELECT * FROM ticket_transcripts WHERE id = $1`,
        [id]
    );
    return result.rows[0] || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// 💳 SUBSCRIPTION OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function createSubscription(
    id: string,
    userId: string,
    plan: string,
    status: string,
    nextPayment?: Date
): Promise<Subscription> {
    const result = await query<Subscription>(
        `INSERT INTO subscriptions (id, user_id, plan, status, next_payment)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [id, userId, plan, status, nextPayment || null]
    );
    return result.rows[0];
}

export async function getSubscription(id: string): Promise<Subscription | null> {
    const result = await query<Subscription>(
        'SELECT * FROM subscriptions WHERE id = $1',
        [id]
    );
    return result.rows[0] || null;
}

export async function getSubscriptionByUser(userId: string): Promise<Subscription | null> {
    const result = await query<Subscription>(
        `SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [userId]
    );
    return result.rows[0] || null;
}

export async function updateSubscriptionStatus(
    id: string,
    status: string,
    nextPayment?: Date
): Promise<Subscription | null> {
    const result = await query<Subscription>(
        `UPDATE subscriptions SET status = $2, next_payment = COALESCE($3, next_payment), updated_at = NOW() 
         WHERE id = $1 RETURNING *`,
        [id, status, nextPayment || null]
    );
    return result.rows[0] || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// 💰 PAYMENT OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function createPayment(
    id: number,
    subscriptionId: string,
    amount: number,
    status: string
): Promise<Payment> {
    const result = await query<Payment>(
        `INSERT INTO payments (id, subscription_id, amount, status)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [id, subscriptionId, amount, status]
    );
    return result.rows[0];
}

export async function getPaymentsBySubscription(subscriptionId: string): Promise<Payment[]> {
    const result = await query<Payment>(
        `SELECT * FROM payments WHERE subscription_id = $1 ORDER BY created_at DESC`,
        [subscriptionId]
    );
    return result.rows;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🏗️ SERVER GENERATIONS (Historico para undo)
// ═══════════════════════════════════════════════════════════════════════════

export interface ServerGeneration extends QueryResultRow {
    id: string;
    guild_id: string;
    user_id: string;
    theme: string;
    schema: any;
    role_ids: string[];
    category_ids: string[];
    channel_ids: string[];
    undone: boolean;
    created_at: Date;
}

export async function saveServerGeneration(
    id: string,
    guildId: string,
    userId: string,
    theme: string,
    schema: any,
    roleIds: string[],
    categoryIds: string[],
    channelIds: string[]
): Promise<ServerGeneration> {
    const result = await query<ServerGeneration>(
        `INSERT INTO server_generations
         (id, guild_id, user_id, theme, schema, role_ids, category_ids, channel_ids)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [id, guildId, userId, theme, JSON.stringify(schema), roleIds, categoryIds, channelIds]
    );
    return result.rows[0];
}

export async function getLastServerGeneration(guildId: string): Promise<ServerGeneration | null> {
    const result = await query<ServerGeneration>(
        `SELECT * FROM server_generations
         WHERE guild_id = $1 AND undone = false
         ORDER BY created_at DESC
         LIMIT 1`,
        [guildId]
    );
    return result.rows[0] || null;
}

export async function markServerGenerationUndone(id: string): Promise<void> {
    await query(`UPDATE server_generations SET undone = true WHERE id = $1`, [id]);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧹 CLEANUP
// ═══════════════════════════════════════════════════════════════════════════

export async function closePool(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
        logger.info('🔌 Pool PostgreSQL fechado');
    }
}

// Export default database object
export const database = {
    query,
    getClient,
    testConnection,
    closePool,
    initializeSchema,
    getGuildConfig,
    upsertGuildConfig,
    logAudit,
    getAuditLogs,
    // Private Calls
    createPrivateCall,
    getPrivateCall,
    getPrivateCallByOwner,
    updatePrivateCall,
    deletePrivateCall,
    getAllPrivateCalls,
    // Tickets
    createTicket,
    getTicket,
    getTicketsByUser,
    closeTicket,
    deleteTicket,
    getOpenTickets,
    // Ticket Categories
    createTicketCategory,
    getTicketCategories,
    updateTicketCategory,
    deleteTicketCategory,
    getTicketCategory,
    claimTicket,
    // Subscriptions
    createSubscription,
    getSubscription,
    getSubscriptionByUser,
    updateSubscriptionStatus,
    // Payments
    createPayment,
    getPaymentsBySubscription,
    // Custom Commands
    createCustomCommand,
    getCustomCommands,
    getCustomCommand,
    deleteCustomCommand,
    toggleCustomCommand,

    // Ticket Transcripts
    saveTicketTranscript,
    getTicketTranscripts,
    getTicketTranscriptById,

    // Knowledge Base
    getKnowledgeBase,
    createKnowledgeTopic,
    updateKnowledgeTopic,
    deleteKnowledgeTopic,

    // Server Generations
    saveServerGeneration,
    getLastServerGeneration,
    markServerGenerationUndone
};

// ═══════════════════════════════════════════════════════════════════════════
// 🤖 CUSTOM COMMANDS OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface CustomCommand extends QueryResultRow {
    id: string;
    guild_id: string;
    name: string;
    description: string;
    response: string | null;
    actions: any; // JSONB
    options?: any; // JSONB
    enabled: boolean;
    created_by: string;
    created_at: Date;
}

export async function createCustomCommand(
    id: string,
    guildId: string,
    name: string,
    description: string,
    response: string | null,
    actions: any[],
    createdBy: string,
    options: any[] = []
): Promise<CustomCommand> {
    const result = await query<CustomCommand>(
        `INSERT INTO custom_commands (id, guild_id, name, description, response, actions, created_by, options)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [id, guildId, name, description, response, JSON.stringify(actions), createdBy, JSON.stringify(options)]
    );
    return result.rows[0];
}

export async function getCustomCommands(guildId: string): Promise<CustomCommand[]> {
    const result = await query<CustomCommand>(
        'SELECT * FROM custom_commands WHERE guild_id = $1 ORDER BY name ASC',
        [guildId]
    );
    return result.rows;
}

export async function getCustomCommand(guildId: string, name: string): Promise<CustomCommand | null> {
    const result = await query<CustomCommand>(
        'SELECT * FROM custom_commands WHERE guild_id = $1 AND name = $2',
        [guildId, name]
    );
    return result.rows[0] || null;
}

export async function deleteCustomCommand(id: string): Promise<boolean> {
    const result = await query(
        'DELETE FROM custom_commands WHERE id = $1',
        [id]
    );
    return (result.rowCount ?? 0) > 0;
}

export async function toggleCustomCommand(id: string, enabled: boolean): Promise<CustomCommand | null> {
    const result = await query<CustomCommand>(
        'UPDATE custom_commands SET enabled = $2 WHERE id = $1 RETURNING *',
        [id, enabled]
    );
    return result.rows[0] || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧠 GUILD KNOWLEDGE BASE (RAG / FAQs DA IA)
// ═══════════════════════════════════════════════════════════════════════════

export interface KnowledgeBaseTopic extends QueryResultRow {
    id: string;
    guild_id: string;
    topic: string;
    content: string;
    tags: string[];
    created_by?: string | null;
    created_at: Date;
    updated_at: Date;
}

export async function getKnowledgeBase(guildId: string): Promise<KnowledgeBaseTopic[]> {
    const result = await query<KnowledgeBaseTopic>(
        'SELECT * FROM guild_knowledge_base WHERE guild_id = $1 ORDER BY created_at DESC',
        [guildId]
    );
    return result.rows;
}

export async function createKnowledgeTopic(
    id: string,
    guildId: string,
    topic: string,
    content: string,
    tags: string[] = [],
    createdBy?: string
): Promise<KnowledgeBaseTopic> {
    const result = await query<KnowledgeBaseTopic>(
        `INSERT INTO guild_knowledge_base (id, guild_id, topic, content, tags, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [id, guildId, topic, content, tags, createdBy || null]
    );
    return result.rows[0];
}

export async function updateKnowledgeTopic(
    id: string,
    topic: string,
    content: string,
    tags: string[] = []
): Promise<KnowledgeBaseTopic | null> {
    const result = await query<KnowledgeBaseTopic>(
        `UPDATE guild_knowledge_base 
         SET topic = $2, content = $3, tags = $4, updated_at = NOW() 
         WHERE id = $1 
         RETURNING *`,
        [id, topic, content, tags]
    );
    return result.rows[0] || null;
}

export async function deleteKnowledgeTopic(id: string): Promise<boolean> {
    const result = await query(
        'DELETE FROM guild_knowledge_base WHERE id = $1',
        [id]
    );
    return (result.rowCount ?? 0) > 0;
}

export default database;
