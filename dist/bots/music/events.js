"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMusicCommand = parseMusicCommand;
exports.setupMusicEvents = setupMusicEvents;
const discord_js_1 = require("discord.js");
const commands_1 = require("./commands");
const music_manager_1 = require("./music.manager");
const services_1 = require("../../shared/services");
let musicEventsRegistered = false;
/**
 * Faz o parsing de uma mensagem com o prefixo core!
 * Retorna o comando correspondente e seus argumentos, ou null se não tiver o prefixo.
 */
function parseMusicCommand(content) {
    const trimmed = content.trim();
    if (!trimmed.toLowerCase().startsWith('core!')) {
        return null;
    }
    const withoutPrefix = trimmed.slice(5).trim();
    if (!withoutPrefix) {
        return {
            commandName: 'help',
            args: [],
            command: (0, commands_1.findMusicCommand)('help')
        };
    }
    const parts = withoutPrefix.split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);
    const command = (0, commands_1.findMusicCommand)(commandName);
    return {
        commandName,
        args,
        command
    };
}
/**
 * Inicializa os ouvintes de eventos do módulo de música (core!)
 */
function setupMusicEvents(client) {
    if (musicEventsRegistered) {
        services_1.logger.warn(`[Music] setupMusicEvents já foi chamado neste processo (pid ${process.pid}), ignorando duplicata.`);
        return;
    }
    musicEventsRegistered = true;
    services_1.logger.info(`🌌 Módulo Music (pid ${process.pid}): Eventos inicializados (messageCreate + voiceStateUpdate)`);
    // Interceptação de mensagens com prefixo core!
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.guild)
            return;
        const parsed = parseMusicCommand(message.content);
        if (!parsed)
            return;
        const member = message.member;
        if (!member)
            return;
        if (!parsed.command) {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(0xED4245)
                .setDescription(`❌ Comando musical \`core!${parsed.commandName}\` desconhecido! Digite \`core!help\` para ver os comandos disponíveis.`);
            await message.reply({ embeds: [embed] }).catch(() => { });
            return;
        }
        try {
            await parsed.command.execute(message, parsed.args, member);
        }
        catch (error) {
            const err = error;
            services_1.logger.error(`[MusicEvents] Erro ao executar comando core!${parsed.commandName}:`, { error });
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(0xED4245)
                .setDescription(`❌ Ocorreu um erro ao executar \`core!${parsed.commandName}\`: ${err?.message || 'Erro inesperado'}`);
            await message.reply({ embeds: [embed] }).catch(() => { });
        }
    });
    // Detecção de canal vazio e desconexão do bot
    client.on('voiceStateUpdate', (oldState, newState) => {
        try {
            music_manager_1.musicManager.handleVoiceStateUpdate(oldState, newState);
        }
        catch (error) {
            services_1.logger.error('[MusicEvents] Erro no manipulador voiceStateUpdate:', { error });
        }
    });
}
//# sourceMappingURL=events.js.map