import { EmbedBuilder, GuildMember, Message, PermissionFlagsBits } from 'discord.js';
import { MusicCommand } from './types';
import { musicManager } from './music.manager';
import { formatDuration, resolveTracks } from './extractor';

/**
 * Cria uma barra de progresso visual para a música atual
 */
export function createProgressBar(currentMs: number, totalSeconds: number, length: number = 14): string {
    if (!totalSeconds || totalSeconds <= 0) {
        return '🔴 `[Ao Vivo / Direto]`';
    }

    const currentSeconds = Math.floor(currentMs / 1000);
    const clampedCurrent = Math.min(Math.max(currentSeconds, 0), totalSeconds);
    const progress = totalSeconds > 0 ? clampedCurrent / totalSeconds : 0;
    const progressIndex = Math.min(Math.round(progress * length), length - 1);

    const bar = Array.from({ length }, (_, i) => (i === progressIndex ? '🔘' : '▬')).join('');
    return `${bar} \`[${formatDuration(clampedCurrent)} / ${formatDuration(totalSeconds)}]\``;
}

export const playCommand: MusicCommand = {
    name: 'play',
    aliases: ['p'],
    description: 'Toca uma música ou playlist do YouTube, SoundCloud, Spotify ou link direto',
    usage: 'core!play <busca ou URL>',
    execute: async (message: Message, args: string[], member: GuildMember) => {
        const query = args.join(' ').trim();
        if (!query) {
            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setDescription('❌ Informe o nome de uma música ou um link válido! Exemplo: `core!play Bohemian Rhapsody`');
            await message.reply({ embeds: [embed] });
            return;
        }

        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setDescription('❌ Você precisa estar em um canal de voz para tocar música!');
            await message.reply({ embeds: [embed] });
            return;
        }

        const permissions = voiceChannel.permissionsFor(message.client.user!);
        if (!permissions || !permissions.has(PermissionFlagsBits.Connect) || !permissions.has(PermissionFlagsBits.Speak)) {
            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setDescription('❌ Preciso de permissões para **Conectar** e **Falar** no seu canal de voz!');
            await message.reply({ embeds: [embed] });
            return;
        }

        const queue = musicManager.getOrCreateQueue(message.guildId!, voiceChannel, message.channel);

        // Se o bot já estiver conectado em outro canal e não estiver sozinho
        if (queue.connection && queue.voiceChannel.id !== voiceChannel.id) {
            const botChannelMembers = queue.voiceChannel.members.filter(m => !m.user.bot);
            if (botChannelMembers.size > 0) {
                const embed = new EmbedBuilder()
                    .setColor(0xED4245)
                    .setDescription(`❌ O bot já está sendo utilizado no canal de voz **${queue.voiceChannel.name}**!`);
                await message.reply({ embeds: [embed] });
                return;
            } else {
                queue.voiceChannel = voiceChannel;
            }
        }

        const searchMsg = await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setDescription(`🔍 Buscando \`${query}\`...`)
            ]
        });

        // Conecta imediatamente ao canal de voz do usuário antes de buscar
        queue.connect();

        const tracks = await resolveTracks(query, member);
        if (!tracks || tracks.length === 0) {
            if (!queue.isPlaying && !queue.currentTrack && queue.tracks.length === 0) {
                queue.startIdleTimer();
            }
            await searchMsg.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription(`❌ Nenhuma música encontrada para: \`${query}\``)
                ]
            });
            return;
        }

        if (tracks.length === 1) {
            const track = tracks[0];
            const wasPlaying = queue.isPlaying || queue.currentTrack !== null;
            queue.enqueue(track);

            if (!wasPlaying) {
                await searchMsg.delete().catch(() => {});
                await queue.playNext();
            } else {
                const embed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setTitle('✅ Adicionado à Fila')
                    .setDescription(`[${track.title}](${track.url})`)
                    .addFields(
                        { name: '⏱️ Duração', value: track.duration, inline: true },
                        { name: '👤 Autor/Canal', value: track.author || 'Desconhecido', inline: true },
                        { name: '📊 Posição na fila', value: `#${queue.tracks.length}`, inline: true }
                    );
                if (track.thumbnail) {
                    embed.setThumbnail(track.thumbnail);
                }
                await searchMsg.edit({ embeds: [embed] });
            }
        } else {
            // Múltiplas faixas (playlist ou álbum)
            const wasPlaying = queue.isPlaying || queue.currentTrack !== null;
            queue.enqueue(tracks);

            const embed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle('🎶 Playlist Adicionada à Fila')
                .setDescription(`Adicionadas **${tracks.length}** músicas à fila!`)
                .addFields(
                    { name: '🎵 Primeira música', value: `[${tracks[0].title}](${tracks[0].url})`, inline: false },
                    { name: '📊 Total na fila', value: `${queue.tracks.length} músicas`, inline: true }
                );

            if (tracks[0].thumbnail) {
                embed.setThumbnail(tracks[0].thumbnail);
            }

            await searchMsg.edit({ embeds: [embed] });

            if (!wasPlaying) {
                await queue.playNext();
            }
        }
    }
};

export const stopCommand: MusicCommand = {
    name: 'stop',
    aliases: ['parar'],
    description: 'Para a reprodução de áudio, limpa a fila e desconecta o bot',
    usage: 'core!stop',
    execute: async (message: Message, _args: string[], member: GuildMember) => {
        const queue = musicManager.getQueue(message.guildId!);
        if (!queue || (!queue.currentTrack && queue.tracks.length === 0 && !queue.isPlaying)) {
            const embed = new EmbedBuilder()
                .setColor(0xFEE75C)
                .setDescription('🔇 Não há nenhuma música tocando no momento.');
            await message.reply({ embeds: [embed] });
            return;
        }

        if (member.voice.channelId !== queue.voiceChannel.id) {
            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setDescription('❌ Você precisa estar no mesmo canal de voz que o bot para parar a música!');
            await message.reply({ embeds: [embed] });
            return;
        }

        queue.stop();
        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('⏹️ A reprodução foi encerrada, a fila foi limpa e o bot desconectou.');
        await message.reply({ embeds: [embed] });
    }
};

export const skipCommand: MusicCommand = {
    name: 'skip',
    aliases: ['s', 'pular'],
    description: 'Pula a música atual para a próxima da fila',
    usage: 'core!skip',
    execute: async (message: Message, _args: string[], member: GuildMember) => {
        const queue = musicManager.getQueue(message.guildId!);
        if (!queue || !queue.currentTrack) {
            const embed = new EmbedBuilder()
                .setColor(0xFEE75C)
                .setDescription('🔇 Não há nenhuma música tocando no momento para pular.');
            await message.reply({ embeds: [embed] });
            return;
        }

        if (member.voice.channelId !== queue.voiceChannel.id) {
            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setDescription('❌ Você precisa estar no mesmo canal de voz que o bot para pular a música!');
            await message.reply({ embeds: [embed] });
            return;
        }

        const skippedTitle = queue.currentTrack.title;
        queue.skip();

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setDescription(`⏭️ Música pulada: **${skippedTitle}**`);
        await message.reply({ embeds: [embed] });
    }
};

export const leaveCommand: MusicCommand = {
    name: 'leave',
    aliases: ['sair', 'dc'],
    description: 'Desconecta o bot do canal de voz e encerra a fila',
    usage: 'core!leave',
    execute: async (message: Message, _args: string[], member: GuildMember) => {
        const queue = musicManager.getQueue(message.guildId!);
        if (!queue) {
            const embed = new EmbedBuilder()
                .setColor(0xFEE75C)
                .setDescription('🔇 O bot não está conectado a nenhum canal de voz.');
            await message.reply({ embeds: [embed] });
            return;
        }

        if (member.voice.channelId !== queue.voiceChannel.id) {
            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setDescription('❌ Você precisa estar no mesmo canal de voz que o bot para desconectá-lo!');
            await message.reply({ embeds: [embed] });
            return;
        }

        queue.destroy();
        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('👋 Desconectado do canal de voz com sucesso.');
        await message.reply({ embeds: [embed] });
    }
};

export const queueCommand: MusicCommand = {
    name: 'queue',
    aliases: ['q', 'fila'],
    description: 'Exibe a lista de músicas na fila de reprodução',
    usage: 'core!queue',
    execute: async (message: Message) => {
        const queue = musicManager.getQueue(message.guildId!);
        if (!queue || (!queue.currentTrack && queue.tracks.length === 0)) {
            const embed = new EmbedBuilder()
                .setColor(0xFEE75C)
                .setDescription('📭 A fila de reprodução está vazia no momento.');
            await message.reply({ embeds: [embed] });
            return;
        }

        const current = queue.currentTrack;
        const tracks = queue.tracks;

        const loopDescriptions = {
            off: 'Desativado',
            track: '🔂 Repetir Música',
            queue: '🔁 Repetir Fila'
        };

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`🎶 Fila de Reprodução — ${message.guild?.name || 'Servidor'}`)
            .addFields(
                {
                    name: '🎵 Tocando Agora',
                    value: current
                        ? `[${current.title}](${current.url}) | \`${current.duration}\` | Pedido por: ${current.requestedBy}`
                        : 'Nenhuma',
                    inline: false
                },
                {
                    name: '🔁 Modo de Repetição',
                    value: loopDescriptions[queue.loopMode],
                    inline: true
                },
                {
                    name: '📊 Músicas na Fila',
                    value: `${tracks.length} faixa(s)`,
                    inline: true
                }
            );

        if (tracks.length > 0) {
            const maxDisplay = 10;
            const trackList = tracks.slice(0, maxDisplay).map((t, idx) => {
                return `\`${idx + 1}.\` [${t.title}](${t.url}) - \`${t.duration}\` | ${t.requestedBy}`;
            }).join('\n');

            const remaining = tracks.length - maxDisplay;
            const remainingText = remaining > 0 ? `\n*...e mais ${remaining} faixa(s) na fila*` : '';

            embed.addFields({
                name: '📋 Próximas Faixas',
                value: trackList + remainingText,
                inline: false
            });
        }

        await message.reply({ embeds: [embed] });
    }
};

export const pauseCommand: MusicCommand = {
    name: 'pause',
    aliases: ['pausar'],
    description: 'Pausa a reprodução da música atual',
    usage: 'core!pause',
    execute: async (message: Message, _args: string[], member: GuildMember) => {
        const queue = musicManager.getQueue(message.guildId!);
        if (!queue || !queue.currentTrack) {
            const embed = new EmbedBuilder()
                .setColor(0xFEE75C)
                .setDescription('🔇 Não há nenhuma música tocando no momento para pausar.');
            await message.reply({ embeds: [embed] });
            return;
        }

        if (member.voice.channelId !== queue.voiceChannel.id) {
            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setDescription('❌ Você precisa estar no mesmo canal de voz que o bot!');
            await message.reply({ embeds: [embed] });
            return;
        }

        if (queue.isPaused) {
            const embed = new EmbedBuilder()
                .setColor(0xFEE75C)
                .setDescription('⏸️ A música já está pausada! Use `core!resume` para retomar.');
            await message.reply({ embeds: [embed] });
            return;
        }

        const paused = queue.pause();
        if (paused) {
            const embed = new EmbedBuilder()
                .setColor(0xFEE75C)
                .setDescription('⏸️ Música pausada. Use `core!resume` para continuar a reprodução.');
            await message.reply({ embeds: [embed] });
        } else {
            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setDescription('❌ Não foi possível pausar a música.');
            await message.reply({ embeds: [embed] });
        }
    }
};

export const resumeCommand: MusicCommand = {
    name: 'resume',
    aliases: ['despausar'],
    description: 'Retoma a reprodução da música que estava pausada',
    usage: 'core!resume',
    execute: async (message: Message, _args: string[], member: GuildMember) => {
        const queue = musicManager.getQueue(message.guildId!);
        if (!queue || !queue.currentTrack) {
            const embed = new EmbedBuilder()
                .setColor(0xFEE75C)
                .setDescription('🔇 Não há nenhuma música pausada no momento.');
            await message.reply({ embeds: [embed] });
            return;
        }

        if (member.voice.channelId !== queue.voiceChannel.id) {
            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setDescription('❌ Você precisa estar no mesmo canal de voz que o bot!');
            await message.reply({ embeds: [embed] });
            return;
        }

        if (!queue.isPaused) {
            const embed = new EmbedBuilder()
                .setColor(0xFEE75C)
                .setDescription('▶️ A música não está pausada!');
            await message.reply({ embeds: [embed] });
            return;
        }

        const resumed = queue.resume();
        if (resumed) {
            const embed = new EmbedBuilder()
                .setColor(0x57F287)
                .setDescription('▶️ Reprodução retomada com sucesso!');
            await message.reply({ embeds: [embed] });
        } else {
            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setDescription('❌ Não foi possível retomar a reprodução.');
            await message.reply({ embeds: [embed] });
        }
    }
};

export const nowPlayingCommand: MusicCommand = {
    name: 'nowplaying',
    aliases: ['np', 'tocando'],
    description: 'Exibe detalhes e a barra de progresso da música que está tocando agora',
    usage: 'core!nowplaying',
    execute: async (message: Message) => {
        const queue = musicManager.getQueue(message.guildId!);
        if (!queue || !queue.currentTrack) {
            const embed = new EmbedBuilder()
                .setColor(0xFEE75C)
                .setDescription('🔇 Nenhuma música está tocando no momento.');
            await message.reply({ embeds: [embed] });
            return;
        }

        const track = queue.currentTrack;
        const progress = createProgressBar(queue.playbackDuration, track.durationSeconds);

        const statusIcon = queue.isPaused ? '⏸️ Pausado' : '▶️ Reproduzindo';

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎵 Tocando Agora')
            .setDescription(`[${track.title}](${track.url})`)
            .addFields(
                { name: 'Progresso', value: progress, inline: false },
                { name: 'Status', value: statusIcon, inline: true },
                { name: '👤 Canal/Autor', value: track.author || 'Desconhecido', inline: true },
                { name: '🎧 Pedido por', value: `${track.requestedBy}`, inline: true }
            );

        if (track.thumbnail) {
            embed.setThumbnail(track.thumbnail);
        }

        await message.reply({ embeds: [embed] });
    }
};

export const loopCommand: MusicCommand = {
    name: 'loop',
    aliases: ['repetir'],
    description: 'Alterna ou define o modo de repetição (off, track, queue)',
    usage: 'core!loop [off | track | queue]',
    execute: async (message: Message, args: string[], member: GuildMember) => {
        const queue = musicManager.getQueue(message.guildId!);
        if (!queue || (!queue.currentTrack && queue.tracks.length === 0)) {
            const embed = new EmbedBuilder()
                .setColor(0xFEE75C)
                .setDescription('🔇 Nenhuma música está ativa no momento para configurar o loop.');
            await message.reply({ embeds: [embed] });
            return;
        }

        if (member.voice.channelId !== queue.voiceChannel.id) {
            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setDescription('❌ Você precisa estar no mesmo canal de voz que o bot!');
            await message.reply({ embeds: [embed] });
            return;
        }

        const input = args[0]?.toLowerCase();
        let newMode: 'off' | 'track' | 'queue';

        if (input === 'track' || input === 'faixa' || input === 'musica') {
            newMode = 'track';
        } else if (input === 'queue' || input === 'fila') {
            newMode = 'queue';
        } else if (input === 'off' || input === 'desativado' || input === 'desligar') {
            newMode = 'off';
        } else {
            // Ciclo: off -> track -> queue -> off
            if (queue.loopMode === 'off') newMode = 'track';
            else if (queue.loopMode === 'track') newMode = 'queue';
            else newMode = 'off';
        }

        queue.setLoop(newMode);

        const descriptions = {
            off: '❌ Repetição desativada.',
            track: '🔂 Repetindo a faixa atual continuamente.',
            queue: '🔁 Repetindo toda a fila de reprodução.'
        };

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🔁 Modo de Repetição Alterado')
            .setDescription(descriptions[newMode]);

        await message.reply({ embeds: [embed] });
    }
};

export const helpCommand: MusicCommand = {
    name: 'help',
    aliases: ['ajuda'],
    description: 'Mostra o guia de comandos musicais do prefixo core!',
    usage: 'core!help',
    execute: async (message: Message) => {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎵 Comandos do Sistema de Música (Prefixo `core!`)')
            .setDescription('Gerencie a reprodução de músicas em alta qualidade no seu canal de voz!')
            .addFields(
                {
                    name: '▶️ `core!play <busca/link>` (`core!p`)',
                    value: 'Toca uma música ou playlist (YouTube, SoundCloud, Spotify ou link direto).'
                },
                {
                    name: '⏹️ `core!stop` (`core!parar`)',
                    value: 'Para a reprodução, limpa a fila e desconecta o bot.'
                },
                {
                    name: '⏭️ `core!skip` (`core!s`, `core!pular`)',
                    value: 'Pula a música atual para a próxima da fila.'
                },
                {
                    name: '👋 `core!leave` (`core!sair`, `core!dc`)',
                    value: 'Desconecta o bot do canal de voz.'
                },
                {
                    name: '📋 `core!queue` (`core!q`, `core!fila`)',
                    value: 'Exibe a lista de músicas aguardando na fila.'
                },
                {
                    name: '⏸️ `core!pause` (`core!pausar`)',
                    value: 'Pausa a reprodução atual.'
                },
                {
                    name: '▶️ `core!resume` (`core!despausar`)',
                    value: 'Retoma a reprodução pausada.'
                },
                {
                    name: '🎧 `core!nowplaying` (`core!np`, `core!tocando`)',
                    value: 'Mostra o progresso e dados da música em reprodução.'
                },
                {
                    name: '🔁 `core!loop [off/track/queue]` (`core!repetir`)',
                    value: 'Alterna ou define o modo de repetição de faixa ou fila.'
                },
                {
                    name: '❓ `core!help` (`core!ajuda`)',
                    value: 'Exibe esta mensagem de ajuda.'
                }
            )
            .setFooter({ text: 'BotParceiros CoreBot • Sistema de Áudio' });

        await message.reply({ embeds: [embed] });
    }
};

export const MUSIC_COMMANDS: MusicCommand[] = [
    playCommand,
    stopCommand,
    skipCommand,
    leaveCommand,
    queueCommand,
    pauseCommand,
    resumeCommand,
    nowPlayingCommand,
    loopCommand,
    helpCommand
];

const commandMap = new Map<string, MusicCommand>();
for (const cmd of MUSIC_COMMANDS) {
    commandMap.set(cmd.name.toLowerCase(), cmd);
    for (const alias of cmd.aliases) {
        commandMap.set(alias.toLowerCase(), cmd);
    }
}

export function findMusicCommand(nameOrAlias: string): MusicCommand | undefined {
    return commandMap.get(nameOrAlias.toLowerCase());
}
