import { MusicCommand } from './types';
/**
 * Cria uma barra de progresso visual para a música atual
 */
export declare function createProgressBar(currentMs: number, totalSeconds: number, length?: number): string;
export declare const playCommand: MusicCommand;
export declare const stopCommand: MusicCommand;
export declare const skipCommand: MusicCommand;
export declare const leaveCommand: MusicCommand;
export declare const queueCommand: MusicCommand;
export declare const pauseCommand: MusicCommand;
export declare const resumeCommand: MusicCommand;
export declare const nowPlayingCommand: MusicCommand;
export declare const loopCommand: MusicCommand;
export declare const helpCommand: MusicCommand;
export declare const MUSIC_COMMANDS: MusicCommand[];
export declare function findMusicCommand(nameOrAlias: string): MusicCommand | undefined;
//# sourceMappingURL=commands.d.ts.map