/**
 * 🧪 Test Suite: Music Parser, Command Dispatcher & Queue Logic
 * Executável via: npx ts-node scripts/test-music-parser.ts
 */

import assert from 'assert';
import { parseMusicCommand } from '../src/bots/music/events';
import { findMusicCommand, createProgressBar } from '../src/bots/music/commands';
import { formatDuration, isDirectAudioUrl } from '../src/bots/music/extractor';
import { LoopMode, Track } from '../src/bots/music/types';

function createMockTrack(id: string, title: string, durationSec: number = 180): Track {
    return {
        id,
        title,
        url: `https://youtube.com/watch?v=${id}`,
        duration: formatDuration(durationSec),
        durationSeconds: durationSec,
        author: 'Artist Test',
        requestedBy: {} as any,
        source: 'deezer'
    };
}

console.log('====================================================');
console.log('🎵 INICIANDO SUÍTE DE TESTES: MUSIC SUBSYSTEM (M2)');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function test(name: string, fn: () => void) {
    totalTests++;
    try {
        fn();
        passedTests++;
        console.log(`  ✅ PASS: ${name}`);
    } catch (err: any) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     Erro: ${err.message}`);
        throw err;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PREFIX AND COMMAND PARSER TESTS
// ─────────────────────────────────────────────────────────────────────────────
console.log('1. Testes de Parsing de Comandos e Prefixos (core!)');

test('Deve ignorar mensagens sem o prefixo core!', () => {
    assert.strictEqual(parseMusicCommand('!play bohemian rhapsody'), null);
    assert.strictEqual(parseMusicCommand('hello core!'), null);
    assert.strictEqual(parseMusicCommand('ia, tocar musica'), null);
    assert.strictEqual(parseMusicCommand(''), null);
});

test('Deve redirecionar core! sem argumentos para o comando help', () => {
    const res = parseMusicCommand('core!');
    assert.notStrictEqual(res, null);
    assert.strictEqual(res?.commandName, 'help');
    assert.strictEqual(res?.command?.name, 'help');
    assert.strictEqual(res?.args.length, 0);
});

test('Deve ignorar maiúsculas/minúsculas no prefixo (case-insensitive)', () => {
    const res1 = parseMusicCommand('CORE!play rock');
    assert.strictEqual(res1?.commandName, 'play');
    assert.strictEqual(res1?.command?.name, 'play');

    const res2 = parseMusicCommand('CoRe!sKiP');
    assert.strictEqual(res2?.commandName, 'skip');
    assert.strictEqual(res2?.command?.name, 'skip');
});

test('Deve fazer o split correto de argumentos com espaços múltiplos', () => {
    const res = parseMusicCommand('core!play    Queen   -   Bohemian   Rhapsody   ');
    assert.notStrictEqual(res, null);
    assert.strictEqual(res?.commandName, 'play');
    assert.deepStrictEqual(res?.args, ['Queen', '-', 'Bohemian', 'Rhapsody']);
});

test('Deve identificar comando desconhecido mantendo parsed.command como undefined', () => {
    const res = parseMusicCommand('core!comandoInexistente arg1 arg2');
    assert.notStrictEqual(res, null);
    assert.strictEqual(res?.commandName, 'comandoinexistente');
    assert.strictEqual(res?.command, undefined);
    assert.deepStrictEqual(res?.args, ['arg1', 'arg2']);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. ALIAS RESOLUTION TESTS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n2. Testes de Resolução de Comandos e Apelidos (Aliases)');

test('Deve resolver aliases do comando play (play, p)', () => {
    assert.strictEqual(findMusicCommand('play')?.name, 'play');
    assert.strictEqual(findMusicCommand('p')?.name, 'play');
    assert.strictEqual(findMusicCommand('PLAY')?.name, 'play');
    assert.strictEqual(findMusicCommand('P')?.name, 'play');
});

test('Deve resolver aliases do comando stop (stop, parar)', () => {
    assert.strictEqual(findMusicCommand('stop')?.name, 'stop');
    assert.strictEqual(findMusicCommand('parar')?.name, 'stop');
});

test('Deve resolver aliases do comando skip (skip, s, pular)', () => {
    assert.strictEqual(findMusicCommand('skip')?.name, 'skip');
    assert.strictEqual(findMusicCommand('s')?.name, 'skip');
    assert.strictEqual(findMusicCommand('pular')?.name, 'skip');
});

test('Deve resolver aliases do comando leave (leave, sair, dc)', () => {
    assert.strictEqual(findMusicCommand('leave')?.name, 'leave');
    assert.strictEqual(findMusicCommand('sair')?.name, 'leave');
    assert.strictEqual(findMusicCommand('dc')?.name, 'leave');
});

test('Deve resolver aliases do comando queue (queue, q, fila)', () => {
    assert.strictEqual(findMusicCommand('queue')?.name, 'queue');
    assert.strictEqual(findMusicCommand('q')?.name, 'queue');
    assert.strictEqual(findMusicCommand('fila')?.name, 'queue');
});

test('Deve resolver aliases do comando pause (pause, pausar)', () => {
    assert.strictEqual(findMusicCommand('pause')?.name, 'pause');
    assert.strictEqual(findMusicCommand('pausar')?.name, 'pause');
});

test('Deve resolver aliases do comando resume (resume, despausar)', () => {
    assert.strictEqual(findMusicCommand('resume')?.name, 'resume');
    assert.strictEqual(findMusicCommand('despausar')?.name, 'resume');
});

test('Deve resolver aliases do comando nowplaying (nowplaying, np, tocando)', () => {
    assert.strictEqual(findMusicCommand('nowplaying')?.name, 'nowplaying');
    assert.strictEqual(findMusicCommand('np')?.name, 'nowplaying');
    assert.strictEqual(findMusicCommand('tocando')?.name, 'nowplaying');
});

test('Deve resolver aliases do comando loop (loop, repetir)', () => {
    assert.strictEqual(findMusicCommand('loop')?.name, 'loop');
    assert.strictEqual(findMusicCommand('repetir')?.name, 'loop');
});

test('Deve resolver aliases do comando help (help, ajuda)', () => {
    assert.strictEqual(findMusicCommand('help')?.name, 'help');
    assert.strictEqual(findMusicCommand('ajuda')?.name, 'help');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. EXTRACTOR & FORMATTING TESTS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n3. Testes de Extração de Áudio e Formatação');

test('Deve formatar durações em segundos para MM:SS e HH:MM:SS corretamente', () => {
    assert.strictEqual(formatDuration(0), '00:00');
    assert.strictEqual(formatDuration(-10), '00:00');
    assert.strictEqual(formatDuration(45), '00:45');
    assert.strictEqual(formatDuration(65), '01:05');
    assert.strictEqual(formatDuration(3599), '59:59');
    assert.strictEqual(formatDuration(3600), '01:00:00');
    assert.strictEqual(formatDuration(3665), '01:01:05');
});

test('Deve detectar links diretos de áudio válidos e rejeitar links comuns', () => {
    assert.strictEqual(isDirectAudioUrl('https://site.com/track.mp3'), true);
    assert.strictEqual(isDirectAudioUrl('https://site.com/track.wav?auth=abc'), true);
    assert.strictEqual(isDirectAudioUrl('https://cdn.example.org/audio.ogg'), true);
    assert.strictEqual(isDirectAudioUrl('https://site.com/stream.flac'), true);
    assert.strictEqual(isDirectAudioUrl('https://site.com/audio.m4a'), true);
    assert.strictEqual(isDirectAudioUrl('https://site.com/voice.opus'), true);

    assert.strictEqual(isDirectAudioUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), false);
    assert.strictEqual(isDirectAudioUrl('https://soundcloud.com/artist/track'), false);
    assert.strictEqual(isDirectAudioUrl('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT'), false);
    assert.strictEqual(isDirectAudioUrl('not-a-valid-url'), false);
});

test('Deve gerar barra de progresso visual proporcional', () => {
    const bar0 = createProgressBar(0, 100);
    assert.ok(bar0.includes('🔘'));
    assert.ok(bar0.includes('[00:00 / 01:40]'));

    const barHalf = createProgressBar(50000, 100);
    assert.ok(barHalf.includes('🔘'));
    assert.ok(barHalf.includes('[00:50 / 01:40]'));

    const barLive = createProgressBar(0, 0);
    assert.ok(barLive.includes('Ao Vivo'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. QUEUE FIFO AND LOOP LOGIC TESTS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n4. Testes de Lógica de Fila FIFO e Modos de Loop');

test('Deve enfileirar faixas na ordem FIFO (First-In, First-Out)', () => {
    const queue: Track[] = [];
    const t1 = createMockTrack('1', 'Primeira');
    const t2 = createMockTrack('2', 'Segunda');
    const t3 = createMockTrack('3', 'Terceira');

    // Enqueue
    queue.push(t1, t2, t3);
    assert.strictEqual(queue.length, 3);
    assert.strictEqual(queue[0].title, 'Primeira');
    assert.strictEqual(queue[1].title, 'Segunda');
    assert.strictEqual(queue[2].title, 'Terceira');

    // Dequeue next
    const played1 = queue.shift();
    assert.strictEqual(played1?.id, '1');
    assert.strictEqual(queue.length, 2);

    const played2 = queue.shift();
    assert.strictEqual(played2?.id, '2');
    assert.strictEqual(queue.length, 1);
});

test('Deve simular ciclo de loop: off vs track vs queue', () => {
    let loopMode: LoopMode = 'off';
    const tracks: Track[] = [
        createMockTrack('1', 'Musica 1'),
        createMockTrack('2', 'Musica 2')
    ];
    let currentTrack: Track | null = tracks.shift()!; // Musica 1

    // 1. Loop OFF: ao encerrar, musica 1 é descartada e toca musica 2
    function onTrackEndNatural(mode: LoopMode) {
        if (mode === 'track' && currentTrack) {
            tracks.unshift(currentTrack);
        } else if (mode === 'queue' && currentTrack) {
            tracks.push(currentTrack);
        }
        currentTrack = tracks.shift() || null;
    }

    onTrackEndNatural(loopMode);
    assert.strictEqual(currentTrack?.id, '2');
    assert.strictEqual(tracks.length, 0);

    // 2. Loop TRACK: ao encerrar, repete a mesma faixa
    loopMode = 'track';
    onTrackEndNatural(loopMode);
    assert.strictEqual(currentTrack?.id, '2');
    assert.strictEqual(tracks.length, 0);

    // 3. Loop QUEUE: ao encerrar, joga para o fim da fila
    loopMode = 'queue';
    tracks.push(createMockTrack('3', 'Musica 3'));
    onTrackEndNatural(loopMode); // Musica 2 vai para o fim, toca Musica 3
    assert.strictEqual(currentTrack?.id, '3');
    assert.strictEqual(tracks.length, 1);
    assert.strictEqual(tracks[0].id, '2');
});

test('Deve simular Skip manual respeitando loopMode track (não repete no skip manual)', () => {
    let loopMode: LoopMode = 'track';
    const tracks: Track[] = [createMockTrack('2', 'Musica 2')];
    let currentTrack: Track | null = createMockTrack('1', 'Musica 1');

    function onManualSkip(mode: LoopMode) {
        // Skip manual: ignora loop de track, e no loop de queue reinsere no final
        if (mode === 'queue' && currentTrack) {
            tracks.push(currentTrack);
        }
        currentTrack = tracks.shift() || null;
    }

    onManualSkip(loopMode);
    // Deve ter pulado Musica 1 e avançado para Musica 2 mesmo com loop de track ativo
    assert.strictEqual(currentTrack?.id, '2');
    assert.strictEqual(tracks.length, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. VOICE STATE EMPTY CHANNEL LOGIC TESTS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n5. Testes de Lógica de Detecção de Canal Vazio');

test('Deve detectar canal vazio quando houver apenas bots na sala', () => {
    interface MockMember {
        id: string;
        user: { bot: boolean };
    }

    function isChannelEmpty(members: MockMember[]): boolean {
        const humanMembers = members.filter(m => !m.user.bot);
        return humanMembers.length === 0;
    }

    const channelWithHumans: MockMember[] = [
        { id: '1', user: { bot: false } },
        { id: '2', user: { bot: true } }
    ];
    assert.strictEqual(isChannelEmpty(channelWithHumans), false);

    const channelOnlyBots: MockMember[] = [
        { id: 'bot-1', user: { bot: true } },
        { id: 'bot-2', user: { bot: true } }
    ];
    assert.strictEqual(isChannelEmpty(channelOnlyBots), true);

    const channelEmpty: MockMember[] = [];
    assert.strictEqual(isChannelEmpty(channelEmpty), true);
});

console.log('\n====================================================');
console.log(`🎉 TODOS OS TESTES PASSARAM COM SUCESSO! (${passedTests}/${totalTests})`);
console.log('====================================================\n');
process.exit(0);
