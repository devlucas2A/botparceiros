import { Client } from 'discord.js';
import { MusicCommand } from './types';
/**
 * Faz o parsing de uma mensagem com o prefixo core!
 * Retorna o comando correspondente e seus argumentos, ou null se não tiver o prefixo.
 */
export declare function parseMusicCommand(content: string): {
    commandName: string;
    args: string[];
    command?: MusicCommand;
} | null;
/**
 * Inicializa os ouvintes de eventos do módulo de música (core!)
 */
export declare function setupMusicEvents(client: Client): void;
//# sourceMappingURL=events.d.ts.map