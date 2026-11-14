import { GuildMember } from 'discord.js';
export type BannerMode = 'welcome' | 'leave';
export declare function generateBanner(member: GuildMember, text: string, backgroundPath?: string | null, font?: string | null, mode?: BannerMode): Promise<Buffer>;
export declare function generateBannerFast(member: GuildMember, text: string, backgroundPath?: string | null, font?: string | null, mode?: BannerMode): Promise<Buffer>;
//# sourceMappingURL=welcome.service.d.ts.map