/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧪 Test Harness — /helpcore Command, Interactive UI & CoreIA Integration
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Validação não-interativa do comando slash /helpcore, gerador de embeds,
 * menu interativo de seleção (StringSelectMenuBuilder), botões de ação e
 * manipuladores de eventos de interação mockados.
 *
 * Execução: npx ts-node scripts/test-helpcore.ts
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
    HELPCORE_COMMAND,
    HELPCORE_CATEGORIES,
    HelpCoreCategoryKey,
    isValidCategoryKey,
    buildHelpCoreEmbed,
    buildHelpCoreComponents,
    handleHelpCoreCommand,
    handleHelpCoreSelectMenu,
    handleHelpCoreButton
} from '../src/bots/helpcore';
import {
    ButtonStyle,
    ChatInputCommandInteraction,
    StringSelectMenuInteraction,
    ButtonInteraction,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder
} from 'discord.js';

let passedTests = 0;
let failedTests = 0;

async function runTest(name: string, fn: () => void | Promise<void>): Promise<void> {
    try {
        const result = fn();
        if (result instanceof Promise) {
            await result;
        }
        console.log(`  ✅ PASS: ${name}`);
        passedTests++;
    } catch (err: any) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     Erro: ${err.message}`);
        failedTests++;
    }
}

async function main() {
    console.log('════════════════════════════════════════════════════════════════');
    console.log('🤖 INICIANDO SUÍTE DE TESTES DO COMANDO /HELPCORE (MILESTONE 3)');
    console.log('════════════════════════════════════════════════════════════════\n');

    // ──────────────────────────────────────────────────────────────────────────
    // SUÍTE 1: DEFINIÇÃO DO SLASH COMMAND
    // ──────────────────────────────────────────────────────────────────────────
    console.log('📦 Suíte 1: Definição do Slash Command (/helpcore)');
    const commandJSON = HELPCORE_COMMAND.toJSON();

    runTest('1.1 - Nome do comando deve ser exatamente "helpcore"', () => {
        assert.strictEqual(commandJSON.name, 'helpcore');
    });

    runTest('1.2 - Descrição do comando deve ser informativa e não vazia', () => {
        assert.ok(commandJSON.description && commandJSON.description.length > 10);
    });

    runTest('1.3 - Opção "categoria" deve existir como string opcional', () => {
        assert.ok(commandJSON.options && commandJSON.options.length === 1);
        const opt: any = commandJSON.options[0];
        assert.strictEqual(opt.name, 'categoria');
        assert.strictEqual(opt.type, 3); // STRING = 3
        assert.strictEqual(opt.required, false);
    });

    runTest('1.4 - Opção "categoria" deve conter exatamente 7 choices correspondentes às categorias', () => {
        const opt: any = commandJSON.options![0];
        assert.ok(opt.choices && opt.choices.length === 7);
        const expectedValues: HelpCoreCategoryKey[] = [
            'overview',
            'music',
            'ai',
            'calls',
            'tickets',
            'moderation',
            'custom'
        ];
        const actualValues = opt.choices.map((c: any) => c.value);
        assert.deepStrictEqual(actualValues, expectedValues);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // SUÍTE 2: DICIONÁRIO CANÔNICO DE CATEGORIAS
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n📚 Suíte 2: Dicionário Canônico de Categorias (HELPCORE_CATEGORIES)');

    const expectedKeys: HelpCoreCategoryKey[] = [
        'overview',
        'music',
        'ai',
        'calls',
        'tickets',
        'moderation',
        'custom'
    ];

    runTest('2.1 - O dicionário deve conter exatamente 7 categorias', () => {
        const keys = Object.keys(HELPCORE_CATEGORIES);
        assert.strictEqual(keys.length, 7);
        assert.deepStrictEqual(keys.sort(), [...expectedKeys].sort());
    });

    runTest('2.2 - Cada categoria deve conter todos os metadados requeridos', () => {
        for (const key of expectedKeys) {
            const cat = HELPCORE_CATEGORIES[key];
            assert.strictEqual(cat.id, key);
            assert.ok(cat.label && cat.label.length > 0, `${key} deve ter label`);
            assert.ok(cat.emoji && cat.emoji.length > 0, `${key} deve ter emoji`);
            assert.ok(cat.description && cat.description.length > 0, `${key} deve ter description`);
            assert.ok(cat.title && cat.title.length > 0, `${key} deve ter title`);
            assert.ok(cat.embedDescription && cat.embedDescription.length > 0, `${key} deve ter embedDescription`);
            assert.ok(Array.isArray(cat.fields) && cat.fields.length >= 2, `${key} deve ter pelo menos 2 campos`);
            assert.ok(typeof cat.color === 'number' && cat.color > 0, `${key} deve ter cor numérica`);
            assert.ok(cat.footer && cat.footer.length > 0, `${key} deve ter footer`);

            for (const field of cat.fields) {
                assert.ok(field.name && field.name.length > 0, `Campo em ${key} deve ter nome`);
                assert.ok(field.value && field.value.length > 0, `Campo em ${key} deve ter valor`);
            }
        }
    });

    runTest('2.3 - A categoria de música deve documentar todos os 10 comandos do prefixo core!', () => {
        const musicCat = HELPCORE_CATEGORIES.music;
        const fullContent = musicCat.embedDescription + ' ' + musicCat.fields.map(f => f.value).join(' ');

        const requiredMusicCommands = [
            'core!play',
            'core!stop',
            'core!skip',
            'core!queue',
            'core!pause',
            'core!resume',
            'core!np',
            'core!loop',
            'core!leave',
            'core!help'
        ];

        for (const cmd of requiredMusicCommands) {
            assert.ok(
                fullContent.includes(cmd),
                `Categoria music deve documentar ${cmd}`
            );
        }
    });

    runTest('2.4 - isValidCategoryKey deve retornar true para todas as 7 chaves canônicas de categoria', () => {
        for (const key of expectedKeys) {
            assert.strictEqual(isValidCategoryKey(key), true, `Deve retornar true para chave válida: ${key}`);
        }
    });

    runTest('2.5 - isValidCategoryKey deve retornar false para strings inválidas e chaves inexistentes', () => {
        const invalidKeys = ['', 'unknown', 'random', 'musica', 'tickets123', '   '];
        for (const key of invalidKeys) {
            assert.strictEqual(isValidCategoryKey(key), false, `Deve retornar false para chave inválida: "${key}"`);
        }
    });

    runTest('2.6 - isValidCategoryKey deve retornar false para chaves de Prototype Pollution (Object.prototype)', () => {
        const prototypeKeys = [
            'constructor',
            'toString',
            'valueOf',
            '__proto__',
            'hasOwnProperty',
            'isPrototypeOf',
            'propertyIsEnumerable',
            'toLocaleString'
        ];
        for (const key of prototypeKeys) {
            assert.strictEqual(isValidCategoryKey(key), false, `Deve retornar false para chave de prototype: "${key}"`);
        }
    });

    runTest('2.7 - isValidCategoryKey deve retornar false para valores não-string', () => {
        const nonStringValues: any[] = [
            null,
            undefined,
            123,
            0,
            true,
            false,
            {},
            [],
            () => {},
            Symbol('overview')
        ];
        for (const val of nonStringValues) {
            assert.strictEqual(isValidCategoryKey(val), false, `Deve retornar false para valor não-string: ${String(val)}`);
        }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // SUÍTE 3: GERADOR DE EMBEDS
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n🎨 Suíte 3: Gerador de Embeds (buildHelpCoreEmbed)');

    runTest('3.1 - buildHelpCoreEmbed deve construir embed correto para cada uma das 7 categorias', () => {
        for (const key of expectedKeys) {
            const cat = HELPCORE_CATEGORIES[key];
            const embed = buildHelpCoreEmbed(key);
            const data = embed.data;

            assert.strictEqual(data.title, cat.title);
            assert.strictEqual(data.description, cat.embedDescription);
            assert.strictEqual(data.color, cat.color);
            assert.strictEqual(data.footer?.text, cat.footer);
            assert.strictEqual(data.fields?.length, cat.fields.length);
        }
    });

    runTest('3.2 - buildHelpCoreEmbed deve fazer fallback seguro para "overview" com chave inválida', () => {
        const fallbackEmbed = buildHelpCoreEmbed('categoria_inexistente');
        assert.strictEqual(fallbackEmbed.data.title, HELPCORE_CATEGORIES.overview.title);
        assert.strictEqual(fallbackEmbed.data.color, HELPCORE_CATEGORIES.overview.color);
    });

    runTest('3.3 - buildHelpCoreEmbed deve fazer fallback seguro para "overview" com chaves de Prototype Pollution sem lançar exceções', () => {
        const prototypeKeys = [
            'constructor',
            'toString',
            'valueOf',
            '__proto__',
            'hasOwnProperty',
            'isPrototypeOf',
            'propertyIsEnumerable',
            'toLocaleString'
        ];
        for (const protoKey of prototypeKeys) {
            const embed = buildHelpCoreEmbed(protoKey);
            assert.strictEqual(
                embed.data.title,
                HELPCORE_CATEGORIES.overview.title,
                `Título deve ser o do overview para protoKey: ${protoKey}`
            );
            assert.strictEqual(
                embed.data.color,
                HELPCORE_CATEGORIES.overview.color,
                `Cor deve ser a do overview para protoKey: ${protoKey}`
            );
            assert.ok(embed.data.fields && embed.data.fields.length >= 2);
        }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // SUÍTE 4: COMPONENTES INTERATIVOS (SELECT MENU & BOTÕES)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n🎛️ Suíte 4: Componentes Interativos (buildHelpCoreComponents)');

    runTest('4.1 - buildHelpCoreComponents deve retornar exatamente 2 linhas de ação', () => {
        const [selectRow, buttonRow] = buildHelpCoreComponents('overview');
        assert.ok(selectRow instanceof ActionRowBuilder);
        assert.ok(buttonRow instanceof ActionRowBuilder);
        assert.strictEqual(selectRow.components.length, 1);
        assert.strictEqual(buttonRow.components.length, 3);
    });

    runTest('4.2 - StringSelectMenuBuilder deve ter customId "helpcore_category_select" e 7 opções', () => {
        const [selectRow] = buildHelpCoreComponents('music');
        const selectMenu = selectRow.components[0] as StringSelectMenuBuilder;
        const json = selectMenu.toJSON() as any;

        assert.strictEqual(json.custom_id, 'helpcore_category_select');
        assert.strictEqual(json.placeholder, 'Selecione uma categoria para explorar...');
        assert.strictEqual(json.options.length, 7);

        // Opção 'music' deve estar marcada como default
        const musicOpt = json.options.find((o: any) => o.value === 'music');
        assert.ok(musicOpt);
        assert.strictEqual(musicOpt.default, true);

        // Outras opções não devem ser default
        const overviewOpt = json.options.find((o: any) => o.value === 'overview');
        assert.strictEqual(overviewOpt.default, false);
    });

    runTest('4.3 - Botões de ação devem conter Início, Dashboard Link e Docs Link', () => {
        const [, buttonRow] = buildHelpCoreComponents('overview');
        const buttons = buttonRow.components as ButtonBuilder[];

        const homeBtn = buttons[0].toJSON() as any;
        assert.strictEqual(homeBtn.custom_id, 'helpcore:home');
        assert.strictEqual(homeBtn.label, '🏠 Início');
        assert.strictEqual(homeBtn.style, ButtonStyle.Primary); // No overview deve ser Primary

        const dashBtn = buttons[1].toJSON() as any;
        assert.strictEqual(dashBtn.label, 'Dashboard');
        assert.strictEqual(dashBtn.style, ButtonStyle.Link);
        assert.strictEqual(dashBtn.url, 'https://corebot.online');

        const docsBtn = buttons[2].toJSON() as any;
        assert.strictEqual(docsBtn.label, 'Documentação');
        assert.strictEqual(docsBtn.style, ButtonStyle.Link);
        assert.strictEqual(docsBtn.url, 'https://corebot.online/docs');
    });

    runTest('4.4 - Botão de Início deve mudar para estilo Secondary quando fora de overview', () => {
        const [, buttonRow] = buildHelpCoreComponents('tickets');
        const buttons = buttonRow.components as ButtonBuilder[];
        const homeBtn = buttons[0].toJSON() as any;
        assert.strictEqual(homeBtn.style, ButtonStyle.Secondary);
    });

    runTest('4.5 - buildHelpCoreComponents deve fazer fallback seguro para "overview" com chaves de Prototype Pollution sem lançar exceções', () => {
        const prototypeKeys = [
            'constructor',
            'toString',
            'valueOf',
            '__proto__',
            'hasOwnProperty',
            'isPrototypeOf',
            'propertyIsEnumerable',
            'toLocaleString'
        ];
        for (const protoKey of prototypeKeys) {
            const [selectRow, buttonRow] = buildHelpCoreComponents(protoKey);
            const selectMenu = selectRow.components[0] as StringSelectMenuBuilder;
            const selectJSON = selectMenu.toJSON() as any;

            // Overview deve ser default
            const overviewOpt = selectJSON.options.find((o: any) => o.value === 'overview');
            assert.ok(overviewOpt, 'Opção overview deve existir');
            assert.strictEqual(overviewOpt.default, true, `Overview deve ser default para protoKey: ${protoKey}`);

            // Nenhuma outra opção deve ser default
            const otherDefaults = selectJSON.options.filter((o: any) => o.value !== 'overview' && o.default === true);
            assert.strictEqual(otherDefaults.length, 0, `Nenhuma outra opção deve ser default para protoKey: ${protoKey}`);

            // Home button deve ser Primary
            const homeBtn = (buttonRow.components[0] as ButtonBuilder).toJSON() as any;
            assert.strictEqual(homeBtn.style, ButtonStyle.Primary, `Botão Início deve ser Primary para protoKey: ${protoKey}`);
        }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // SUÍTE 5: MOCK INTERACTION DISPATCH HANDLERS
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n⚡ Suíte 5: Mock Interaction Handlers');

    await runTest('5.1 - handleHelpCoreCommand sem argumento responde com embed overview e componentes', async () => {
        let repliedPayload: any = null;

        const mockInteraction = {
            options: {
                getString: (_name: string) => null
            },
            deferred: false,
            replied: false,
            reply: async (payload: any) => {
                repliedPayload = payload;
            },
            editReply: async () => {},
            followUp: async () => {}
        } as unknown as ChatInputCommandInteraction;

        await handleHelpCoreCommand(mockInteraction);

        assert.ok(repliedPayload, 'reply deve ser chamado');
        assert.strictEqual(repliedPayload.ephemeral, false);
        assert.ok(repliedPayload.embeds && repliedPayload.embeds.length === 1);
        assert.strictEqual(repliedPayload.embeds[0].data.title, HELPCORE_CATEGORIES.overview.title);
        assert.ok(repliedPayload.components && repliedPayload.components.length === 2);
    });

    await runTest('5.2 - handleHelpCoreCommand com argumento "music" responde com embed de música', async () => {
        let repliedPayload: any = null;

        const mockInteraction = {
            options: {
                getString: (name: string) => (name === 'categoria' ? 'music' : null)
            },
            deferred: false,
            replied: false,
            reply: async (payload: any) => {
                repliedPayload = payload;
            },
            editReply: async () => {},
            followUp: async () => {}
        } as unknown as ChatInputCommandInteraction;

        await handleHelpCoreCommand(mockInteraction);

        assert.ok(repliedPayload);
        assert.strictEqual(repliedPayload.embeds[0].data.title, HELPCORE_CATEGORIES.music.title);
    });

    await runTest('5.3 - handleHelpCoreCommand usa editReply quando interaction.deferred é true', async () => {
        let editReplyCalled = false;
        let replyCalled = false;

        const mockInteraction = {
            options: {
                getString: (_name: string) => null
            },
            deferred: true,
            replied: false,
            reply: async () => {
                replyCalled = true;
            },
            editReply: async () => {
                editReplyCalled = true;
            },
            followUp: async () => {}
        } as unknown as ChatInputCommandInteraction;

        await handleHelpCoreCommand(mockInteraction);

        assert.strictEqual(editReplyCalled, true);
        assert.strictEqual(replyCalled, false);
    });

    await runTest('5.4 - handleHelpCoreSelectMenu atualiza interação com a categoria escolhida', async () => {
        let updatedPayload: any = null;

        const mockInteraction = {
            values: ['calls'],
            update: async (payload: any) => {
                updatedPayload = payload;
            },
            reply: async () => {}
        } as unknown as StringSelectMenuInteraction;

        await handleHelpCoreSelectMenu(mockInteraction);

        assert.ok(updatedPayload, 'update deve ser chamado');
        assert.strictEqual(updatedPayload.embeds[0].data.title, HELPCORE_CATEGORIES.calls.title);
        assert.strictEqual(updatedPayload.components.length, 2);
    });

    await runTest('5.5 - handleHelpCoreButton processa helpcore:home e restaura embed overview', async () => {
        let updatedPayload: any = null;

        const mockInteraction = {
            customId: 'helpcore:home',
            update: async (payload: any) => {
                updatedPayload = payload;
            },
            reply: async () => {}
        } as unknown as ButtonInteraction;

        await handleHelpCoreButton(mockInteraction);

        assert.ok(updatedPayload, 'update deve ser chamado no clique do botão');
        assert.strictEqual(updatedPayload.embeds[0].data.title, HELPCORE_CATEGORIES.overview.title);
    });

    await runTest('5.6 - Resiliência a erros: handleHelpCoreCommand trata exceção sem crashar processo', async () => {
        let followUpCalled = false;

        const mockFailingInteraction = {
            options: {
                getString: () => {
                    throw new Error('Simulated options exception');
                }
            },
            deferred: true,
            replied: false,
            reply: async () => {},
            editReply: async () => {},
            followUp: async () => {
                followUpCalled = true;
            }
        } as unknown as ChatInputCommandInteraction;

        await handleHelpCoreCommand(mockFailingInteraction);
        assert.strictEqual(followUpCalled, true, 'followUp deve ser chamado em caso de erro');
    });

    await runTest('5.7 - handleHelpCoreCommand com chave de prototype pollution em categoria faz fallback para overview', async () => {
        let repliedPayload: any = null;

        const mockInteraction = {
            options: {
                getString: (name: string) => (name === 'categoria' ? 'constructor' : null)
            },
            deferred: false,
            replied: false,
            reply: async (payload: any) => {
                repliedPayload = payload;
            },
            editReply: async () => {},
            followUp: async () => {}
        } as unknown as ChatInputCommandInteraction;

        await handleHelpCoreCommand(mockInteraction);

        assert.ok(repliedPayload, 'reply deve ser chamado');
        assert.strictEqual(repliedPayload.embeds[0].data.title, HELPCORE_CATEGORIES.overview.title);
        assert.strictEqual(
            repliedPayload.components[0].components[0].options.find((o: any) => o.data.value === 'overview').data.default,
            true
        );
    });

    await runTest('5.8 - handleHelpCoreSelectMenu com valor de prototype pollution faz fallback seguro para overview', async () => {
        let updatedPayload: any = null;

        const mockInteraction = {
            values: ['toString'],
            update: async (payload: any) => {
                updatedPayload = payload;
            },
            reply: async () => {}
        } as unknown as StringSelectMenuInteraction;

        await handleHelpCoreSelectMenu(mockInteraction);

        assert.ok(updatedPayload, 'update deve ser chamado');
        assert.strictEqual(updatedPayload.embeds[0].data.title, HELPCORE_CATEGORIES.overview.title);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // SUÍTE 6: INTEGRAÇÃO E ROTEAMENTO EM CoreIA/index.ts
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n🔗 Suíte 6: Verificação Estática de Roteamento em CoreIA/index.ts');

    runTest('6.1 - CoreIA/index.ts deve importar HELPCORE_COMMAND e seus handlers', () => {
        const coreIaPath = path.resolve(__dirname, '../src/bots/CoreIA/index.ts');
        const content = fs.readFileSync(coreIaPath, 'utf-8');

        assert.ok(content.includes('HELPCORE_COMMAND'), 'Deve importar HELPCORE_COMMAND');
        assert.ok(content.includes('handleHelpCoreCommand'), 'Deve importar handleHelpCoreCommand');
        assert.ok(content.includes('handleHelpCoreSelectMenu'), 'Deve importar handleHelpCoreSelectMenu');
        assert.ok(content.includes('handleHelpCoreButton'), 'Deve importar handleHelpCoreButton');
    });

    runTest('6.2 - CoreIA/index.ts deve incluir HELPCORE_COMMAND no array commands de registro global', () => {
        const coreIaPath = path.resolve(__dirname, '../src/bots/CoreIA/index.ts');
        const content = fs.readFileSync(coreIaPath, 'utf-8');

        // Localizar array commands
        const commandsIndex = content.indexOf('const commands = [');
        assert.ok(commandsIndex !== -1, 'Array commands deve existir');
        const commandsEndIndex = content.indexOf('];', commandsIndex);
        assert.ok(commandsEndIndex !== -1, 'Fechamento do array commands deve existir');
        const commandsBlock = content.slice(commandsIndex, commandsEndIndex);

        assert.ok(
            commandsBlock.includes('HELPCORE_COMMAND'),
            'HELPCORE_COMMAND deve estar presente dentro do array commands'
        );
    });

    runTest('6.3 - CoreIA/index.ts deve rotear slash command helpcore para handleHelpCoreCommand', () => {
        const coreIaPath = path.resolve(__dirname, '../src/bots/CoreIA/index.ts');
        const content = fs.readFileSync(coreIaPath, 'utf-8');

        assert.ok(
            content.includes("interaction.commandName === 'helpcore'"),
            'Deve verificar interaction.commandName === helpcore'
        );
        assert.ok(
            content.includes('handleHelpCoreCommand(interaction)'),
            'Deve invocar handleHelpCoreCommand(interaction)'
        );
    });

    runTest('6.4 - CoreIA/index.ts deve rotear select menu helpcore_category_select e botões helpcore:', () => {
        const coreIaPath = path.resolve(__dirname, '../src/bots/CoreIA/index.ts');
        const content = fs.readFileSync(coreIaPath, 'utf-8');

        assert.ok(
            content.includes("helpcore_category_select"),
            'Deve tratar interaction.customId === helpcore_category_select'
        );
        assert.ok(
            content.includes('handleHelpCoreSelectMenu(interaction)'),
            'Deve invocar handleHelpCoreSelectMenu(interaction)'
        );
        assert.ok(
            content.includes("helpcore:"),
            'Deve tratar interaction.customId.startsWith("helpcore:")'
        );
        assert.ok(
            content.includes('handleHelpCoreButton(interaction)'),
            'Deve invocar handleHelpCoreButton(interaction)'
        );
    });

    runTest('6.5 - CoreIA/index.ts deve incluir "helpcore" E "call" em MODULE_COMMANDS', () => {
        const coreIaPath = path.resolve(__dirname, '../src/bots/CoreIA/index.ts');
        const content = fs.readFileSync(coreIaPath, 'utf-8');

        const moduleCommandsIndex = content.indexOf('const MODULE_COMMANDS = [');
        assert.ok(moduleCommandsIndex !== -1, 'MODULE_COMMANDS deve existir');
        const moduleCommandsEnd = content.indexOf('];', moduleCommandsIndex);
        const moduleCommandsBlock = content.slice(moduleCommandsIndex, moduleCommandsEnd);

        assert.ok(
            moduleCommandsBlock.includes("'helpcore'"),
            "MODULE_COMMANDS deve conter 'helpcore'"
        );
        assert.ok(
            moduleCommandsBlock.includes("'call'"),
            "MODULE_COMMANDS deve conter 'call' (correção de colisão de rota)"
        );
    });

    // ──────────────────────────────────────────────────────────────────────────
    // RESULTADO FINAL
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log(`📊 RESULTADO DA SUÍTE: ${passedTests} PASSOU | ${failedTests} FALHOU`);
    console.log('════════════════════════════════════════════════════════════════');

    if (failedTests > 0) {
        console.error('❌ HOUVE FALHAS NA VALIDAÇÃO DO MÓDULO HELPCORE!');
        process.exit(1);
    } else {
        console.log(`🎉 TODOS OS TESTES PASSARAM COM SUCESSO! (${passedTests}/${passedTests})\n`);
        process.exit(0);
    }
}

main().catch(err => {
    console.error('Erro fatal durante a execução dos testes:', err);
    process.exit(1);
});
