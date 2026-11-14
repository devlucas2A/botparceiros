import { Message } from 'discord.js';
import { GuildConfig } from '../../shared/services';
export interface AutoModViolation {
    type: 'prohibited_word' | 'spam' | 'caps' | 'link';
    content: string;
    detected: string;
}
export declare function checkProhibitedWords(content: string, prohibitedWords: string[]): string | null;
export declare function checkCaps(content: string, threshold?: number, minLength?: number): boolean;
export declare function checkLinks(content: string, whitelist?: string[]): boolean;
export declare function checkMassMentions(message: Message, maxMentions: number): boolean;
export declare function checkAccountAge(createdAt: Date, minDays: number): {
    isSuspicious: boolean;
    ageDays: number;
};
export declare function checkFlood(content: string): boolean;
export declare function checkSpam(userId: string, guildId: string): boolean;
export declare function checkWithAI(content: string, guildId: string): Promise<{
    type: string;
    reason: string;
} | null>;
export declare function handleViolation(message: Message, violationType: string, details: string, config: GuildConfig): Promise<void>;
//# sourceMappingURL=automod.service.d.ts.map