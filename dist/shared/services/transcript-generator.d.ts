/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                  DISCORD HTML TRANSCRIPT GENERATOR                       ║
 * ║            Exportador visual moderno de histórico de tickets              ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
import { Message, Guild, GuildMember } from 'discord.js';
export interface TranscriptOptions {
    guild: Guild;
    channelName: string;
    closedBy: GuildMember;
    category: string;
    openedBy?: string;
    summary?: string | null;
    messages: Message[];
}
export declare function generateHtmlTranscript(options: TranscriptOptions): string;
//# sourceMappingURL=transcript-generator.d.ts.map