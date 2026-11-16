/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                      COREBOT - COMANDO /HELPCORE                          ║
 * ║                  Central Interativa de Ajuda & Guia                       ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * Módulo de autoatendimento e documentação in-bot:
 * - Slash Command `/helpcore [categoria]` com 7 categorias completas
 * - Menu interativo de seleção (StringSelectMenuBuilder)
 * - Botões de ação rápida para Dashboard, Docs e Retorno ao Início
 * - Handlers resilientes para interações de chat, menu e botões
 */
import { ChatInputCommandInteraction, StringSelectMenuInteraction, ButtonInteraction, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, EmbedBuilder } from 'discord.js';
export type HelpCoreCategoryKey = 'overview' | 'music' | 'ai' | 'calls' | 'tickets' | 'moderation' | 'custom';
export interface HelpCoreCategoryField {
    name: string;
    value: string;
    inline?: boolean;
}
export interface HelpCoreCategory {
    id: HelpCoreCategoryKey;
    label: string;
    emoji: string;
    description: string;
    title: string;
    embedDescription: string;
    fields: HelpCoreCategoryField[];
    color: number;
    footer?: string;
}
export declare const HELPCORE_CATEGORIES: Record<HelpCoreCategoryKey, HelpCoreCategory>;
export declare const HELPCORE_COMMAND: import("discord.js").SlashCommandOptionsOnlyBuilder;
/**
 * Validador seguro de chaves de categoria (type guard).
 * Previne vulnerabilidades de Prototype Pollution ao rejeitar propriedades herdadas de Object.prototype
 * como 'constructor', 'toString', 'valueOf', '__proto__', etc.
 */
export declare function isValidCategoryKey(key: unknown): key is HelpCoreCategoryKey;
/**
 * Constrói o Embed estilizado para a categoria especificada.
 */
export declare function buildHelpCoreEmbed(categoryKey: string | HelpCoreCategoryKey): EmbedBuilder;
/**
 * Constrói a linha de seleção (Select Menu) e botões de ação (Dashboard, Docs, Início).
 */
export declare function buildHelpCoreComponents(currentCategory?: string | HelpCoreCategoryKey): [ActionRowBuilder<StringSelectMenuBuilder>, ActionRowBuilder<ButtonBuilder>];
/**
 * Trata a execução inicial do comando slash `/helpcore`.
 */
export declare function handleHelpCoreCommand(interaction: ChatInputCommandInteraction): Promise<void>;
/**
 * Trata interações de menu suspenso `helpcore_category_select`.
 */
export declare function handleHelpCoreSelectMenu(interaction: StringSelectMenuInteraction): Promise<void>;
/**
 * Trata interações de botão iniciadas com `helpcore:`.
 */
export declare function handleHelpCoreButton(interaction: ButtonInteraction): Promise<void>;
//# sourceMappingURL=command.d.ts.map