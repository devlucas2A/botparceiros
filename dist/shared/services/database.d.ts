/**
* ╔═══════════════════════════════════════════════════════════════════════════╗
* ║                     COREBOT DATABASE SERVICE                             ║
* ║                   PostgreSQL Connection + Queries                         ║
* ╚═══════════════════════════════════════════════════════════════════════════╝
*/
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
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
    welcome_message?: string | null;
    leave_message?: string | null;
    autorole_id?: string | null;
    welcome_font_changes_count?: number;
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
    antiraid_enabled?: boolean;
    antiraid_min_account_age_days?: number;
    antiraid_action?: 'kick' | 'ban' | 'quarantine';
    ia_enabled?: boolean;
    ia_channel_id?: string | null;
    ia_system_prompt?: string | null;
    ia_triggers?: string[] | null;
    ia_admin_roles?: string[];
    ia_voice_enabled?: boolean;
    ia_temperature?: number;
    ia_ignored_channels?: string[];
    ia_ignored_roles?: string[];
    private_calls_enabled?: boolean;
    private_calls_category_id?: string | null;
    private_calls_allowed_roles?: string[];
    private_calls_manager_role?: string | null;
    ticket_panel_title?: string | null;
    ticket_panel_description?: string | null;
    ticket_panel_banner_url?: string | null;
    ticket_panel_color?: string | null;
    ticket_panel_button_text?: string | null;
    ticket_panel_button_emoji?: string | null;
    ticket_panel_footer?: string | null;
    ticket_logs_channel_id?: string | null;
    whitelabel_name?: string | null;
    whitelabel_avatar_url?: string | null;
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
    id: string;
    user_id: string;
    plan: 'starter' | 'pro' | 'ultimate';
    status: 'pending' | 'authorized' | 'paused' | 'cancelled';
    next_payment: Date;
    created_at: Date;
    updated_at: Date;
}
export interface Payment extends QueryResultRow {
    id: number;
    subscription_id: string;
    amount: number;
    status: 'approved' | 'rejected' | 'pending' | 'refunded';
    created_at: Date;
}
export declare function getPool(): Pool;
export declare function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
export declare function getClient(): Promise<PoolClient>;
export declare function testConnection(): Promise<boolean>;
export declare function initializeSchema(): Promise<void>;
export declare function getGuildConfig(guildId: string): Promise<GuildConfig | null>;
export declare function invalidateGuildConfigCache(guildId: string): Promise<void>;
export declare function upsertGuildConfig(guildId: string, updates: Partial<Omit<GuildConfig, 'guild_id' | 'updated_at'>>): Promise<GuildConfig>;
export declare function logAudit(guildId: string, userId: string, action: string, targetId?: string, details?: Record<string, unknown>): Promise<AuditLog>;
export declare function getAuditLogs(guildId: string, limit?: number, offset?: number): Promise<AuditLog[]>;
export interface PrivateCall extends QueryResultRow {
    channel_id: string;
    guild_id: string;
    owner_id: string;
    is_open: boolean;
    member_limit: number | null;
    created_at: Date;
}
export declare function createPrivateCall(channelId: string, guildId: string, ownerId: string, isOpen?: boolean, memberLimit?: number): Promise<PrivateCall>;
export declare function getPrivateCall(channelId: string): Promise<PrivateCall | null>;
export declare function getPrivateCallByOwner(guildId: string, ownerId: string): Promise<PrivateCall | null>;
export declare function updatePrivateCall(channelId: string, updates: {
    is_open?: boolean;
    member_limit?: number | null;
    owner_id?: string;
}): Promise<PrivateCall | null>;
export declare function deletePrivateCall(channelId: string): Promise<boolean>;
export declare function getAllPrivateCalls(guildId: string): Promise<PrivateCall[]>;
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
export declare function createTicket(guildId: string, channelId: string, userId: string, category?: string): Promise<Ticket>;
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
export declare function createTicketCategory(id: string, guildId: string, name: string, description: string, color: string, createdBy: string, emoji?: string, ticketChannelCategoryId?: string, supportRoleId?: string, welcomeTitle?: string, welcomeDescription?: string): Promise<TicketCategory>;
export declare function getTicketCategories(guildId: string): Promise<TicketCategory[]>;
export declare function updateTicketCategory(id: string, updates: Partial<Omit<TicketCategory, 'id' | 'guild_id' | 'created_at' | 'created_by'>>): Promise<TicketCategory | null>;
export declare function deleteTicketCategory(id: string): Promise<boolean>;
export declare function getTicketCategory(id: string): Promise<TicketCategory | null>;
export declare function claimTicket(channelId: string, userId: string): Promise<Ticket | null>;
export declare function getTicket(channelId: string): Promise<Ticket | null>;
export declare function getTicketsByUser(guildId: string, userId: string): Promise<Ticket[]>;
export declare function closeTicket(channelId: string): Promise<Ticket | null>;
export declare function deleteTicket(channelId: string): Promise<boolean>;
export declare function getOpenTickets(guildId: string): Promise<Ticket[]>;
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
export declare function saveTicketTranscript(data: {
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
}): Promise<TicketTranscript>;
export declare function getTicketTranscripts(guildId: string, limit?: number): Promise<TicketTranscript[]>;
export declare function getTicketTranscriptById(id: string): Promise<TicketTranscript | null>;
export declare function createSubscription(id: string, userId: string, plan: string, status: string, nextPayment?: Date): Promise<Subscription>;
export declare function getSubscription(id: string): Promise<Subscription | null>;
export declare function getSubscriptionByUser(userId: string): Promise<Subscription | null>;
export declare function updateSubscriptionStatus(id: string, status: string, nextPayment?: Date): Promise<Subscription | null>;
export declare function createPayment(id: number, subscriptionId: string, amount: number, status: string): Promise<Payment>;
export declare function getPaymentsBySubscription(subscriptionId: string): Promise<Payment[]>;
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
export declare function saveServerGeneration(id: string, guildId: string, userId: string, theme: string, schema: any, roleIds: string[], categoryIds: string[], channelIds: string[]): Promise<ServerGeneration>;
export declare function getLastServerGeneration(guildId: string): Promise<ServerGeneration | null>;
export declare function markServerGenerationUndone(id: string): Promise<void>;
export declare function closePool(): Promise<void>;
export declare const database: {
    query: typeof query;
    getClient: typeof getClient;
    testConnection: typeof testConnection;
    closePool: typeof closePool;
    initializeSchema: typeof initializeSchema;
    getGuildConfig: typeof getGuildConfig;
    upsertGuildConfig: typeof upsertGuildConfig;
    logAudit: typeof logAudit;
    getAuditLogs: typeof getAuditLogs;
    createPrivateCall: typeof createPrivateCall;
    getPrivateCall: typeof getPrivateCall;
    getPrivateCallByOwner: typeof getPrivateCallByOwner;
    updatePrivateCall: typeof updatePrivateCall;
    deletePrivateCall: typeof deletePrivateCall;
    getAllPrivateCalls: typeof getAllPrivateCalls;
    createTicket: typeof createTicket;
    getTicket: typeof getTicket;
    getTicketsByUser: typeof getTicketsByUser;
    closeTicket: typeof closeTicket;
    deleteTicket: typeof deleteTicket;
    getOpenTickets: typeof getOpenTickets;
    createTicketCategory: typeof createTicketCategory;
    getTicketCategories: typeof getTicketCategories;
    updateTicketCategory: typeof updateTicketCategory;
    deleteTicketCategory: typeof deleteTicketCategory;
    getTicketCategory: typeof getTicketCategory;
    claimTicket: typeof claimTicket;
    createSubscription: typeof createSubscription;
    getSubscription: typeof getSubscription;
    getSubscriptionByUser: typeof getSubscriptionByUser;
    updateSubscriptionStatus: typeof updateSubscriptionStatus;
    createPayment: typeof createPayment;
    getPaymentsBySubscription: typeof getPaymentsBySubscription;
    createCustomCommand: typeof createCustomCommand;
    getCustomCommands: typeof getCustomCommands;
    getCustomCommand: typeof getCustomCommand;
    deleteCustomCommand: typeof deleteCustomCommand;
    toggleCustomCommand: typeof toggleCustomCommand;
    saveTicketTranscript: typeof saveTicketTranscript;
    getTicketTranscripts: typeof getTicketTranscripts;
    getTicketTranscriptById: typeof getTicketTranscriptById;
    getKnowledgeBase: typeof getKnowledgeBase;
    createKnowledgeTopic: typeof createKnowledgeTopic;
    updateKnowledgeTopic: typeof updateKnowledgeTopic;
    deleteKnowledgeTopic: typeof deleteKnowledgeTopic;
    saveServerGeneration: typeof saveServerGeneration;
    getLastServerGeneration: typeof getLastServerGeneration;
    markServerGenerationUndone: typeof markServerGenerationUndone;
};
export interface CustomCommand extends QueryResultRow {
    id: string;
    guild_id: string;
    name: string;
    description: string;
    response: string | null;
    actions: any;
    options?: any;
    enabled: boolean;
    created_by: string;
    created_at: Date;
}
export declare function createCustomCommand(id: string, guildId: string, name: string, description: string, response: string | null, actions: any[], createdBy: string, options?: any[]): Promise<CustomCommand>;
export declare function getCustomCommands(guildId: string): Promise<CustomCommand[]>;
export declare function getCustomCommand(guildId: string, name: string): Promise<CustomCommand | null>;
export declare function deleteCustomCommand(id: string): Promise<boolean>;
export declare function toggleCustomCommand(id: string, enabled: boolean): Promise<CustomCommand | null>;
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
export declare function getKnowledgeBase(guildId: string): Promise<KnowledgeBaseTopic[]>;
export declare function createKnowledgeTopic(id: string, guildId: string, topic: string, content: string, tags?: string[], createdBy?: string): Promise<KnowledgeBaseTopic>;
export declare function updateKnowledgeTopic(id: string, topic: string, content: string, tags?: string[]): Promise<KnowledgeBaseTopic | null>;
export declare function deleteKnowledgeTopic(id: string): Promise<boolean>;
export default database;
//# sourceMappingURL=database.d.ts.map