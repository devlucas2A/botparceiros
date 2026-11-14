"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverBuilder = exports.ServerBuilderService = void 0;
const discord_js_1 = require("discord.js");
const llm_service_1 = require("./llm.service");
const index_1 = require("./index");
// ═══════════════════════════════════════════════════════════════════════════
// 🎨 PROMPTS PREMIUM PARA LLM
// ═══════════════════════════════════════════════════════════════════════════
const SERVER_BUILDER_PROMPT = `
Você é um DESIGNER de Servidores Discord PREMIUM.

REGRAS OBRIGATÓRIAS DE NOMEAÇÃO:

1. CATEGORIAS devem ter decoração nos DOIS lados:
   CORRETO: "━━━ 📌 INFORMAÇÕES ━━━"
   CORRETO: "✦ Centro de Ajuda ✦"  
   CORRETO: "╔═══ 🎭 SOCIAL ═══╗"
   ERRADO: "Informações" (sem decoração)
   ERRADO: "📌 Informações" (só um lado)

2. CANAIS DE TEXTO devem ter: emoji + ┃ + nome
   CORRETO: "📜┃regras"
   CORRETO: "�┃chat-geral"
   CORRETO: "🎫┃abrir-ticket"
   ERRADO: "📜-regras" (hífen no lugar de ┃)
   ERRADO: "regras" (sem emoji)

3. CANAIS DE VOZ devem ter: emoji + ┃ + nome
   CORRETO: "🔊┃lounge-geral"
   CORRETO: "🎵┃sala-de-musica"
   ERRADO: "🔊-lounge" (hífen no lugar de ┃)

4. Use user_limit em canais de voz:
   - 0 = sem limite
   - 2 = duo
   - 5-10 = grupos
   - 99 = eventos

EXEMPLO DE JSON PERFEITO:
{
  "roles": [
    { "name": "👑 Fundador", "color": "#FFD700", "permissions": ["Administrator"], "hoist": true },
    { "name": "⚔️ Staff", "color": "#00D4FF", "permissions": ["ManageMessages", "KickMembers"], "hoist": true },
    { "name": "💎 VIP", "color": "#9B59B6", "permissions": ["SendMessages"], "hoist": true },
    { "name": "🌟 Membro", "color": "#2ECC71", "permissions": ["SendMessages"] }
  ],
  "categories": [
    {
      "name": "━━━ 📌 INFORMAÇÕES ━━━",
      "channels": [
        { "name": "📜┃regras", "type": "text", "description": "Regras do servidor" },
        { "name": "📢┃avisos", "type": "announcement", "description": "Avisos oficiais" },
        { "name": "🚀┃portal", "type": "text", "description": "Bem-vindo ao servidor" }
      ]
    },
    {
      "name": "✦ COMUNIDADE ✦",
      "channels": [
        { "name": "💬┃chat-geral", "type": "text" },
        { "name": "🎮┃gaming", "type": "text" },
        { "name": "�┃midias", "type": "text" },
        { "name": "🎭┃off-topic", "type": "text" }
      ]
    },
    {
      "name": "╔═══ 🎫 SUPORTE ═══╗",
      "channels": [
        { "name": "🎫┃abrir-ticket", "type": "text" },
        { "name": "❓┃faq", "type": "text" },
        { "name": "�┃sugestoes", "type": "text" }
      ]
    },
    {
      "name": "》🔊 LOUNGE《",
      "channels": [
        { "name": "🔊┃conversa-geral", "type": "voice", "user_limit": 0 },
        { "name": "🎵┃musica", "type": "voice", "user_limit": 8 },
        { "name": "🎮┃gaming-duo", "type": "voice", "user_limit": 2 },
        { "name": "💎┃vip-lounge", "type": "voice", "user_limit": 5, "is_private": true }
      ]
    }
  ]
}

REGRAS TÉCNICAS:
- Responda APENAS com JSON válido
- "type": "text", "voice", "stage", "forum", ou "announcement"
- "color": formato hex (#RRGGBB)
- "permissions": Administrator, KickMembers, BanMembers, ManageMessages, SendMessages
- Use o caractere ┃ (não | nem - nem :)
`;
const SERVER_ADJUSTER_PROMPT = `
Você é um ADMINISTRADOR de Servidores Discord.
Analise o pedido e gere AÇÕES para modificar o servidor.

REGRAS DE NOMEAÇÃO:
- Categorias: "━━━ 📌 NOME ━━━" ou "✦ NOME ✦"
- Canais: "📢┃nome-do-canal" (emoji + ┃ + nome)

AÇÕES DISPONÍVEIS:
- create_category: criar categoria decorada
- create_channel: criar canal com emoji┃nome
- rename_category/rename_channel: renomear
- delete_category/delete_channel: deletar
- create_role: criar cargo colorido
- set_user_limit: definir limite de voz

EXEMPLO JSON:
{
  "actions": [
    { "type": "create_category", "name": "━━━ 🎮 GAMING ━━━" },
    { "type": "create_channel", "category_name": "GAMING", "name": "🎮┃valorant", "channel_type": "text" },
    { "type": "create_channel", "category_name": "GAMING", "name": "🔊┃sala-valorant", "channel_type": "voice", "user_limit": 5 }
  ],
  "message": "Criada categoria Gaming com canais de texto e voz"
}

Responda APENAS com JSON válido.
`;
// ═══════════════════════════════════════════════════════════════════════════
// 🏗️ SERVER BUILDER SERVICE
// ═══════════════════════════════════════════════════════════════════════════
class ServerBuilderService {
    /**
     * Mapeia tipo de canal do schema para ChannelType do Discord.js
     */
    getChannelType(type) {
        switch (type) {
            case 'voice': return discord_js_1.ChannelType.GuildVoice;
            case 'stage': return discord_js_1.ChannelType.GuildStageVoice;
            case 'forum': return discord_js_1.ChannelType.GuildForum;
            case 'announcement': return discord_js_1.ChannelType.GuildAnnouncement;
            default: return discord_js_1.ChannelType.GuildText;
        }
    }
    /**
     * Pós-processador: Garante que todos os nomes sigam o padrão decorativo
     */
    postProcessSchema(schema) {
        // Emojis para cada tipo de canal
        const channelEmojis = {
            'regra': ['📜', '📋', '⚖️'],
            'aviso': ['📢', '🔔', '📣'],
            'portal': ['🚀', '🌟', '✨'],
            'chat': ['💬', '🗣️', '💭'],
            'geral': ['💬', '🌐', '🏠'],
            'off': ['🎭', '🎲', '🎪'],
            'midia': ['📷', '🖼️', '📸'],
            'gaming': ['🎮', '🕹️', '👾'],
            'ticket': ['🎫', '📩', '✉️'],
            'suporte': ['🛠️', '💡', '❓'],
            'faq': ['❓', '💡', '📚'],
            'sugestao': ['📝', '💡', '✍️'],
            'voz': ['🔊', '🎙️', '🔉'],
            'lounge': ['🔊', '☕', '🛋️'],
            'musica': ['🎵', '🎶', '🎸'],
            'duo': ['🎮', '👥', '🤝'],
            'palco': ['🎤', '🎭', '🌟'],
            'vip': ['💎', '👑', '⭐'],
            'boas': ['👋', '🙌', '✋'],
            'bem': ['👋', '🏠', '🌟'],
            'default': ['📌', '💠', '🔹']
        };
        // Decorações para categorias
        const categoryDecorations = [
            (name) => `━━━ ${name} ━━━`,
            (name) => `✦ ${name} ✦`,
            (name) => `╔═══ ${name} ═══╗`,
            (name) => `》${name}《`,
            (name) => `── ✧ ${name} ✧ ──`
        ];
        // Função para encontrar emoji apropriado
        const findEmoji = (name) => {
            const nameLower = name.toLowerCase();
            for (const [key, emojis] of Object.entries(channelEmojis)) {
                if (nameLower.includes(key)) {
                    return emojis[0];
                }
            }
            return channelEmojis['default'][0];
        };
        // Função para formatar nome de canal
        const formatChannelName = (name) => {
            // Remove emojis existentes para garantir padrão
            let cleanName = name.replace(/^[\p{Emoji}\p{Emoji_Component}\u200d]+[\s\-:┃|・]*/gu, '').trim();
            // Remove caracteres especiais iniciais como - ou |
            cleanName = cleanName.replace(/^[\s\-:┃|・]+/, '').trim();
            // Se ficou vazio, usa fallback
            if (!cleanName)
                cleanName = 'canal';
            // Encontra emoji apropriado (se não tiver)
            const emoji = findEmoji(cleanName);
            // Formata forçando a barra vertical: emoji┃nome-com-hifens
            // Substitui espaços por hifens no nome
            const finalName = cleanName.toLowerCase().replace(/\s+/g, '-');
            return `${emoji}┃${finalName}`;
        };
        // Função para formatar nome de categoria
        const formatCategoryName = (name, index) => {
            // Verifica se JÁ ESTÁ PERFEITO (exatamente como queremos)
            if (/^━━━ .* ━━━$/.test(name) || /^✦ .* ✦$/.test(name) || /^╔═══ .* ═══╗$/.test(name)) {
                return name;
            }
            // Limpa decorações parciais ou erradas
            let cleanName = name
                .replace(/^[━✦╔》──\s\p{Emoji}]+/gu, '') // Remove prefixos
                .replace(/[━✦╗《──\s\p{Emoji}]+$/gu, '') // Remove sufixos
                .trim()
                .toUpperCase();
            if (!cleanName)
                cleanName = name.toUpperCase();
            // Escolhe a decoração baseada no índice
            const decoration = categoryDecorations[index % categoryDecorations.length];
            return decoration(cleanName);
        };
        // Aplica formatação nas categorias e canais
        if (schema.categories && Array.isArray(schema.categories)) {
            schema.categories = schema.categories.map((cat, catIndex) => ({
                ...cat,
                name: formatCategoryName(cat.name, catIndex),
                channels: cat.channels?.map(chan => ({
                    ...chan,
                    name: formatChannelName(chan.name)
                })) || []
            }));
        }
        // Garante que cargos tenham emojis
        if (schema.roles && Array.isArray(schema.roles)) {
            const roleEmojis = ['👑', '⚔️', '💎', '🌟', '🔰', '🎭'];
            schema.roles = schema.roles.map((role, index) => {
                let roleName = role.name;
                if (!/^[\p{Emoji}]/u.test(role.name)) {
                    const emoji = roleEmojis[index % roleEmojis.length];
                    roleName = `${emoji} ${role.name}`;
                }
                return { ...role, name: roleName };
            });
        }
        return schema;
    }
    /**
     * Passo 1: Gerar o plano JSON com a LLM.
     * Aceita opcoes estruturadas e contexto do servidor existente para
     * que a IA evite duplicatas e personalize tamanho/estilo/idioma.
     */
    async generateServerPlan(theme, options = {}, existingState) {
        index_1.logger.info(`🏗️ Gerando plano de servidor PREMIUM para tema: ${theme}`, { options });
        const sizeHint = {
            enxuto: 'TAMANHO: ENXUTO — 2-3 categorias, 8-12 canais no total, 3-4 cargos.',
            medio: 'TAMANHO: MEDIO — 3-4 categorias, 15-22 canais, 5-6 cargos.',
            completo: 'TAMANHO: COMPLETO — 5-7 categorias, 25-35 canais, 6-8 cargos.',
        };
        const styleHint = {
            gaming: 'ESTILO: GAMING — categorias por jogo, canais de matchmaking, lounges de voz por jogo.',
            comunidade: 'ESTILO: COMUNIDADE — chats por tema, canais de interacao social, eventos.',
            rpg: 'ESTILO: RPG — areas IC/OOC, fichas, dados, sessoes, masterizacao.',
            educacional: 'ESTILO: EDUCACIONAL — materias, salas de estudo, suporte, biblioteca.',
            empresa: 'ESTILO: EMPRESA — departamentos, reunioes, anuncios oficiais, RH.',
            outro: 'ESTILO: GENERICO — adapte ao tema fornecido.',
        };
        const languageHint = {
            pt: 'IDIOMA: Portugues do Brasil. Nomes e descricoes em pt-BR.',
            en: 'IDIOMA: Ingles. Nomes e descricoes em English.',
            es: 'IDIOMA: Espanhol. Nomes e descricoes em Espanol.',
        };
        const hints = [];
        if (options.tamanho)
            hints.push(sizeHint[options.tamanho]);
        if (options.estilo)
            hints.push(styleHint[options.estilo]);
        if (options.idioma)
            hints.push(languageHint[options.idioma]);
        // Contexto do servidor atual — instrui a IA a NAO duplicar
        let existingContext = '';
        if (existingState && (existingState.roles.length || existingState.channels.length)) {
            const trim = (arr, max = 30) => arr.slice(0, max).join(', ') + (arr.length > max ? `... (+${arr.length - max})` : '');
            existingContext = `
═══════════════════════════════════════════════════════════════════════════════
🔍 ESTADO ATUAL DO SERVIDOR (NAO DUPLICAR):
Cargos existentes: ${trim(existingState.roles)}
Categorias existentes: ${trim(existingState.categories)}
Canais existentes: ${trim(existingState.channels, 50)}

REGRA CRITICA: NAO recrie itens que ja existem. Complete o que falta,
sugerindo nomes novos e categorias que se encaixam no tema sem conflitar.
`;
        }
        const enhancedPrompt = `
${SERVER_BUILDER_PROMPT}

═══════════════════════════════════════════════════════════════════════════════
🎯 TEMA DO SERVIDOR: ${theme}
${hints.length ? '\n' + hints.join('\n') + '\n' : ''}${existingContext}
═══════════════════════════════════════════════════════════════════════════════

Crie uma estrutura COMPLETA e PREMIUM seguindo as instrucoes acima.
Use emojis RELEVANTES ao tema. Crie nomes CRIATIVOS e DECORADOS.

CAMPOS OPCIONAIS QUE VOCE PODE USAR:
- "is_readonly": true em canais como regras, anuncios, faq (somente staff posta)
- "is_private": true em canais staff/vip
- "writable_roles": ["NomeDoCargo"] (para readonly — quem pode postar)
- "allowed_roles": ["NomeDoCargo"] (para private — quem ve)
- "initial_message": "Texto de boas-vindas..." em canais especiais (regras, portal, faq).
  Use apenas em canais cujo proposito beneficia de uma mensagem inicial postada pelo bot.
`;
        const rawSchema = await llm_service_1.llmService.generateJson(enhancedPrompt, `Crie o servidor com tema: "${theme}". Seja criativo e profissional!`);
        if (rawSchema) {
            index_1.logger.info('🔧 Aplicando pós-processamento de formatação...');
            return this.postProcessSchema(rawSchema);
        }
        return null;
    }
    /** Coleta o estado atual do servidor para passar a IA na Fase 2 (awareness). */
    collectExistingState(guild) {
        return {
            roles: guild.roles.cache
                .filter(r => r.name !== '@everyone' && !r.managed)
                .map(r => r.name),
            categories: guild.channels.cache
                .filter(c => c.type === discord_js_1.ChannelType.GuildCategory)
                .map(c => c.name),
            channels: guild.channels.cache
                .filter(c => c.type !== discord_js_1.ChannelType.GuildCategory)
                .map(c => c.name),
        };
    }
    /**
     * Passo 2: Construir o servidor com todas as features.
     *
     * Paridade com a rota web /api/server-builder/apply:
     * - is_readonly + writable_roles (somente staff posta)
     * - is_private + allowed_roles (visivel apenas para alguns cargos)
     * - Fallback Community: se servidor nao e Community, converte
     *   Stage/Forum/Announcement em Voice/Text automaticamente
     * - Mensagens iniciais postadas em canais especiais (regras/portal/faq)
     * - Retorna BuildResult com os IDs criados (suporte a undo)
     */
    async buildServer(guild, schema, progressCallback) {
        const result = {
            role_ids: [],
            category_ids: [],
            channel_ids: [],
            errors: [],
        };
        const notify = (p) => {
            index_1.logger.info(`[ServerBuilder] ${guild.id} ${p.phase} ${p.current}/${p.total}: ${p.label}`);
            if (progressCallback) {
                try {
                    progressCallback(p);
                }
                catch { /* nao deixa um callback ruim quebrar o build */ }
            }
        };
        const roleCount = schema.roles?.length || 0;
        const categoryCount = schema.categories?.length || 0;
        const channelDefs = schema.categories?.flatMap(c => c.channels || []) || [];
        const channelCount = channelDefs.length;
        const messageDefs = channelDefs.filter(c => c.initial_message?.trim());
        const messageCount = messageDefs.length;
        const isCommunity = guild.features?.includes('COMMUNITY');
        // ─── 1. Cargos ───────────────────────────────────────────────
        const roleMap = new Map();
        if (schema.roles && Array.isArray(schema.roles)) {
            for (let i = 0; i < schema.roles.length; i++) {
                const roleDef = schema.roles[i];
                try {
                    const permissions = (roleDef.permissions || []).map(p => {
                        const perm = discord_js_1.PermissionFlagsBits[p];
                        return perm || discord_js_1.PermissionFlagsBits.SendMessages;
                    });
                    const role = await guild.roles.create({
                        name: roleDef.name,
                        color: (roleDef.color || '#99AAB5'),
                        permissions: permissions,
                        hoist: roleDef.hoist || false,
                        mentionable: roleDef.mentionable || false,
                        reason: 'Server Builder AI'
                    });
                    roleMap.set(roleDef.name, role);
                    result.role_ids.push(role.id);
                    notify({ phase: 'roles', current: i + 1, total: roleCount, label: `Cargo: ${role.name}` });
                }
                catch (error) {
                    result.errors.push(`Cargo ${roleDef.name}: ${error?.message || 'erro'}`);
                    index_1.logger.error(`Erro ao criar cargo ${roleDef.name}:`, { error });
                }
            }
        }
        // ─── 2. Categorias + Canais ──────────────────────────────────
        let channelIdx = 0;
        if (schema.categories && Array.isArray(schema.categories)) {
            for (let ci = 0; ci < schema.categories.length; ci++) {
                const catDef = schema.categories[ci];
                let category;
                try {
                    category = await guild.channels.create({
                        name: catDef.name,
                        type: discord_js_1.ChannelType.GuildCategory,
                        reason: 'Server Builder AI'
                    });
                    result.category_ids.push(category.id);
                    notify({
                        phase: 'categories',
                        current: ci + 1,
                        total: categoryCount,
                        label: `Categoria: ${catDef.name}`
                    });
                }
                catch (error) {
                    result.errors.push(`Categoria ${catDef.name}: ${error?.message || 'erro'}`);
                    index_1.logger.error(`Erro ao criar categoria ${catDef.name}`, { error });
                    continue;
                }
                if (!catDef.channels || !Array.isArray(catDef.channels))
                    continue;
                for (const chanDef of catDef.channels) {
                    channelIdx++;
                    try {
                        const channelType = this.getChannelType(chanDef.type);
                        const isVoiceType = [discord_js_1.ChannelType.GuildVoice, discord_js_1.ChannelType.GuildStageVoice].includes(channelType);
                        const permissionOverwrites = this.buildChannelPermissions(guild, chanDef, roleMap);
                        let effectiveType = channelType;
                        // Fallback Community: se servidor nao tem Community feature,
                        // converte Announcement/Forum em Text e Stage em Voice.
                        if (!isCommunity) {
                            if (channelType === discord_js_1.ChannelType.GuildAnnouncement || channelType === discord_js_1.ChannelType.GuildForum) {
                                effectiveType = discord_js_1.ChannelType.GuildText;
                            }
                            else if (channelType === discord_js_1.ChannelType.GuildStageVoice) {
                                effectiveType = discord_js_1.ChannelType.GuildVoice;
                            }
                        }
                        const channelOptions = {
                            name: chanDef.name,
                            type: effectiveType,
                            parent: category.id,
                            permissionOverwrites,
                            reason: 'Server Builder AI'
                        };
                        if (effectiveType === discord_js_1.ChannelType.GuildText || effectiveType === discord_js_1.ChannelType.GuildAnnouncement) {
                            if (chanDef.description)
                                channelOptions.topic = chanDef.description;
                            if (chanDef.slowmode)
                                channelOptions.rateLimitPerUser = chanDef.slowmode;
                            if (chanDef.nsfw)
                                channelOptions.nsfw = chanDef.nsfw;
                        }
                        if (isVoiceType && chanDef.user_limit !== undefined) {
                            channelOptions.userLimit = chanDef.user_limit;
                        }
                        const created = await guild.channels.create(channelOptions);
                        result.channel_ids.push(created.id);
                        notify({
                            phase: 'channels',
                            current: channelIdx,
                            total: channelCount,
                            label: `Canal: ${chanDef.name}`
                        });
                    }
                    catch (err) {
                        result.errors.push(`Canal ${chanDef.name}: ${err?.message || 'erro'}`);
                        index_1.logger.error(`Erro ao criar canal ${chanDef.name}`, { err });
                    }
                }
            }
        }
        // ─── 3. Mensagens iniciais ───────────────────────────────────
        if (messageCount > 0) {
            let msgIdx = 0;
            for (const cat of schema.categories || []) {
                for (const chDef of cat.channels || []) {
                    if (!chDef.initial_message?.trim())
                        continue;
                    msgIdx++;
                    try {
                        // Localizar canal recem-criado pelo nome dentro da categoria certa
                        const created = guild.channels.cache.find(c => c.name === chDef.name && c.parent?.name === cat.name);
                        if (created && typeof created.send === 'function') {
                            await created.send({ content: chDef.initial_message.slice(0, 2000) });
                            notify({
                                phase: 'messages',
                                current: msgIdx,
                                total: messageCount,
                                label: `Mensagem em ${chDef.name}`
                            });
                        }
                    }
                    catch (err) {
                        result.errors.push(`Mensagem inicial em ${chDef.name}: ${err?.message || 'erro'}`);
                    }
                }
            }
        }
        notify({
            phase: 'done',
            current: channelCount,
            total: channelCount,
            label: `Concluido: ${roleCount} cargos, ${categoryCount} categorias, ${channelCount} canais`
        });
        return result;
    }
    /** Constroi permission overwrites para is_private e is_readonly. */
    buildChannelPermissions(guild, chanDef, roleMap) {
        const overwrites = [];
        // Private: nega ViewChannel para @everyone, permite para allowed_roles
        if (chanDef.is_private) {
            overwrites.push({
                id: guild.id, // @everyone
                deny: [discord_js_1.PermissionFlagsBits.ViewChannel],
            });
            for (const roleName of chanDef.allowed_roles || []) {
                const role = roleMap.get(roleName);
                if (role) {
                    overwrites.push({
                        id: role.id,
                        allow: [discord_js_1.PermissionFlagsBits.ViewChannel, discord_js_1.PermissionFlagsBits.SendMessages],
                    });
                }
            }
        }
        // Readonly: nega SendMessages para @everyone, permite para writable_roles
        if (chanDef.is_readonly) {
            const existing = overwrites.find(o => o.id === guild.id);
            if (existing) {
                existing.deny = [...(existing.deny || []), discord_js_1.PermissionFlagsBits.SendMessages];
            }
            else {
                overwrites.push({
                    id: guild.id,
                    deny: [discord_js_1.PermissionFlagsBits.SendMessages],
                });
            }
            for (const roleName of chanDef.writable_roles || []) {
                const role = roleMap.get(roleName);
                if (!role)
                    continue;
                const existingRole = overwrites.find(o => o.id === role.id);
                if (existingRole) {
                    existingRole.allow = [...(existingRole.allow || []), discord_js_1.PermissionFlagsBits.SendMessages];
                }
                else {
                    overwrites.push({
                        id: role.id,
                        allow: [discord_js_1.PermissionFlagsBits.SendMessages],
                    });
                }
            }
        }
        return overwrites;
    }
    /**
     * Gerar plano de ajustes
     */
    async generateAdjustmentPlan(userRequest) {
        index_1.logger.info(`🔧 Gerando plano de ajuste: ${userRequest}`);
        return await llm_service_1.llmService.generateJson(SERVER_ADJUSTER_PROMPT, `PEDIDO DO USUÁRIO: ${userRequest}`);
    }
    /**
     * Aplicar ajustes no servidor
     */
    async applyAdjustments(guild, schema, progressCallback) {
        const notify = (msg) => {
            index_1.logger.info(`[ServerAdjuster] ${guild.id}: ${msg}`);
            if (progressCallback)
                progressCallback(msg);
        };
        notify(`🔧 Aplicando ${schema.actions.length} ajustes...`);
        for (const action of schema.actions) {
            try {
                switch (action.type) {
                    case 'create_category': {
                        await guild.channels.create({
                            name: action.name,
                            type: discord_js_1.ChannelType.GuildCategory,
                            reason: 'Server Adjuster AI'
                        });
                        notify(`📂 Categoria criada: ${action.name}`);
                        break;
                    }
                    case 'create_channel': {
                        const category = guild.channels.cache.find(c => c.type === discord_js_1.ChannelType.GuildCategory &&
                            c.name.toLowerCase().includes(action.category_name?.toLowerCase() || ''));
                        const channelType = this.getChannelType(action.channel_type || 'text');
                        const isVoiceType = [discord_js_1.ChannelType.GuildVoice, discord_js_1.ChannelType.GuildStageVoice].includes(channelType);
                        const options = {
                            name: action.name,
                            type: channelType,
                            parent: category?.id,
                            reason: 'Server Adjuster AI'
                        };
                        if (isVoiceType && action.user_limit !== undefined) {
                            options.userLimit = action.user_limit;
                        }
                        await guild.channels.create(options);
                        notify(`📢 Canal criado: ${action.name}`);
                        break;
                    }
                    case 'set_user_limit': {
                        const voiceChannel = guild.channels.cache.find(c => c.type === discord_js_1.ChannelType.GuildVoice &&
                            c.name.toLowerCase().includes(action.name?.toLowerCase() || ''));
                        if (voiceChannel && 'setUserLimit' in voiceChannel) {
                            await voiceChannel.setUserLimit(action.user_limit || 0);
                            notify(`👥 Limite definido: ${action.name} → ${action.user_limit} usuários`);
                        }
                        break;
                    }
                    case 'rename_category': {
                        const cat = guild.channels.cache.find(c => c.type === discord_js_1.ChannelType.GuildCategory &&
                            c.name.toLowerCase().includes(action.old_name?.toLowerCase() || ''));
                        if (cat) {
                            await cat.setName(action.new_name);
                            notify(`✏️ Categoria renomeada: ${action.old_name} → ${action.new_name}`);
                        }
                        break;
                    }
                    case 'rename_channel': {
                        const chan = guild.channels.cache.find(c => c.name.toLowerCase().includes(action.old_name?.toLowerCase() || ''));
                        if (chan && 'setName' in chan) {
                            await chan.setName(action.new_name);
                            notify(`✏️ Canal renomeado: ${action.old_name} → ${action.new_name}`);
                        }
                        break;
                    }
                    case 'delete_category': {
                        const catToDel = guild.channels.cache.find(c => c.type === discord_js_1.ChannelType.GuildCategory &&
                            c.name.toLowerCase().includes(action.name?.toLowerCase() || ''));
                        if (catToDel) {
                            // Deletar canais filhos primeiro
                            const children = guild.channels.cache.filter(c => 'parentId' in c && c.parentId === catToDel.id);
                            for (const child of children.values()) {
                                await child.delete('Server Adjuster AI - Deletando categoria pai');
                            }
                            await catToDel.delete('Server Adjuster AI');
                            notify(`🗑️ Categoria deletada: ${action.name}`);
                        }
                        break;
                    }
                    case 'delete_channel': {
                        const chanToDel = guild.channels.cache.find(c => c.name.toLowerCase().includes(action.name?.toLowerCase() || ''));
                        if (chanToDel) {
                            await chanToDel.delete('Server Adjuster AI');
                            notify(`🗑️ Canal deletado: ${action.name}`);
                        }
                        break;
                    }
                    case 'create_role': {
                        await guild.roles.create({
                            name: action.name,
                            color: (action.color || '#99AAB5'),
                            reason: 'Server Adjuster AI'
                        });
                        notify(`🎭 Cargo criado: ${action.name}`);
                        break;
                    }
                }
            }
            catch (error) {
                index_1.logger.error(`Erro na ação ${action.type}:`, { error: error });
            }
        }
        notify('✅ Ajustes concluídos!');
    }
}
exports.ServerBuilderService = ServerBuilderService;
exports.serverBuilder = new ServerBuilderService();
//# sourceMappingURL=server-builder.service.js.map