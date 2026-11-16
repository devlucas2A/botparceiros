"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HELPCORE_COMMAND = exports.HELPCORE_CATEGORIES = void 0;
exports.isValidCategoryKey = isValidCategoryKey;
exports.buildHelpCoreEmbed = buildHelpCoreEmbed;
exports.buildHelpCoreComponents = buildHelpCoreComponents;
exports.handleHelpCoreCommand = handleHelpCoreCommand;
exports.handleHelpCoreSelectMenu = handleHelpCoreSelectMenu;
exports.handleHelpCoreButton = handleHelpCoreButton;
const discord_js_1 = require("discord.js");
const services_1 = require("../../shared/services");
// ═══════════════════════════════════════════════════════════════════════════
// 📚 DICIONÁRIO CANÔNICO DE CATEGORIAS (7 CATEGORIAS COMPLETAS)
// ═══════════════════════════════════════════════════════════════════════════
exports.HELPCORE_CATEGORIES = {
    overview: {
        id: 'overview',
        label: 'Visão Geral',
        emoji: '🏠',
        description: 'Apresentação do CoreBot, prefixos e links oficiais',
        title: '🏠 CoreBot — Central de Ajuda & Guia Completo',
        embedDescription: 'Bem-vindo à central de ajuda do **CoreBot**!\n\n' +
            'O CoreBot é a solução completa para o seu servidor Discord, unindo **Inteligência Artificial conversacional**, ' +
            '**reprodução de música em alta fidelidade**, **calls privadas dinâmicas**, **sistema de tickets com transcripts**, ' +
            '**moderação inteligente** e **comandos totalmente personalizáveis**.\n\n' +
            'Selecione uma categoria no menu suspenso abaixo para ver a sintaxe, permissões e exemplos práticos de cada comando.',
        fields: [
            {
                name: '📌 Prefixos & Modos de Interação',
                value: '• `/` **(Slash Commands)** — Comandos nativos integrados do Discord.\n' +
                    '• `core!` **(Música)** — Comandos do player de áudio para canais de voz.\n' +
                    '• `ia,` ou `@CoreBot` — Ações administrativas e de moderação por linguagem natural.'
            },
            {
                name: '✨ Módulos Disponíveis',
                value: '• 🎵 **Música (`core!`)**: Player com fila FIFO, suporte a YouTube/Spotify e áudio HD.\n' +
                    '• 🤖 **IA & Servidor**: Construtor autônomo de servidores e assistente generativo.\n' +
                    '• 📞 **Calls Privadas**: Canais temporários automáticos com permissões exclusivas.\n' +
                    '• 🎫 **Tickets & Suporte**: Painel interativo com transcrição de atendimentos.\n' +
                    '• 🛡️ **Moderação & AutoMod**: Anti-raid, anti-spam e ações punitivas por IA.\n' +
                    '• 🪄 **Personalizados & Sociais**: Crie comandos customizados e use interações GIF.'
            },
            {
                name: '🌐 Links Oficiais & Painel Web',
                value: '• 💻 **Dashboard**: [corebot.online](https://corebot.online)\n' +
                    '• 📚 **Documentação**: [corebot.online/docs](https://corebot.online/docs)\n' +
                    '• ⚡ **Status**: Operacional & Conectado'
            }
        ],
        color: 0x7C3AED, // Cyber Violet
        footer: 'CoreBot • Central de Ajuda • Use o menu abaixo para navegar'
    },
    music: {
        id: 'music',
        label: 'Música (core!)',
        emoji: '🎵',
        description: 'Comandos de áudio, fila, reprodução e controles de voz',
        title: '🎵 CoreBot — Sistema de Música (core!)',
        embedDescription: 'O sistema de reprodução musical do CoreBot oferece streaming de alta fidelidade com fila FIFO, ' +
            'suporte a múltiplas fontes (YouTube, Spotify, SoundCloud, links diretos de áudio) e controles de voz completos.\n\n' +
            '**Prefixo exclusivo:** `core!` *(mensagens com esse prefixo não consom créditos de IA)*',
        fields: [
            {
                name: '▶️ Reprodução & Fila',
                value: '• `core!play <busca|link>` (`core!p`) — Conecta ao canal e toca ou adiciona à fila.\n' +
                    '• `core!stop` (`core!parar`) — Para a reprodução imediatamente e limpa a fila.\n' +
                    '• `core!skip` (`core!s`, `core!pular`) — Pula para a próxima música da fila.\n' +
                    '• `core!queue` (`core!q`, `core!fila`) — Exibe a lista de faixas na fila de reprodução.'
            },
            {
                name: '⏸️ Controles de Reprodução',
                value: '• `core!pause` (`core!pausar`) — Pausa a reprodução mantendo a posição atual.\n' +
                    '• `core!resume` (`core!despausar`) — Retoma a música pausada.\n' +
                    '• `core!np` (`core!tocando`) — Mostra a faixa atual com barra de progresso visual.\n' +
                    '• `core!loop [off|track|queue]` (`core!repetir`) — Alterna repetição de faixa ou fila.'
            },
            {
                name: '🚪 Desconexão & Suporte',
                value: '• `core!leave` (`core!sair`, `core!dc`) — Desconecta o bot e encerra a sessão de voz.\n' +
                    '• `core!help` (`core!ajuda`) — Exibe a lista rápida de comandos musicais no chat.'
            },
            {
                name: '💡 Exemplos de Uso',
                value: '• `core!play Bohemian Rhapsody`\n' +
                    '• `core!play https://www.youtube.com/watch?v=fJ9rUzIMcZQ`\n' +
                    '• `core!play https://open.spotify.com/track/...`\n' +
                    '• `core!loop track`'
            }
        ],
        color: 0x5865F2, // Discord Blurple
        footer: 'CoreBot Música • Áudio de alta fidelidade com prefixo core!'
    },
    ai: {
        id: 'ai',
        label: 'IA & Servidor',
        emoji: '🤖',
        description: 'Construção autônoma, ajustes e configuração do assistente',
        title: '🤖 CoreBot — Inteligência Artificial & Arquitetura',
        embedDescription: 'Utilize a potência de modelos de IA de última geração para construir e reorganizar seu servidor ' +
            'Discord do zero ou configurar o assistente inteligente conversacional.',
        fields: [
            {
                name: '🏗️ /construir-servidor',
                value: '• **Uso:** `/construir-servidor tema:<tema> [estilo] [tamanho] [idioma]`\n' +
                    '• **Permissão:** `Administrador`\n' +
                    '• Cria estrutura temática completa de canais, categorias e cargos via IA com confirmação interativa.'
            },
            {
                name: '↩️ /desfazer-servidor',
                value: '• **Uso:** `/desfazer-servidor`\n' +
                    '• **Permissão:** `Administrador`\n' +
                    '• Reverte a última geração de servidor realizada em até 24 horas, restaurando o estado original.'
            },
            {
                name: '🔧 /ajustar-servidor',
                value: '• **Uso:** `/ajustar-servidor acao:<descrição>`\n' +
                    '• **Permissão:** `Administrador`\n' +
                    '• Modifica canais e cargos existentes usando linguagem natural (ex: *Crie categoria VIP com canais exclusivos*).'
            },
            {
                name: '⚙️ /config-ia & /ajuda-ia',
                value: '• `/config-ia canal | personalidade | cargos | status` — Configura parâmetros locais da IA.\n' +
                    '• `/ajuda-ia` — Instruções de configuração e link para o painel de controle web.'
            }
        ],
        color: 0x6366F1, // Slate Indigo
        footer: 'CoreBot IA • Arquitetura autônoma e inteligência artificial'
    },
    calls: {
        id: 'calls',
        label: 'Calls Privadas',
        emoji: '📞',
        description: 'Salas temporárias dinâmicas, limites e permissões',
        title: '📞 CoreBot — Calls Privadas Sob Demanda',
        embedDescription: 'Crie salas de bate-papo em voz temporárias e exclusivas com gerenciamento total de permissões, ' +
            'limites de ocupação e controle total de convites e expulsões.',
        fields: [
            {
                name: '🎙️ /call criar',
                value: '• **Uso:** `/call criar [nome] [limite]`\n' +
                    '• **Permissão:** `Membros`\n' +
                    '• Cria um canal de voz temporário exclusivo. O autor torna-se o dono da sala com privilégios administrativos nela.'
            },
            {
                name: '👥 Gestão de Acesso',
                value: '• `/call convidar usuario:@membro` — Permite que o membro convidado visualize e entre na call.\n' +
                    '• `/call expulsar usuario:@membro` — Remove o usuário da sala e desconecta seu áudio imediatamente.'
            },
            {
                name: '🔒 Privacidade & Lotação',
                value: '• `/call bloquear` — Tranca a sala para que apenas membros autorizados possam entrar.\n' +
                    '• `/call desbloquear` — Destranca a sala permitindo a entrada de qualquer membro do servidor.\n' +
                    '• `/call limite quantidade:N` — Altera o limite máximo de participantes (0 para ilimitado).'
            },
            {
                name: '🧹 Ciclo de Vida Automático',
                value: 'Assim que todos os participantes saírem da call temporária, o canal é excluído automaticamente para manter o servidor limpo.'
            }
        ],
        color: 0x10B981, // Emerald Green
        footer: 'CoreBot Calls • Salas de voz dinâmicas sob demanda'
    },
    tickets: {
        id: 'tickets',
        label: 'Tickets & Suporte',
        emoji: '🎫',
        description: 'Painel de atendimento, categorias e transcripts',
        title: '🎫 CoreBot — Tickets & Atendimento',
        embedDescription: 'Sistema profissional de suporte com painel interativo, roteamento por categorias, ' +
            'controle de atendimento pela equipe e transcrições automáticas de histórico.',
        fields: [
            {
                name: '📋 /ticket-painel',
                value: '• **Uso:** `/ticket-painel`\n' +
                    '• **Permissão:** `Administrador`\n' +
                    '• Envia o painel interativo com menu suspenso de categorias de atendimento para o canal atual.'
            },
            {
                name: '🎯 Abertura de Chamado',
                value: '• Membros selecionam a categoria desejada no menu (ex: Suporte Técnico, Dúvidas, Parcerias, Denúncias).\n' +
                    '• Um canal de texto privado é gerado automaticamente com permissão restrita ao autor e aos cargos de suporte.'
            },
            {
                name: '🛠️ Gerenciamento de Atendimento',
                value: '• **Assumir Ticket**: Atendentes clicam no botão para vincular seu atendimento diretamente ao chamado.\n' +
                    '• **Fechar Ticket**: Encerra o ticket, remove o canal e salva a transcrição completa de todas as mensagens.'
            }
        ],
        color: 0xF59E0B, // Amber Gold
        footer: 'CoreBot Suporte • Atendimento estruturado com transcripts'
    },
    moderation: {
        id: 'moderation',
        label: 'Moderação & Chat IA',
        emoji: '🛡️',
        description: 'Comandos administrativos por linguagem natural e AutoMod',
        title: '🛡️ CoreBot — Moderação & Comandos por IA',
        embedDescription: 'Gerencie e modere seu servidor com agilidade: dê ordens em português claro para a IA ' +
            'ou confie nas regras automáticas de proteção do AutoMod.',
        fields: [
            {
                name: '🗣️ Moderação em Linguagem Natural',
                value: 'Inicie mensagens com `ia,` ou mencione `@CoreBot` (administradores ou cargos autorizados):\n' +
                    '• `ia, castigue @usuario por 10 minutos por spam` (`timeout`)\n' +
                    '• `ia, expulse @usuario` (`kick`) / `ia, bana @usuario` (`ban`)\n' +
                    '• `ia, avise @usuario sobre regras` (`warn`)\n' +
                    '• `ia, apague 50 mensagens` (`clear`)\n' +
                    '• `ia, tranque o canal` (`lock_channel`) / `ia, destranque o canal` (`unlock_channel`)'
            },
            {
                name: '⚙️ Gestão de Estrutura por Texto',
                value: '• `ia, slowmode 5s` — Ativa modo lento no canal.\n' +
                    '• `ia, crie um canal de voz chamado Reunião` (`create_channel`)\n' +
                    '• `ia, dê o cargo Membro para @usuario` (`give_role`)'
            },
            {
                name: '🛡️ AutoMod Inteligente',
                value: 'Proteção ativa contra spam, convites não autorizados, links maliciosos, flood de mensagens, ' +
                    'excesso de menções e linguagem ofensiva, totalmente configurável no Dashboard Web.'
            }
        ],
        color: 0xEF4444, // Destructive Red
        footer: 'CoreBot Moderação • Proteção ativa e moderação por linguagem natural'
    },
    custom: {
        id: 'custom',
        label: 'Personalizados & Sociais',
        emoji: '🪄',
        description: 'Comandos personalizados e interações com GIFs',
        title: '🪄 CoreBot — Comandos Personalizados & Sociais',
        embedDescription: 'Crie comandos únicos com lógica dinâmica pelo Dashboard Web e divirta a comunidade ' +
            'com comandos sociais de interação e GIFs animados.',
        fields: [
            {
                name: '🛠️ Criando Comandos Customizados',
                value: '• Acesse o Dashboard em [corebot.online](https://corebot.online) > **Comandos Personalizados**.\n' +
                    '• Defina gatilhos slash (`/exemplo`) ou texto e combine múltiplas ações:\n' +
                    '  - Respostas em texto ou Embeds estilizados.\n' +
                    '  - Adição ou remoção automática de cargos de membros.\n' +
                    '  - Envio de mensagens no canal ou na DM do solicitante.\n' +
                    '  - Consultas a APIs externas (clima, imagem da NASA APOD, filmes).'
            },
            {
                name: '🎭 Interações Sociais com GIFs',
                value: 'Comandos de carinho, diversão e interação com botão de retribuição em tempo real:\n' +
                    '• `/abracar @usuario` — Dá um abraço quentinho.\n' +
                    '• `/beijar @usuario` — Envia um beijo doce.\n' +
                    '• `/tapa @usuario` — Aplica um tapa de alerta!\n' +
                    '• Outras interações: `/cafune`, `/morder`, `/dancar`, `/conchinha`, `/cutucar`, `/aceno`, `/piscar`, `/highfive`, `/yeet`.'
            },
            {
                name: '🔄 Botão de Retribuição',
                value: 'As mensagens de GIF contam com botão de retribuição seguro: apenas quem recebeu ' +
                    'a interação pode clicar para retribuir automaticamente!'
            }
        ],
        color: 0xEC4899, // Pink Magic
        footer: 'CoreBot Personalizados • Diversão e customização para sua comunidade'
    }
};
// ═══════════════════════════════════════════════════════════════════════════
// 🛠️ SLASH COMMAND BUILDER
// ═══════════════════════════════════════════════════════════════════════════
exports.HELPCORE_COMMAND = new discord_js_1.SlashCommandBuilder()
    .setName('helpcore')
    .setDescription('Central de ajuda interativa e guia completo de comandos do CoreBot')
    .addStringOption(option => option
    .setName('categoria')
    .setDescription('Selecione uma categoria para consulta direta')
    .setRequired(false)
    .addChoices({ name: '🏠 Visão Geral', value: 'overview' }, { name: '🎵 Música (core!)', value: 'music' }, { name: '🤖 IA & Servidor', value: 'ai' }, { name: '📞 Calls Privadas', value: 'calls' }, { name: '🎫 Tickets & Suporte', value: 'tickets' }, { name: '🛡️ Moderação & Chat IA', value: 'moderation' }, { name: '🪄 Personalizados & Sociais', value: 'custom' }));
// ═══════════════════════════════════════════════════════════════════════════
// 🎨 GERADORES DE EMBED & COMPONENTES INTERATIVOS
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Validador seguro de chaves de categoria (type guard).
 * Previne vulnerabilidades de Prototype Pollution ao rejeitar propriedades herdadas de Object.prototype
 * como 'constructor', 'toString', 'valueOf', '__proto__', etc.
 */
function isValidCategoryKey(key) {
    return typeof key === 'string' && Object.prototype.hasOwnProperty.call(exports.HELPCORE_CATEGORIES, key);
}
/**
 * Constrói o Embed estilizado para a categoria especificada.
 */
function buildHelpCoreEmbed(categoryKey) {
    const key = isValidCategoryKey(categoryKey) ? categoryKey : 'overview';
    const category = exports.HELPCORE_CATEGORIES[key];
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(category.title)
        .setDescription(category.embedDescription)
        .setColor(category.color)
        .setFooter({ text: category.footer || 'CoreBot • Central de Ajuda' })
        .setTimestamp();
    for (const field of category.fields) {
        embed.addFields({
            name: field.name,
            value: field.value,
            inline: field.inline ?? false
        });
    }
    return embed;
}
/**
 * Constrói a linha de seleção (Select Menu) e botões de ação (Dashboard, Docs, Início).
 */
function buildHelpCoreComponents(currentCategory = 'overview') {
    const activeKey = isValidCategoryKey(currentCategory) ? currentCategory : 'overview';
    // 1. StringSelectMenu com todas as 7 categorias
    const selectMenu = new discord_js_1.StringSelectMenuBuilder()
        .setCustomId('helpcore_category_select')
        .setPlaceholder('Selecione uma categoria para explorar...')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(Object.values(exports.HELPCORE_CATEGORIES).map(cat => ({
        label: cat.label,
        value: cat.id,
        description: cat.description,
        emoji: cat.emoji,
        default: cat.id === activeKey
    })));
    const selectRow = new discord_js_1.ActionRowBuilder().addComponents(selectMenu);
    // 2. ActionRow de Botões (Início, Dashboard, Docs)
    const homeButton = new discord_js_1.ButtonBuilder()
        .setCustomId('helpcore:home')
        .setLabel('🏠 Início')
        .setStyle(activeKey === 'overview' ? discord_js_1.ButtonStyle.Primary : discord_js_1.ButtonStyle.Secondary);
    const dashboardButton = new discord_js_1.ButtonBuilder()
        .setLabel('Dashboard')
        .setEmoji('🌐')
        .setStyle(discord_js_1.ButtonStyle.Link)
        .setURL('https://corebot.online');
    const docsButton = new discord_js_1.ButtonBuilder()
        .setLabel('Documentação')
        .setEmoji('📚')
        .setStyle(discord_js_1.ButtonStyle.Link)
        .setURL('https://corebot.online/docs');
    const buttonRow = new discord_js_1.ActionRowBuilder().addComponents(homeButton, dashboardButton, docsButton);
    return [selectRow, buttonRow];
}
// ═══════════════════════════════════════════════════════════════════════════
// ⚡ INTERACTION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Trata a execução inicial do comando slash `/helpcore`.
 */
async function handleHelpCoreCommand(interaction) {
    try {
        const categoryOption = interaction.options.getString('categoria');
        const categoryKey = isValidCategoryKey(categoryOption) ? categoryOption : 'overview';
        const embed = buildHelpCoreEmbed(categoryKey);
        const components = buildHelpCoreComponents(categoryKey);
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({
                embeds: [embed],
                components
            });
        }
        else {
            await interaction.reply({
                embeds: [embed],
                components,
                ephemeral: false
            });
        }
    }
    catch (error) {
        services_1.logger.error('Erro ao executar /helpcore:', { error });
        const errorPayload = {
            content: '❌ Ocorreu um erro ao carregar a central de ajuda do CoreBot. Tente novamente mais tarde.',
            ephemeral: true
        };
        if (interaction.deferred || interaction.replied) {
            await interaction.followUp(errorPayload).catch(() => { });
        }
        else {
            await interaction.reply(errorPayload).catch(() => { });
        }
    }
}
/**
 * Trata interações de menu suspenso `helpcore_category_select`.
 */
async function handleHelpCoreSelectMenu(interaction) {
    try {
        const selectedValue = interaction.values?.[0];
        const categoryKey = isValidCategoryKey(selectedValue) ? selectedValue : 'overview';
        const embed = buildHelpCoreEmbed(categoryKey);
        const components = buildHelpCoreComponents(categoryKey);
        await interaction.update({
            embeds: [embed],
            components
        });
    }
    catch (error) {
        services_1.logger.error('Erro ao processar seleção no /helpcore:', { error });
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Ocorreu um erro ao atualizar a categoria.',
                ephemeral: true
            }).catch(() => { });
        }
    }
}
/**
 * Trata interações de botão iniciadas com `helpcore:`.
 */
async function handleHelpCoreButton(interaction) {
    try {
        if (interaction.customId === 'helpcore:home') {
            const embed = buildHelpCoreEmbed('overview');
            const components = buildHelpCoreComponents('overview');
            await interaction.update({
                embeds: [embed],
                components
            });
        }
    }
    catch (error) {
        services_1.logger.error('Erro ao processar botão do /helpcore:', { error });
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Ocorreu um erro ao processar o botão.',
                ephemeral: true
            }).catch(() => { });
        }
    }
}
//# sourceMappingURL=command.js.map