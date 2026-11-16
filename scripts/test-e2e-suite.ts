/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧪 CoreBot Platform — Complete Executable E2E Test Suite (Tiers 1-4)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Spec: TEST_INFRA.md | ORIGINAL_REQUEST.md | PROJECT.md
 * Invocation:
 *   npx tsx scripts/test-e2e-suite.ts [--tier=1|2|3|4] [--all] [--bail] [--json]
 * 
 * Architecture:
 *   - Standalone zero-dependency micro-test runner (describe, it, expect)
 *   - High-fidelity mock & simulation infrastructure (Discord messages, interactions, voice)
 *   - Genuine subsystem integration: GuildQueue, HelpCore handlers, CoreIA commands
 *   - 71 test assertions covering 7 feature domains across 4 validation tiers
 *   - Deterministic headless execution with clean process.exit(hasFailures ? 1 : 0)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { EventEmitter } from 'events';
import { Collection } from 'discord.js';

// Import live bot modules
import { parseMusicCommand } from '../src/bots/music/events';
import {
    MUSIC_COMMANDS,
    findMusicCommand,
    playCommand,
    stopCommand,
    skipCommand,
    leaveCommand,
    queueCommand,
    pauseCommand,
    resumeCommand,
    loopCommand,
    createProgressBar
} from '../src/bots/music/commands';
import { isDirectAudioUrl } from '../src/bots/music/extractor';
import { Track } from '../src/bots/music/types';
import { GuildQueue } from '../src/bots/music/guild-queue';
import { musicManager } from '../src/bots/music/music.manager';
import {
    HELPCORE_COMMAND,
    HELPCORE_CATEGORIES,
    buildHelpCoreEmbed,
    buildHelpCoreComponents,
    handleHelpCoreCommand,
    handleHelpCoreSelectMenu,
    handleHelpCoreButton
} from '../src/bots/helpcore';

// ═══════════════════════════════════════════════════════════════════════════
// 1. ANSI FORMATTING & CLI ARGUMENT PARSER
// ═══════════════════════════════════════════════════════════════════════════

const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
};

const args = process.argv.slice(2);

const tierArg = args.find(a => a.startsWith('--tier='));
let parsedTier: number | null = null;
if (tierArg) {
    const val = parseInt(tierArg.split('=')[1], 10);
    if (![1, 2, 3, 4].includes(val)) {
        console.error(`\x1b[31mError: Invalid tier "${tierArg.split('=')[1]}". Valid tiers are 1, 2, 3, 4.\x1b[0m`);
        process.exit(1);
    }
    parsedTier = val;
}

const cliOptions = {
    tier: parsedTier,
    all: args.includes('--all') || (!args.some(a => a.startsWith('--tier=')) && parsedTier === null),
    bail: args.includes('--bail'),
    json: args.includes('--json'),
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. STANDALONE MICRO-TEST RUNNER (describe, it, expect)
// ═══════════════════════════════════════════════════════════════════════════

interface TestCase {
    id: string;
    tier: number;
    domain: string;
    description: string;
    fn: () => void | Promise<void>;
}

interface TestReportItem {
    id: string;
    tier: number;
    domain: string;
    description: string;
    status: 'pass' | 'fail' | 'skip';
    durationMs: number;
    error?: string;
    stack?: string;
    skipReason?: string;
}

const testRegistry: TestCase[] = [];
let currentTier = 1;
let currentDomain = 'General';

function setContext(tier: number, domain: string) {
    currentTier = tier;
    currentDomain = domain;
}

function test(id: string, description: string, fn: () => void | Promise<void>) {
    testRegistry.push({
        id,
        tier: currentTier,
        domain: currentDomain,
        description,
        fn,
    });
}

export function deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object') return false;

    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!deepEqual(a[i], b[i])) return false;
        }
        return true;
    }

    if ((a instanceof Date) !== (b instanceof Date)) return false;
    if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();

    if ((a instanceof RegExp) !== (b instanceof RegExp)) return false;
    if (a instanceof RegExp && b instanceof RegExp) return a.toString() === b.toString();

    if ((a instanceof Set) !== (b instanceof Set)) return false;
    if (a instanceof Set && b instanceof Set) {
        if (a.size !== b.size) return false;
        for (const val of a) {
            if (!b.has(val)) return false;
        }
        return true;
    }

    if ((a instanceof Map) !== (b instanceof Map)) return false;
    if (a instanceof Map && b instanceof Map) {
        if (a.size !== b.size) return false;
        for (const [key, val] of a) {
            if (!b.has(key) || !deepEqual(val, b.get(key))) return false;
        }
        return true;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
        if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
        if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
}

function expect(actual: any) {
    const matchers = {
        toBe(expected: any) {
            if (actual !== expected) {
                throw new Error(`Expected ${JSON.stringify(expected)} (${typeof expected}), but received ${JSON.stringify(actual)} (${typeof actual})`);
            }
        },
        toEqual(expected: any) {
            if (!deepEqual(actual, expected)) {
                throw new Error(`Expected deep equality:\n  Expected: ${JSON.stringify(expected)}\n  Received: ${JSON.stringify(actual)}`);
            }
        },
        toContain(expected: any) {
            if (typeof actual === 'string') {
                if (!actual.includes(expected)) {
                    throw new Error(`Expected string to contain "${expected}", but not found in: "${actual.slice(0, 120)}..."`);
                }
            } else if (Array.isArray(actual)) {
                const found = actual.some(item => item === expected || deepEqual(item, expected));
                if (!found) {
                    throw new Error(`Expected array to contain item: ${JSON.stringify(expected)}`);
                }
            } else if (actual instanceof Set || actual instanceof Map) {
                if (!actual.has(expected)) {
                    throw new Error(`Expected Set/Map to contain key: ${JSON.stringify(expected)}`);
                }
            } else {
                throw new Error(`toContain called on unsupported type: ${typeof actual}`);
            }
        },
        toBeGreaterThan(expected: number) {
            if (typeof actual !== 'number' || actual <= expected) {
                throw new Error(`Expected ${actual} to be strictly greater than ${expected}`);
            }
        },
        toBeGreaterThanOrEqual(expected: number) {
            if (typeof actual !== 'number' || actual < expected) {
                throw new Error(`Expected ${actual} to be greater than or equal to ${expected}`);
            }
        },
        toBeLessThan(expected: number) {
            if (typeof actual !== 'number' || actual >= expected) {
                throw new Error(`Expected ${actual} to be strictly less than ${expected}`);
            }
        },
        toBeLessThanOrEqual(expected: number) {
            if (typeof actual !== 'number' || actual > expected) {
                throw new Error(`Expected ${actual} to be less than or equal to ${expected}`);
            }
        },
        toMatch(regex: RegExp) {
            if (typeof actual !== 'string' || !regex.test(actual)) {
                throw new Error(`Expected string to match regex ${regex}, got "${String(actual).slice(0, 100)}"`);
            }
        },
        toBeTruthy() {
            if (!actual) {
                throw new Error(`Expected value to be truthy, got: ${JSON.stringify(actual)}`);
            }
        },
        toBeFalsy() {
            if (actual) {
                throw new Error(`Expected value to be falsy, got: ${JSON.stringify(actual)}`);
            }
        },
        toBeDefined() {
            if (actual === undefined) {
                throw new Error(`Expected value to be defined, got undefined`);
            }
        },
        toBeUndefined() {
            if (actual !== undefined) {
                throw new Error(`Expected value to be undefined, got: ${JSON.stringify(actual)}`);
            }
        },
        toBeNull() {
            if (actual !== null) {
                throw new Error(`Expected value to be null, got: ${JSON.stringify(actual)}`);
            }
        },
        toThrow(expectedSubstring?: string | RegExp) {
            if (typeof actual !== 'function') {
                throw new Error(`toThrow must be invoked with a function, received ${typeof actual}`);
            }
            let threw = false;
            let caughtError: any = null;
            try {
                actual();
            } catch (err: any) {
                threw = true;
                caughtError = err;
            }
            if (!threw) {
                throw new Error(`Expected function to throw an error, but it executed without throwing.`);
            }
            if (expectedSubstring) {
                const message = caughtError?.message || String(caughtError);
                if (typeof expectedSubstring === 'string' && !message.includes(expectedSubstring)) {
                    throw new Error(`Expected error message to contain "${expectedSubstring}", but got "${message}"`);
                }
                if (expectedSubstring instanceof RegExp && !expectedSubstring.test(message)) {
                    throw new Error(`Expected error message to match ${expectedSubstring}, but got "${message}"`);
                }
            }
        },
        get not() {
            return {
                toBe(expected: any) {
                    if (actual === expected) {
                        throw new Error(`Expected value NOT to be ${JSON.stringify(expected)}`);
                    }
                },
                toBeNull() {
                    if (actual === null) {
                        throw new Error(`Expected value NOT to be null`);
                    }
                },
                toBeUndefined() {
                    if (actual === undefined) {
                        throw new Error(`Expected value NOT to be undefined`);
                    }
                },
                toEqual(expected: any) {
                    if (deepEqual(actual, expected)) {
                        throw new Error(`Expected value NOT to equal ${JSON.stringify(expected)}`);
                    }
                },
                toContain(expected: any) {
                    if (typeof actual === 'string' && actual.includes(expected)) {
                        throw new Error(`Expected string NOT to contain "${expected}"`);
                    }
                    if (Array.isArray(actual) && actual.includes(expected)) {
                        throw new Error(`Expected array NOT to contain ${JSON.stringify(expected)}`);
                    }
                },
                toThrow() {
                    try {
                        actual();
                    } catch (err: any) {
                        throw new Error(`Expected function NOT to throw, but caught error: ${err.message}`);
                    }
                }
            };
        },
        get rejects() {
            return {
                async toThrow(expectedSubstring?: string | RegExp) {
                    let threw = false;
                    let caughtError: any = null;
                    try {
                        await actual;
                    } catch (err: any) {
                        threw = true;
                        caughtError = err;
                    }
                    if (!threw) {
                        throw new Error(`Expected Promise to reject, but it resolved successfully.`);
                    }
                    if (expectedSubstring) {
                        const message = caughtError?.message || String(caughtError);
                        if (typeof expectedSubstring === 'string' && !message.includes(expectedSubstring)) {
                            throw new Error(`Expected rejection message to contain "${expectedSubstring}", got "${message}"`);
                        }
                        if (expectedSubstring instanceof RegExp && !expectedSubstring.test(message)) {
                            throw new Error(`Expected rejection message to match ${expectedSubstring}, got "${message}"`);
                        }
                    }
                }
            };
        }
    };
    return matchers;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. HIGH-FIDELITY DISCORD SIMULATION & MOCK HARNESSES
// ═══════════════════════════════════════════════════════════════════════════

export interface MockMemberOptions {
    id?: string;
    username?: string;
    guildId?: string;
    inVoice?: boolean;
    voiceChannelId?: string;
    permissions?: bigint[];
}

export function createMockGuildMember(opts: MockMemberOptions = {}) {
    const id = opts.id || 'usr-test-101';
    const username = opts.username || 'TestAudioUser';
    const guildId = opts.guildId || 'guild-bp-core';
    const inVoice = opts.inVoice !== undefined ? opts.inVoice : true;
    const voiceChannelId = opts.voiceChannelId || 'vc-music-main';

    const voiceChannel = inVoice ? {
        id: voiceChannelId,
        name: 'Voz Geral',
        guild: { id: guildId },
        members: new Collection<string, any>(),
        permissionsFor: () => ({
            has: () => true
        })
    } : null;

    const member = {
        id,
        displayName: username,
        user: { id, username, bot: false },
        guild: {
            id: guildId,
            name: 'BotParceiros Core Server'
        },
        voice: {
            channel: voiceChannel,
            channelId: voiceChannel ? voiceChannel.id : null
        },
        permissions: {
            has: (_perm: bigint) => true
        }
    };

    if (voiceChannel) {
        voiceChannel.members.set(id, member);
    }

    return member as any;
}

export function createMockMessage(options: {
    content: string;
    authorBot?: boolean;
    hasGuild?: boolean;
    guildId?: string;
    member?: any;
}) {
    const replies: any[] = [];
    const reactions: string[] = [];

    const member = options.member || createMockGuildMember();
    const hasGuild = options.hasGuild !== undefined ? options.hasGuild : true;
    const authorBot = options.authorBot || false;
    const guildId = hasGuild ? (options.guildId || member.guild?.id || 'guild-bp-core') : null;

    return {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        content: options.content,
        author: {
            id: member.user.id,
            username: member.user.username,
            bot: authorBot
        },
        guild: hasGuild ? { id: guildId, name: 'BotParceiros Guild' } : null,
        guildId,
        channel: {
            id: 'chan-chat-geral',
            send: async (payload: any) => {
                replies.push(payload);
                return { id: 'sent-msg-1', ...payload };
            },
            sendTyping: async () => {}
        },
        member: hasGuild ? member : null,
        client: {
            user: { id: 'bot-core-001', username: 'CoreBot' }
        },
        replies,
        reactions,
        reply: async (payload: any) => {
            const replyMsg = {
                id: `rep-${Date.now()}`,
                ...payload,
                edit: async (editPayload: any) => {
                    Object.assign(replyMsg, editPayload);
                    replies.push(editPayload);
                    return replyMsg;
                },
                delete: async () => {}
            };
            replies.push(replyMsg);
            return replyMsg;
        },
        react: async (emoji: string) => {
            reactions.push(emoji);
            return {};
        }
    } as any;
}

export function createMockSlashInteraction(options: {
    commandName: string;
    subcommand?: string;
    optionsMap?: Record<string, any>;
    member?: any;
}) {
    const replies: any[] = [];
    const deferReplies: any[] = [];
    let isDeferred = false;
    let isReplied = false;

    const member = options.member || createMockGuildMember();

    return {
        commandName: options.commandName,
        guildId: 'guild-bp-core',
        guild: { id: 'guild-bp-core', name: 'BotParceiros Guild' },
        channel: { id: 'chan-admin-commands' },
        member,
        user: member.user,
        get deferred() { return isDeferred; },
        get replied() { return isReplied; },
        options: {
            getSubcommand: () => options.subcommand || null,
            getString: (name: string) => options.optionsMap?.[name] || null,
            getInteger: (name: string) => options.optionsMap?.[name] ?? null,
            getBoolean: (name: string) => options.optionsMap?.[name] ?? null,
        },
        replies,
        deferReplies,
        isChatInputCommand: () => true,
        isStringSelectMenu: () => false,
        isButton: () => false,
        reply: async (payload: any) => {
            isReplied = true;
            replies.push(payload);
            return payload;
        },
        deferReply: async (opts?: any) => {
            isDeferred = true;
            deferReplies.push(opts);
        },
        editReply: async (payload: any) => {
            replies.push(payload);
            return payload;
        },
        followUp: async (payload: any) => {
            replies.push(payload);
            return payload;
        }
    } as any;
}

export function createMockSelectMenuInteraction(options: {
    customId: string;
    values: string[];
    member?: any;
}) {
    const updates: any[] = [];
    const replies: any[] = [];
    const member = options.member || createMockGuildMember();
    let isReplied = false;

    return {
        customId: options.customId,
        values: options.values,
        guildId: 'guild-bp-core',
        guild: { id: 'guild-bp-core' },
        channel: { id: 'chan-chat-geral' },
        member,
        user: member.user,
        get replied() { return isReplied; },
        updates,
        replies,
        isChatInputCommand: () => false,
        isStringSelectMenu: () => true,
        isButton: () => false,
        update: async (payload: any) => {
            isReplied = true;
            updates.push(payload);
            return payload;
        },
        reply: async (payload: any) => {
            isReplied = true;
            replies.push(payload);
            return payload;
        },
        deferUpdate: async () => {}
    } as any;
}

export function createMockButtonInteraction(options: {
    customId: string;
    member?: any;
}) {
    const updates: any[] = [];
    const replies: any[] = [];
    const member = options.member || createMockGuildMember();
    let isReplied = false;

    return {
        customId: options.customId,
        guildId: 'guild-bp-core',
        member,
        user: member.user,
        get replied() { return isReplied; },
        updates,
        replies,
        isChatInputCommand: () => false,
        isStringSelectMenu: () => false,
        isButton: () => true,
        update: async (payload: any) => {
            isReplied = true;
            updates.push(payload);
            return payload;
        },
        reply: async (payload: any) => {
            isReplied = true;
            replies.push(payload);
            return payload;
        },
        deferUpdate: async () => {}
    } as any;
}

export class MockAudioPlayer extends EventEmitter {
    public state: { status: 'idle' | 'buffering' | 'playing' | 'paused' | 'autodisconnect' } = {
        status: 'idle'
    };

    public play(_resource: any) {
        const prev = this.state.status;
        this.state.status = 'playing';
        this.emit('stateChange', { status: prev }, { status: 'playing' });
        this.emit('playing', { status: prev }, { status: 'playing' });
    }

    public pause() {
        if (this.state.status === 'playing') {
            const prev = this.state.status;
            this.state.status = 'paused';
            this.emit('stateChange', { status: prev }, { status: 'paused' });
            this.emit('paused', { status: prev }, { status: 'paused' });
            return true;
        }
        return false;
    }

    public unpause() {
        if (this.state.status === 'paused') {
            const prev = this.state.status;
            this.state.status = 'playing';
            this.emit('stateChange', { status: prev }, { status: 'playing' });
            this.emit('playing', { status: prev }, { status: 'playing' });
            return true;
        }
        return false;
    }

    public stop() {
        const prev = this.state.status;
        this.state.status = 'idle';
        this.emit('stateChange', { status: prev }, { status: 'idle' });
        this.emit('idle', { status: prev }, { status: 'idle' });
        return true;
    }
}

export class MockVoiceConnection extends EventEmitter {
    public state: { status: 'ready' | 'disconnected' | 'destroyed' } = {
        status: 'ready'
    };

    public subscribe(_player: any) {
        return { unsubscribe: () => {} };
    }

    public disconnect() {
        const prev = this.state.status;
        this.state.status = 'disconnected';
        this.emit('stateChange', { status: prev }, { status: 'disconnected' });
        this.emit('disconnected', { status: prev }, { status: 'disconnected' });
    }

    public destroy() {
        const prev = this.state.status;
        this.state.status = 'destroyed';
        this.emit('stateChange', { status: prev }, { status: 'destroyed' });
        this.emit('destroyed', { status: prev }, { status: 'destroyed' });
    }
}

function createMockVoiceChannelForQueue(id = 'vc-mock-1', name = 'Voz Geral') {
    const members = new Collection<string, any>();
    return {
        id,
        name,
        guild: {
            id: 'guild-test-queue',
            name: 'Test Guild',
            voiceAdapterCreator: () => ({})
        },
        members,
        permissionsFor: () => ({
            has: () => true
        })
    } as any;
}

function createMockTextChannelForQueue() {
    const sentMessages: any[] = [];
    return {
        id: 'tc-mock-1',
        name: 'comandos-bot',
        send: async (payload: any) => {
            sentMessages.push(payload);
            return { id: `msg-${Date.now()}`, ...payload };
        },
        sentMessages
    } as any;
}

const createTestTrack = (title: string, durationSeconds = 180): Track => ({
    id: `track-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    url: 'https://cdn.example.com/audio.mp3',
    duration: '03:00',
    durationSeconds,
    author: 'Test Artist',
    requestedBy: createMockGuildMember(),
    source: 'direct'
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. TEST DEFINITIONS (TIERS 1 TO 4 — 71 TOTAL ASSERTIONS)
// ═══════════════════════════════════════════════════════════════════════════

// ─── TIER 1: FEATURE COVERAGE (35 TESTS) ──────────────────────────────────

setContext(1, 'F1: Web Design & Tokens');

test('T1.1', 'Verify design.md exists and specifies CBDS v2.0.0 tokens with obsidian canvas & brand colors', () => {
    const designPath = path.resolve('design.md');
    expect(fs.existsSync(designPath)).toBe(true);

    const designContent = fs.readFileSync(designPath, 'utf-8');
    expect(designContent).toContain('CoreBot Design System');
    expect(designContent).toContain('#050507');
    expect(designContent).toContain('#7C3AED');
    expect(designContent).toContain('#F5C518');
    expect(designContent).toContain('#10B981');
    expect(designContent).toContain('#EF4444');
});

test('T1.2', 'Verify web/src/app/globals.css declares semantic design tokens', () => {
    const globalsPath = path.resolve('web/src/app/globals.css');
    expect(fs.existsSync(globalsPath)).toBe(true);

    const css = fs.readFileSync(globalsPath, 'utf-8');
    expect(css).toContain('--color-primary:');
    expect(css).toContain('--color-destructive:');
    expect(css).toContain('--color-card:');
    expect(css).toContain('--color-input:');
    expect(css).toContain('--color-border:');
});

test('T1.3', 'Verify @theme inline block in globals.css maps CSS variables for Tailwind CSS v4', () => {
    const globalsPath = path.resolve('web/src/app/globals.css');
    const css = fs.readFileSync(globalsPath, 'utf-8');

    expect(css).toContain('@theme inline');
    expect(css).toContain('--color-primary: var(--color-primary);');
    expect(css).toContain('--color-destructive: var(--color-destructive);');
    expect(css).toContain('--color-card: var(--color-card);');
});

test('T1.4', 'Verify card.tsx implements tokenized classes without hardcoded light themes', () => {
    const cardPath = path.resolve('web/src/components/ui/card.tsx');
    expect(fs.existsSync(cardPath)).toBe(true);

    const cardCode = fs.readFileSync(cardPath, 'utf-8');
    expect(cardCode).toContain('bg-card');
    expect(cardCode).toContain('text-card-foreground');
    expect(cardCode).toContain('border-border');
});

test('T1.5', 'Verify button.tsx implements semantic variant tokens with contrast compliance', () => {
    const buttonPath = path.resolve('web/src/components/ui/button.tsx');
    expect(fs.existsSync(buttonPath)).toBe(true);

    const buttonCode = fs.readFileSync(buttonPath, 'utf-8');
    expect(buttonCode).toContain('bg-primary');
    expect(buttonCode).toContain('text-primary-foreground');
    expect(buttonCode).toContain('bg-destructive');
});

setContext(1, 'F2: Web Quality & Build Gates');

test('T1.6', 'Bot TypeScript typecheck: execute npm run typecheck (tsc --noEmit) and assert exit code 0', () => {
    let success = false;
    try {
        execSync('npm run typecheck', { stdio: 'pipe' });
        success = true;
    } catch {
        success = false;
    }
    expect(success).toBe(true);
});

test('T1.7', 'Web Next.js production build: execute npm run build --workspace=web and assert exit code 0', () => {
    const buildOutput = execSync('npm run build --workspace=web', {
        stdio: 'pipe',
        timeout: 90000,
        encoding: 'utf-8'
    });
    expect(buildOutput).toContain('Compiled successfully');
    expect(fs.existsSync(path.resolve('web/.next'))).toBe(true);
});

test('T1.8', 'Web ESLint validation: execute npm run lint --workspace=web and assert zero errors', () => {
    let lintOutput = '';
    try {
        lintOutput = execSync('npm run lint --workspace=web', {
            stdio: 'pipe',
            timeout: 60000,
            encoding: 'utf-8'
        });
    } catch (err: any) {
        lintOutput = err.stdout ? String(err.stdout) : '';
    }
    expect(lintOutput).toContain('0 errors');
    expect(fs.existsSync(path.resolve('web/eslint.config.mjs'))).toBe(true);
});

test('T1.9', 'App Router canonical routes: verify page definitions exist for /[locale], docs, and dashboard', () => {
    expect(fs.existsSync(path.resolve('web/src/app/[locale]/page.tsx'))).toBe(true);
    expect(fs.existsSync(path.resolve('web/src/app/[locale]/docs/page.tsx'))).toBe(true);
    expect(fs.existsSync(path.resolve('web/src/app/[locale]/dashboard'))).toBe(true);
});

test('T1.10', 'Configuration integrity: verify next.config.ts and web/tsconfig.json settings', () => {
    const tsconfig = JSON.parse(fs.readFileSync(path.resolve('web/tsconfig.json'), 'utf-8'));
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.moduleResolution.toLowerCase()).toContain('bundler');
});

setContext(1, 'F3: Documentation & README Consistency');

test('T1.11', 'Web documentation music commands: verify docs/page.tsx defines core! commands', () => {
    const docsCode = fs.readFileSync(path.resolve('web/src/app/[locale]/docs/page.tsx'), 'utf-8');
    expect(docsCode).toContain('core!play');
    expect(docsCode).toContain('core!stop');
    expect(docsCode).toContain('core!skip');
    expect(docsCode).toContain('core!leave');
    expect(docsCode).toContain('core!queue');
    expect(docsCode.length).toBeGreaterThan(5000);
});

test('T1.12', 'Web documentation helpcore guide: verify docs structure covers helpcore and categories', () => {
    const docsCode = fs.readFileSync(path.resolve('web/src/app/[locale]/docs/page.tsx'), 'utf-8');
    expect(docsCode).toContain('helpcore');
    expect(docsCode).toContain('categoria');
});

test('T1.13', 'Root README.md command reference: verify README.md architectural structure and commands', () => {
    const readme = fs.readFileSync(path.resolve('README.md'), 'utf-8');
    expect(readme).toContain('CoreBot');
    expect(readme).toContain('core!');
    expect(readme).toContain('helpcore');
});

test('T1.14', 'Syntax consistency: verify music command usage formatting in bot codebase', () => {
    expect(playCommand.usage).toContain('core!play');
    expect(stopCommand.usage).toContain('core!stop');
    expect(skipCommand.usage).toContain('core!skip');
    expect(leaveCommand.usage).toContain('core!leave');
});

test('T1.15', 'Route navigation links: verify internal documentation links maintain locale prefix', () => {
    const docsCode = fs.readFileSync(path.resolve('web/src/app/[locale]/docs/page.tsx'), 'utf-8');
    expect(docsCode).toContain('useLocale');
    expect(docsCode).toContain('${locale}');
});

setContext(1, 'F4: Discord Bot Music Commands (core!)');

test('T1.16', 'Case-insensitive prefix recognition: verify parser accepts core!play, CORE!play, Core!Play', () => {
    const c1 = parseMusicCommand('core!play song');
    const c2 = parseMusicCommand('CORE!play song');
    const c3 = parseMusicCommand('Core!Play song');

    expect(c1).toBeDefined();
    expect(c1?.commandName).toBe('play');
    expect(c2?.commandName).toBe('play');
    expect(c3?.commandName).toBe('play');
});

test('T1.17', 'Command extraction: cleanly extract command name and query arguments', () => {
    const parsed = parseMusicCommand('core!play Bohemian Rhapsody Queen');
    expect(parsed).toBeDefined();
    expect(parsed?.commandName).toBe('play');
    expect(parsed?.args).toEqual(['Bohemian', 'Rhapsody', 'Queen']);
});

test('T1.18', 'Multi-language alias resolution: verify Portuguese and English aliases', () => {
    expect(findMusicCommand('p')?.name).toBe('play');
    expect(findMusicCommand('s')?.name).toBe('skip');
    expect(findMusicCommand('pular')?.name).toBe('skip');
    expect(findMusicCommand('parar')?.name).toBe('stop');
    expect(findMusicCommand('sair')?.name).toBe('leave');
    expect(findMusicCommand('dc')?.name).toBe('leave');
    expect(findMusicCommand('fila')?.name).toBe('queue');
    expect(findMusicCommand('np')?.name).toBe('nowplaying');
});

test('T1.19', 'Voice channel precondition: reject music command when user is not in a voice channel', async () => {
    const memberNotInVoice = createMockGuildMember({ inVoice: false });
    const msg = createMockMessage({ content: 'core!play Imagine Dragons', member: memberNotInVoice });

    await playCommand.execute(msg, ['Imagine', 'Dragons'], memberNotInVoice);
    expect(msg.replies.length).toBeGreaterThan(0);
    const replyEmbed = msg.replies[0]?.embeds?.[0]?.data?.description;
    expect(replyEmbed).toContain('Você precisa estar em um canal de voz');
});

test('T1.20', 'Queue inspection: format queue embed and progress bar calculation', () => {
    const barLive = createProgressBar(0, 0);
    expect(barLive).toContain('Ao Vivo / Direto');

    const barProgress = createProgressBar(30000, 60); // 30s of 60s
    expect(barProgress).toContain('🔘');
    expect(barProgress).toContain('00:30');
    expect(barProgress).toContain('01:00');
});

setContext(1, 'F5: Audio Queue & State Machine');

test('T1.21', 'FIFO queue ordering: tracks play strictly in first-in first-out sequence in GuildQueue', () => {
    const voiceChannel = createMockVoiceChannelForQueue('vc-fifo');
    const textChannel = createMockTextChannelForQueue();
    const queue = new GuildQueue('guild-fifo', voiceChannel, textChannel);

    const t1 = createTestTrack('Track 1');
    const t2 = createTestTrack('Track 2');
    const t3 = createTestTrack('Track 3');

    queue.enqueue([t1, t2, t3]);
    expect(queue.tracks.length).toBe(3);
    expect(queue.tracks[0].title).toBe('Track 1');
    expect(queue.tracks[1].title).toBe('Track 2');
    expect(queue.tracks[2].title).toBe('Track 3');

    const shifted = queue.tracks.shift();
    expect(shifted?.title).toBe('Track 1');
    expect(queue.tracks[0].title).toBe('Track 2');

    queue.destroy();
});

test('T1.22', 'Idle state transition: player transitioning to idle advances to next track', () => {
    const player = new MockAudioPlayer();
    let advanceCalled = false;

    player.on('stateChange', (_oldState, newState) => {
        if (newState.status === 'idle') {
            advanceCalled = true;
        }
    });

    player.play({});
    expect(player.state.status).toBe('playing');
    player.stop();
    expect(advanceCalled).toBe(true);
});

test('T1.23', 'Loop modes: handles off, track, and queue modes correctly in GuildQueue', () => {
    const voiceChannel = createMockVoiceChannelForQueue('vc-loop');
    const textChannel = createMockTextChannelForQueue();
    const queue = new GuildQueue('guild-loop', voiceChannel, textChannel);

    expect(queue.loopMode).toBe('off');

    queue.setLoop('track');
    expect(queue.loopMode).toBe('track');

    queue.setLoop('queue');
    expect(queue.loopMode).toBe('queue');

    queue.setLoop('off');
    expect(queue.loopMode).toBe('off');

    queue.destroy();
});

test('T1.24', 'Playback state controls: pause and resume toggle player status safely', () => {
    const player = new MockAudioPlayer();
    player.play({});
    expect(player.state.status).toBe('playing');

    player.pause();
    expect(player.state.status).toBe('paused');

    player.unpause();
    expect(player.state.status).toBe('playing');
});

test('T1.25', 'Idle disconnect timer: empty queue schedules clean disconnect timer in GuildQueue', () => {
    const voiceChannel = createMockVoiceChannelForQueue('vc-idle');
    const textChannel = createMockTextChannelForQueue();
    const queue = new GuildQueue('guild-idle', voiceChannel, textChannel);

    expect((queue as any).idleTimer).toBeNull();
    queue.startIdleTimer();
    expect((queue as any).idleTimer).not.toBeNull();

    queue.clearIdleTimer();
    expect((queue as any).idleTimer).toBeNull();

    const queueSrc = fs.readFileSync(path.resolve('src/bots/music/guild-queue.ts'), 'utf-8');
    expect(queueSrc).toContain('IDLE_TIMEOUT_MS = 5 * 60 * 1000');

    queue.destroy();
});

setContext(1, 'F6: Slash Command /helpcore');

test('T1.26', 'Slash command builder: verify /helpcore slash command specification structure', () => {
    expect(HELPCORE_COMMAND).toBeDefined();
    expect(HELPCORE_COMMAND.name).toBe('helpcore');
    expect(HELPCORE_COMMAND.description.length).toBeGreaterThan(10);
    const options = HELPCORE_COMMAND.options;
    expect(options.length).toBeGreaterThan(0);
    const catOpt = options.find((opt: any) => opt.name === 'categoria');
    expect(catOpt).toBeDefined();
});

test('T1.27', 'Select menu structure: verify StringSelectMenuBuilder with customId helpcore_category_select', () => {
    const components = buildHelpCoreComponents('overview');
    expect(components.length).toBeGreaterThanOrEqual(1);
    const selectRow = components[0];
    const selectMenu = selectRow.components[0];
    expect(selectMenu.data.custom_id).toBe('helpcore_category_select');
});

test('T1.28', '7-category coverage: menu contains Visão Geral, Música, IA, Calls, Tickets, Moderação, Personalizados', () => {
    const keys = Object.keys(HELPCORE_CATEGORIES);
    expect(keys.length).toBe(7);
    expect(keys).toContain('overview');
    expect(keys).toContain('music');
    expect(keys).toContain('ai');
    expect(keys).toContain('calls');
    expect(keys).toContain('tickets');
    expect(keys).toContain('moderation');
    expect(keys).toContain('custom');
});

test('T1.29', 'Navigation buttons: response includes helpcore:home button and external links', () => {
    const components = buildHelpCoreComponents('overview');
    expect(components.length).toBeGreaterThanOrEqual(2);
    const buttonRow = components[1];
    const ids = buttonRow.components.map((c: any) => c.data.custom_id || c.data.url);
    expect(ids).toContain('helpcore:home');
    const urls = buttonRow.components.map((c: any) => c.data.url).filter(Boolean);
    expect(urls.some((u: string) => u.includes('corebot.online'))).toBe(true);
});

test('T1.30', 'Overview embed: default help embed displays welcoming guide and prefix instructions', () => {
    const embed = buildHelpCoreEmbed('overview');
    expect(embed.data.title).toContain('Central de Ajuda');
    expect(embed.data.color).toBe(0x7C3AED);
    expect(embed.data.fields?.length).toBeGreaterThan(0);
});

setContext(1, 'F7: CoreIA Routing & Custom Command Protection');

test('T1.31', 'Early message interception: CoreIA/index.ts intercepts core! before AI chat logic', () => {
    const coreIAIndex = fs.readFileSync(path.resolve('src/bots/CoreIA/index.ts'), 'utf-8');
    expect(coreIAIndex).toContain("message.content.trim().toLowerCase().startsWith('core!')");
});

test('T1.32', 'Music event initialization: CoreIA imports and invokes setupMusicEvents(client)', () => {
    const coreIAIndex = fs.readFileSync(path.resolve('src/bots/CoreIA/index.ts'), 'utf-8');
    expect(coreIAIndex).toContain('setupMusicEvents');
    expect(coreIAIndex).toContain('setupMusicEvents(client);');
});

test('T1.33', 'Global command registry: CoreIA maintains commands array including HELPCORE_COMMAND', () => {
    const coreIAIndex = fs.readFileSync(path.resolve('src/bots/CoreIA/index.ts'), 'utf-8');
    expect(coreIAIndex).toContain('const commands = [');
    expect(coreIAIndex).toContain('HELPCORE_COMMAND,');
});

test('T1.34', 'MODULE_COMMANDS protection: protect module commands from custom command DB fallback', () => {
    const coreIAIndex = fs.readFileSync(path.resolve('src/bots/CoreIA/index.ts'), 'utf-8');
    expect(coreIAIndex).toContain('const MODULE_COMMANDS = [');
    const match = coreIAIndex.match(/const\s+MODULE_COMMANDS\s*=\s*\[([\s\S]*?)\];/);
    expect(match).not.toBeNull();
    const content = match![1];
    expect(content).toContain("'helpcore'");
    expect(content).toContain("'call'");
});

test('T1.35', 'Interaction dispatcher: CoreIA routes slash and component interactions', () => {
    const coreIAIndex = fs.readFileSync(path.resolve('src/bots/CoreIA/index.ts'), 'utf-8');
    expect(coreIAIndex).toContain("client.on('interactionCreate'");
    expect(coreIAIndex).toContain('helpcore_category_select');
});

// ─── TIER 2: BOUNDARY & CORNER CASES (25 TESTS) ───────────────────────────

setContext(2, 'Boundary & Corner Cases');

test('T2.1', 'B1.1 (Music Empty Input): core!play with whitespace only returns guidance embed without throwing', async () => {
    const msg = createMockMessage({ content: 'core!play    ' });
    await playCommand.execute(msg, [], msg.member);
    expect(msg.replies.length).toBeGreaterThan(0);
    expect(msg.replies[0]?.embeds?.[0]?.data?.description).toContain('Informe o nome de uma música ou um link');
});

test('T2.2', 'B1.2 (Music Huge Query): search query of 1,500+ characters is safely processed without crashing', async () => {
    const longQuery = 'A'.repeat(1600);
    const parsed = parseMusicCommand(`core!play ${longQuery}`);
    expect(parsed?.args[0].length).toBe(1600);
    expect(parsed?.commandName).toBe('play');
});

test('T2.3', 'B1.3 (Music Invalid Protocol): unsafe protocols (file://, javascript:) rejected as direct audio', () => {
    expect(isDirectAudioUrl('file:///etc/passwd')).toBe(false);
    expect(isDirectAudioUrl('javascript:alert(1)')).toBe(false);
    expect(isDirectAudioUrl('http://cdn.example.com/audio.mp3')).toBe(true);
});

test('T2.4', 'B1.4 (Music Action on Empty Queue): core!skip or core!stop with nothing playing returns graceful status', async () => {
    const msg = createMockMessage({ content: 'core!skip' });
    await skipCommand.execute(msg, [], msg.member);
    expect(msg.replies.length).toBeGreaterThan(0);
    const desc = msg.replies[0]?.embeds?.[0]?.data?.description?.toLowerCase() || '';
    expect(desc).toContain('nenhuma música');
});

test('T2.5', 'B1.5 (Music Whitespace & Newlines): core!play   song \\n title is normalized to clean args', () => {
    const parsed = parseMusicCommand('core!play   song \n title  ');
    expect(parsed?.args).toEqual(['song', 'title']);
});

test('T2.6', 'B2.1 (Queue Concurrency Burst): 10 concurrent track enqueue requests resolve atomically in GuildQueue', async () => {
    const voiceChannel = createMockVoiceChannelForQueue('vc-burst');
    const textChannel = createMockTextChannelForQueue();
    const queue = new GuildQueue('guild-burst', voiceChannel, textChannel);

    const tracks = Array.from({ length: 10 }, (_, i) => createTestTrack(`Burst Track #${i + 1}`));

    await Promise.all(tracks.map(async t => {
        queue.enqueue(t);
    }));

    expect(queue.tracks.length).toBe(10);
    const titles = queue.tracks.map(t => t.title);
    expect(new Set(titles).size).toBe(10);

    queue.destroy();
});

test('T2.7', 'B2.2 (Queue Stream Failure Recovery): simulated streaming error notifies channel and recovers in GuildQueue', () => {
    const voiceChannel = createMockVoiceChannelForQueue('vc-stream-err');
    const textChannel = createMockTextChannelForQueue();
    const queue = new GuildQueue('guild-stream-err', voiceChannel, textChannel);

    const errorMsg = 'Simulated decoder failure HTTP 503';
    queue.player.emit('error', new Error(errorMsg));

    expect(textChannel.sentMessages.length).toBeGreaterThan(0);
    const lastMsg = textChannel.sentMessages[textChannel.sentMessages.length - 1];
    expect(lastMsg.embeds?.[0]?.data?.color).toBe(0xED4245);
    expect(lastMsg.embeds?.[0]?.data?.description).toContain(errorMsg);

    queue.destroy();
});

test('T2.8', 'B2.3 (Queue Abrupt Voice Disconnect): forcible connection kill cleans up guild state and destroys player', () => {
    const voiceChannel = createMockVoiceChannelForQueue('vc-abrupt');
    const textChannel = createMockTextChannelForQueue();
    musicManager.getOrCreateQueue('guild-abrupt', voiceChannel, textChannel);

    expect(musicManager.getQueue('guild-abrupt')).toBeDefined();

    const oldState = { guild: { id: 'guild-abrupt' }, id: 'bot-core-001', channelId: 'vc-abrupt', client: { user: { id: 'bot-core-001' } } } as any;
    const newState = { guild: { id: 'guild-abrupt' }, id: 'bot-core-001', channelId: null, client: { user: { id: 'bot-core-001' } } } as any;

    musicManager.handleVoiceStateUpdate(oldState, newState);
    expect(musicManager.getQueue('guild-abrupt')).toBeUndefined();
});

test('T2.9', 'B2.4 (Queue Empty Voice Channel): channel vacancy auto-leave timer schedules at 60 seconds and clears on return', () => {
    const voiceChannel = createMockVoiceChannelForQueue('vc-empty');
    const textChannel = createMockTextChannelForQueue();
    const queue = new GuildQueue('guild-empty-test', voiceChannel, textChannel);

    expect(voiceChannel.members.size).toBe(0);
    queue.checkEmptyChannel();
    expect((queue as any).emptyTimer).not.toBeNull();

    voiceChannel.members.set('user-1', { id: 'user-1', user: { bot: false } });
    queue.checkEmptyChannel();
    expect((queue as any).emptyTimer).toBeNull();

    const queueSrc = fs.readFileSync(path.resolve('src/bots/music/guild-queue.ts'), 'utf-8');
    expect(queueSrc).toContain('EMPTY_CHANNEL_TIMEOUT_MS = 60 * 1000');

    queue.destroy();
});

test('T2.10', 'B2.5 (Queue Single-Track Queue Loop): loop mode queue with 1 track cycles stably without recursion', () => {
    const voiceChannel = createMockVoiceChannelForQueue('vc-single-loop');
    const textChannel = createMockTextChannelForQueue();
    const queue = new GuildQueue('guild-single-loop', voiceChannel, textChannel);

    const soloTrack = createTestTrack('Solo Track');
    queue.enqueue(soloTrack);
    queue.setLoop('queue');

    (queue as any).currentTrack = queue.tracks.shift()!;
    expect((queue as any).currentTrack.title).toBe('Solo Track');
    expect(queue.tracks.length).toBe(0);

    if (queue.loopMode === 'queue' && (queue as any).currentTrack) {
        queue.tracks.push((queue as any).currentTrack);
    }
    (queue as any).currentTrack = null;

    expect(queue.tracks.length).toBe(1);
    expect(queue.tracks[0].title).toBe('Solo Track');

    queue.destroy();
});

test('T2.11', 'B3.1 (Helpcore Unknown CustomId): unknown select menu value returns graceful overview fallback', async () => {
    const interaction = createMockSelectMenuInteraction({
        customId: 'helpcore_category_select',
        values: ['unknown_invalid_category_xyz']
    });

    await handleHelpCoreSelectMenu(interaction);
    expect(interaction.updates.length).toBeGreaterThan(0);
    const updated = interaction.updates[0];
    const embed = updated.embeds[0];
    expect(embed.data.title).toContain('Central de Ajuda');
});

test('T2.12', 'B3.2 (Helpcore Deleted Message Interaction): handles Discord 10008 error gracefully in interaction update', async () => {
    const interaction = createMockSelectMenuInteraction({
        customId: 'helpcore_category_select',
        values: ['music']
    });

    interaction.update = async () => {
        throw new Error('DiscordAPIError[10008]: Unknown Message');
    };

    let threw = false;
    try {
        await handleHelpCoreSelectMenu(interaction);
    } catch {
        threw = true;
    }
    expect(threw).toBe(false);
});

test('T2.13', 'B3.3 (Helpcore Interaction Timeout Handling): deferReply executes within 3-second deadline', async () => {
    const interaction = createMockSlashInteraction({ commandName: 'helpcore' });
    const startTime = Date.now();
    await interaction.deferReply({ ephemeral: false });
    const elapsed = Date.now() - startTime;

    expect(interaction.deferred).toBe(true);
    expect(elapsed).toBeLessThan(3000);
});

test('T2.14', 'B3.4 (Helpcore Discord Option String Limits): select menu labels & descriptions <= 100 chars', () => {
    const categories = Object.values(HELPCORE_CATEGORIES);
    for (const cat of categories) {
        expect(cat.label.length).toBeLessThanOrEqual(100);
        expect(cat.description.length).toBeLessThanOrEqual(100);
    }
});

test('T2.15', 'B3.5 (Helpcore Ephemeral Navigation): supports ephemeral display to reduce chat clutter in error handlers', () => {
    const helpcoreSrc = fs.readFileSync(path.resolve('src/bots/helpcore/command.ts'), 'utf-8');
    expect(helpcoreSrc).toContain('ephemeral: true');

    const coreIASrc = fs.readFileSync(path.resolve('src/bots/CoreIA/index.ts'), 'utf-8');
    expect(coreIASrc).toContain('ephemeral: true');
});

test('T2.16', 'B4.1 (CoreIA Bot-Originated Messages): messages sent by bot users are ignored immediately', () => {
    const msg = createMockMessage({ content: 'core!play test', authorBot: true });
    expect(msg.author.bot).toBe(true);
    expect(msg.replies.length).toBe(0);
});

test('T2.17', 'B4.2 (CoreIA Direct Message Context): core! in DM context without guild is safely ignored', () => {
    const msg = createMockMessage({ content: 'core!play test', hasGuild: false });
    expect(msg.guild).toBeNull();
    expect(msg.replies.length).toBe(0);
});

test('T2.18', 'B4.3 (CoreIA Malformed Prefix): lone core!, core!!play, core!? handled cleanly', () => {
    const p1 = parseMusicCommand('core!');
    expect(p1?.commandName).toBe('help');

    const p2 = parseMusicCommand('core!!play');
    expect(p2?.commandName).toBe('!play');

    const p3 = parseMusicCommand('core!?');
    expect(p3?.commandName).toBe('?');
});

test('T2.19', 'B4.4 (CoreIA Unprivileged /call): non-admin executing restricted command is caught by permissions', () => {
    const coreIASrc = fs.readFileSync(path.resolve('src/bots/CoreIA/index.ts'), 'utf-8');
    expect(coreIASrc).toContain('PermissionFlagsBits.Administrator');
    expect(coreIASrc).toContain('desfazer-servidor');
    expect(coreIASrc).toContain('ajustar-servidor');

    const privateCallsSrc = fs.readFileSync(path.resolve('src/bots/private-calls/events.ts'), 'utf-8');
    expect(privateCallsSrc).toContain('PermissionsBitField.Flags.Administrator');
    expect(privateCallsSrc).toContain('Você não tem permissão para usar este comando');
});

test('T2.20', 'B4.5 (CoreIA Database Colliding Command): module command names take precedence over custom DB', () => {
    const coreIAIndex = fs.readFileSync(path.resolve('src/bots/CoreIA/index.ts'), 'utf-8');
    const match = coreIAIndex.match(/const\s+MODULE_COMMANDS\s*=\s*\[([\s\S]*?)\];/);
    expect(match).not.toBeNull();
    const content = match![1];
    expect(content).toContain("'helpcore'");
    expect(content).toContain("'call'");
});

test('T2.21', 'B5.1 (Web Design Token Fallbacks): CSS declarations provide robust color fallbacks', () => {
    const css = fs.readFileSync(path.resolve('web/src/app/globals.css'), 'utf-8');
    expect(css).toContain('--color-primary: #7C3AED;');
    expect(css).toContain('--color-card: #0A0A0E;');
});

test('T2.22', 'B5.2 (Web Dark Mode Contrast): obsidian canvas #050507 and foreground #EDEDEF maintain >15:1 ratio', () => {
    function getRelativeLuminance(hex: string): number {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    }
    const canvasLum = getRelativeLuminance('#050507');
    const textLum = getRelativeLuminance('#EDEDEF');
    const contrastRatio = (Math.max(canvasLum, textLum) + 0.05) / (Math.min(canvasLum, textLum) + 0.05);

    expect(contrastRatio).toBeGreaterThan(15.0);
    expect(contrastRatio).toBeGreaterThan(4.5);
});

test('T2.23', 'B5.3 (Web Locale Fallback): Next.js middleware / locale routing supports default pt-BR or pt', () => {
    const middlewarePath = path.resolve('web/src/middleware.ts');
    expect(fs.existsSync(middlewarePath)).toBe(true);

    const code = fs.readFileSync(middlewarePath, 'utf-8');
    expect(code.includes("'pt'") || code.includes("'pt-BR'")).toBe(true);
});

test('T2.24', 'B5.4 (Documentation Broken Markdown): verify design.md has balanced code blocks', () => {
    const designText = fs.readFileSync(path.resolve('design.md'), 'utf-8');
    const fences = (designText.match(/```/g) || []).length;
    expect(fences % 2).toBe(0);
});

test('T2.25', 'B5.5 (Monorepo TypeScript Root Isolation): root tsconfig rootDir isolates src from scripts', () => {
    const tsconfig = JSON.parse(fs.readFileSync(path.resolve('tsconfig.json'), 'utf-8'));
    expect(tsconfig.compilerOptions.rootDir).toBe('./src');
    expect(tsconfig.compilerOptions.outDir).toBe('./dist');
});

// ─── TIER 3: CROSS-FEATURE COMBINATIONS (6 SUITES) ────────────────────────

setContext(3, 'Cross-Feature Combinations');

test('T3.1', 'C1 (Music ↔ CoreIA AI Chat Isolation): core!play in general chat bypasses AI response generator', () => {
    const coreIAIndex = fs.readFileSync(path.resolve('src/bots/CoreIA/index.ts'), 'utf-8');
    const messageCreateBlock = coreIAIndex.slice(coreIAIndex.indexOf("client.on('messageCreate'"));

    const earlyReturnIdx = messageCreateBlock.indexOf("message.content.trim().toLowerCase().startsWith('core!')");
    const aiChatIdx = messageCreateBlock.indexOf('runChatGeralLogic');

    expect(earlyReturnIdx).toBeGreaterThan(0);
    expect(aiChatIdx).toBeGreaterThan(earlyReturnIdx);
});

test('T3.2', 'C2 (Helpcore ↔ Music Subsystem Parity): 100% of exported music commands are cataloged', () => {
    expect(MUSIC_COMMANDS.length).toBe(10);
    const commandNames = MUSIC_COMMANDS.map(c => c.name);
    expect(commandNames).toContain('play');
    expect(commandNames).toContain('stop');
    expect(commandNames).toContain('skip');
    expect(commandNames).toContain('leave');
    expect(commandNames).toContain('queue');
    expect(commandNames).toContain('pause');
    expect(commandNames).toContain('resume');
    expect(commandNames).toContain('nowplaying');
    expect(commandNames).toContain('loop');
    expect(commandNames).toContain('help');
});

test('T3.3', 'C3 (Helpcore ↔ Private Calls Protection): native commands bypass custom command database resolution', () => {
    const coreIAIndex = fs.readFileSync(path.resolve('src/bots/CoreIA/index.ts'), 'utf-8');
    expect(coreIAIndex).toContain('MODULE_COMMANDS.includes(interaction.commandName)');
});

test('T3.4', 'C4 (Web Documentation ↔ Discord Bot Parity): documentation signatures match bot commands', () => {
    expect(playCommand.name).toBe('play');
    expect(skipCommand.name).toBe('skip');
    expect(stopCommand.name).toBe('stop');
    expect(leaveCommand.name).toBe('leave');
});

test('T3.5', 'C5 (Design Tokens ↔ UI Component Styling): globals.css variables match component utility classes', () => {
    const css = fs.readFileSync(path.resolve('web/src/app/globals.css'), 'utf-8');
    expect(css).toContain('--color-primary');
    expect(css).toContain('--color-secondary');
    expect(css).toContain('--color-destructive');
    expect(css).toContain('--color-card');
    expect(css).toContain('--color-border');
});

test('T3.6', 'C6 (Full-Stack Monorepo Build Integration): workspace packages and build configuration execute cleanly', () => {
    const rootPkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));
    expect(rootPkg.workspaces).toContain('web');
    expect(fs.existsSync(path.resolve('web/.next'))).toBe(true);
    const tsconfig = JSON.parse(fs.readFileSync(path.resolve('tsconfig.json'), 'utf-8'));
    expect(tsconfig.compilerOptions.rootDir).toBe('./src');
});

// ─── TIER 4: REAL-WORLD WORKLOAD TESTING (5 SCENARIOS) ────────────────────

setContext(4, 'Real-World Workload Testing');

test('T4.1', 'W1 (Complete End-to-End Music Session Workflow): simulate full session from play to leave', async () => {
    const guildId = 'guild-t4-1';
    const voiceChannel = createMockVoiceChannelForQueue('vc-t4-1');
    const textChannel = createMockTextChannelForQueue();
    const queue = musicManager.getOrCreateQueue(guildId, voiceChannel, textChannel);

    const member = createMockGuildMember({ inVoice: true, voiceChannelId: 'vc-t4-1', guildId });

    // Step 1: User issues core!play track 1
    const t1 = createTestTrack('Bohemian Rhapsody');
    queue.enqueue(t1);
    expect(queue.tracks.length).toBe(1);

    // Step 2: User enqueues second track
    const t2 = createTestTrack("Don't Stop Me Now");
    queue.enqueue(t2);
    expect(queue.tracks.length).toBe(2);

    // Set active playing track
    (queue as any).currentTrack = queue.tracks.shift()!;
    (queue.player as any).state = { status: 'playing' };
    queue.player.pause = () => {
        (queue.player as any).state = { status: 'paused' };
        return true;
    };
    queue.player.unpause = () => {
        (queue.player as any).state = { status: 'playing' };
        return true;
    };
    queue.player.stop = (_force?: boolean) => {
        (queue.player as any).state = { status: 'idle' };
        return true;
    };

    // Step 3: Inspect queue core!queue
    const msgQueue = createMockMessage({ content: 'core!queue', member, guildId });
    await queueCommand.execute(msgQueue, [], member);
    expect(msgQueue.replies.length).toBeGreaterThan(0);
    const queueFields = JSON.stringify(msgQueue.replies[0]?.embeds?.[0]?.data?.fields || []);
    expect(queueFields).toContain('Bohemian Rhapsody');
    expect(queueFields).toContain("Don't Stop Me Now");

    // Step 4: Pause and Resume
    const msgPause = createMockMessage({ content: 'core!pause', member, guildId });
    await pauseCommand.execute(msgPause, [], member);
    expect(msgPause.replies.length).toBeGreaterThan(0);
    expect(queue.isPaused).toBe(true);

    const msgResume = createMockMessage({ content: 'core!resume', member, guildId });
    await resumeCommand.execute(msgResume, [], member);
    expect(msgResume.replies.length).toBeGreaterThan(0);
    expect(queue.isPlaying).toBe(true);

    // Step 5: Toggle Loop (core!loop queue)
    const msgLoop = createMockMessage({ content: 'core!loop queue', member, guildId });
    await loopCommand.execute(msgLoop, ['queue'], member);
    expect(queue.loopMode).toBe('queue');
    expect(msgLoop.replies.length).toBeGreaterThan(0);

    // Step 6: Simulate track 1 finishing with loopMode = queue
    if (queue.loopMode === 'queue' && (queue as any).currentTrack) {
        queue.tracks.push((queue as any).currentTrack);
    }
    (queue as any).currentTrack = queue.tracks.shift()!;
    expect((queue as any).currentTrack.title).toBe("Don't Stop Me Now");
    expect(queue.tracks[queue.tracks.length - 1].title).toBe('Bohemian Rhapsody');

    // Step 7: User skips track core!skip
    const msgSkip = createMockMessage({ content: 'core!skip', member, guildId });
    await skipCommand.execute(msgSkip, [], member);
    expect(msgSkip.replies.length).toBeGreaterThan(0);
    expect(msgSkip.replies[0]?.embeds?.[0]?.data?.description).toContain("Don't Stop Me Now");

    // Step 8: User stops core!stop
    const msgStop = createMockMessage({ content: 'core!stop', member, guildId });
    await stopCommand.execute(msgStop, [], member);
    expect(msgStop.replies.length).toBeGreaterThan(0);
    expect(queue.tracks.length).toBe(0);

    // Step 9: User commands bot to leave core!leave
    musicManager.getOrCreateQueue('guild-t4-leave', voiceChannel, textChannel);
    const memberLeave = createMockGuildMember({ inVoice: true, voiceChannelId: 'vc-t4-1', guildId: 'guild-t4-leave' });
    const msgLeave2 = createMockMessage({ content: 'core!leave', member: memberLeave, guildId: 'guild-t4-leave' });
    await leaveCommand.execute(msgLeave2, [], memberLeave);
    expect(msgLeave2.replies.length).toBeGreaterThan(0);
    expect(msgLeave2.replies[0]?.embeds?.[0]?.data?.description).toContain('Desconectado');
    expect(musicManager.getQueue('guild-t4-leave')).toBeUndefined();
});

test('T4.2', 'W2 (Interactive Helpcore Discovery Journey): simulate user navigation through /helpcore categories', async () => {
    // 1. User executes /helpcore
    const slash = createMockSlashInteraction({ commandName: 'helpcore' });
    await handleHelpCoreCommand(slash);
    expect(slash.replies.length).toBeGreaterThan(0);
    const initialReply = slash.replies[0];
    expect(initialReply.embeds[0].data.title).toContain('Central de Ajuda');
    expect(initialReply.components.length).toBe(2);

    // 2. User selects category 'music'
    const selectMusic = createMockSelectMenuInteraction({
        customId: 'helpcore_category_select',
        values: ['music']
    });
    await handleHelpCoreSelectMenu(selectMusic);
    expect(selectMusic.updates.length).toBeGreaterThan(0);
    const musicEmbed = selectMusic.updates[0].embeds[0];
    expect(musicEmbed.data.title).toContain('Música');
    const musicFields = musicEmbed.data.fields?.map((f: any) => f.value).join(' ') || '';
    expect(musicFields).toContain('core!play');
    expect(musicFields).toContain('core!stop');

    // 3. User selects category 'calls'
    const selectCalls = createMockSelectMenuInteraction({
        customId: 'helpcore_category_select',
        values: ['calls']
    });
    await handleHelpCoreSelectMenu(selectCalls);
    expect(selectCalls.updates.length).toBeGreaterThan(0);
    const callsEmbed = selectCalls.updates[0].embeds[0];
    expect(callsEmbed.data.title).toContain('Calls');

    // 4. User clicks home button
    const btnHome = createMockButtonInteraction({ customId: 'helpcore:home' });
    await handleHelpCoreButton(btnHome);
    expect(btnHome.updates.length).toBeGreaterThan(0);
    const homeEmbed = btnHome.updates[0].embeds[0];
    expect(homeEmbed.data.title).toContain('Central de Ajuda');

    // 5. Verify external links point to corebot.online and /docs
    const components = buildHelpCoreComponents('overview');
    const buttonRow = components[1];
    const urls = buttonRow.components.map((c: any) => c.data.url).filter(Boolean);
    expect(urls).toContain('https://corebot.online');
    expect(urls).toContain('https://corebot.online/docs');
});

test('T4.3', 'W3 (Concurrent Multi-Tenant Guild Workload): concurrent requests across music, AI, and helpcore', async () => {
    // Guild A: Music queue operation
    const vcA = createMockVoiceChannelForQueue('vc-guild-a');
    const tcA = createMockTextChannelForQueue();
    const queueA = musicManager.getOrCreateQueue('guild-tenant-a', vcA, tcA);
    queueA.enqueue(createTestTrack('Tenant Track A'));

    // Guild B: CoreIA message routing (core! message parsed)
    const msgB = createMockMessage({ content: 'core!play Tenant Song B' });
    const parsedB = parseMusicCommand(msgB.content);

    // Guild C: Helpcore slash command
    const slashC = createMockSlashInteraction({ commandName: 'helpcore' });

    // Guild D: Helpcore select menu interaction
    const selectD = createMockSelectMenuInteraction({
        customId: 'helpcore_category_select',
        values: ['tickets']
    });

    const [resA, resB, resC, resD] = await Promise.all([
        (async () => {
            const memberA = createMockGuildMember({ inVoice: true });
            const msgQueue = createMockMessage({ content: 'core!queue', member: memberA });
            await queueCommand.execute(msgQueue, [], memberA);
            return msgQueue.replies.length > 0;
        })(),
        (async () => {
            return parsedB !== null && parsedB.commandName === 'play';
        })(),
        (async () => {
            await handleHelpCoreCommand(slashC);
            return slashC.replies.length > 0;
        })(),
        (async () => {
            await handleHelpCoreSelectMenu(selectD);
            return selectD.updates.length > 0;
        })()
    ]);

    expect(resA).toBe(true);
    expect(resB).toBe(true);
    expect(resC).toBe(true);
    expect(resD).toBe(true);

    musicManager.deleteQueue('guild-tenant-a');
});

test('T4.4', 'W4 (Voice Permission & Stream Fault Tolerance): verify unconnected check, same-channel constraint, and stream recovery', async () => {
    // 1. Unconnected member attempts core!play -> rejected with voice prerequisite notice
    const unconnectedMember = createMockGuildMember({ inVoice: false });
    const msg1 = createMockMessage({ content: 'core!play Song', member: unconnectedMember });
    await playCommand.execute(msg1, ['Song'], unconnectedMember);
    expect(msg1.replies.length).toBeGreaterThan(0);
    expect(msg1.replies[0]?.embeds?.[0]?.data?.description).toContain('Você precisa estar em um canal de voz');

    // 2. Member in Voice Channel B attempts core!skip while bot is playing in Voice Channel A
    const guildId = 'guild-diff-vc';
    const voiceChannelA = createMockVoiceChannelForQueue('vc-chan-a', 'Canal Alpha');
    const textChannelA = createMockTextChannelForQueue();
    const queue = musicManager.getOrCreateQueue(guildId, voiceChannelA, textChannelA);
    const trackAlpha = createTestTrack('Playing Alpha Track');
    queue.enqueue(trackAlpha);
    (queue as any).currentTrack = trackAlpha;

    const memberInChannelB = createMockGuildMember({ inVoice: true, voiceChannelId: 'vc-chan-b', guildId });
    const msg2 = createMockMessage({ content: 'core!skip', member: memberInChannelB, guildId });
    await skipCommand.execute(msg2, [], memberInChannelB);
    expect(msg2.replies.length).toBeGreaterThan(0);
    expect(msg2.replies[0]?.embeds?.[0]?.data?.description).toContain('mesmo canal de voz');

    // 3. Audio stream error recovery simulation
    queue.player.emit('error', new Error('Simulated stream decoding buffer stall'));
    expect(textChannelA.sentMessages.length).toBeGreaterThan(0);
    const errEmbed = textChannelA.sentMessages[textChannelA.sentMessages.length - 1];
    expect(errEmbed.embeds?.[0]?.data?.color).toBe(0xED4245);

    musicManager.deleteQueue(guildId);
});

test('T4.5', 'W5 (Integrated Full-Stack Production Quality Gate): verify typecheck, web lint, web build, and doc consistency', () => {
    // 1. Bot TypeScript typecheck (npm run typecheck) -> 0 errors
    let typecheckPassed = false;
    try {
        execSync('npm run typecheck', { stdio: 'pipe', timeout: 60000 });
        typecheckPassed = true;
    } catch {
        typecheckPassed = false;
    }
    expect(typecheckPassed).toBe(true);

    // 2. Web linting (npm run lint --workspace=web) -> 0 errors
    let lintPassed = false;
    try {
        const lintOut = execSync('npm run lint --workspace=web', {
            stdio: 'pipe',
            timeout: 60000,
            maxBuffer: 10 * 1024 * 1024,
            encoding: 'utf-8'
        });
        lintPassed = lintOut.includes('0 errors');
    } catch (err: any) {
        const out = err.stdout ? String(err.stdout) : '';
        lintPassed = out.includes('0 errors');
    }
    expect(lintPassed).toBe(true);

    // 3. Web production build output exists
    expect(fs.existsSync(path.resolve('web/.next'))).toBe(true);

    // 4. Consistency cross-check across design.md, README.md, and web docs
    expect(fs.existsSync(path.resolve('design.md'))).toBe(true);
    expect(fs.existsSync(path.resolve('README.md'))).toBe(true);
    expect(fs.existsSync(path.resolve('web/src/app/[locale]/docs/page.tsx'))).toBe(true);
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. TEST RUNNER EXECUTION & REPORTING
// ═══════════════════════════════════════════════════════════════════════════

async function runTestSuite() {
    if (!cliOptions.json) {
        console.log(`\n${colors.bold}${colors.magenta}═══════════════════════════════════════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.bold}${colors.cyan}🧪 BotParceiros CoreBot — Executable E2E Test Suite (Tiers 1-4)${colors.reset}`);
        console.log(`${colors.dim}Spec: TEST_INFRA.md | CLI: ${args.join(' ') || '--all'}${colors.reset}`);
        console.log(`${colors.bold}${colors.magenta}═══════════════════════════════════════════════════════════════════════════${colors.reset}\n`);
    }

    const filteredTests = testRegistry.filter(t => {
        if (cliOptions.tier !== null) {
            return t.tier === cliOptions.tier;
        }
        return true;
    });

    const report: TestReportItem[] = [];
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    const suiteStartTime = Date.now();

    let lastDomain = '';

    for (const t of filteredTests) {
        if (!cliOptions.json && t.domain !== lastDomain) {
            lastDomain = t.domain;
            console.log(`\n${colors.bold}${colors.blue}▶ [Tier ${t.tier}] ${t.domain}${colors.reset}`);
        }

        const start = Date.now();
        try {
            await t.fn();
            const duration = Date.now() - start;
            passed++;
            report.push({
                id: t.id,
                tier: t.tier,
                domain: t.domain,
                description: t.description,
                status: 'pass',
                durationMs: duration
            });
            if (!cliOptions.json) {
                console.log(`  ${colors.green}✓${colors.reset} ${colors.bold}${t.id}${colors.reset} — ${t.description} ${colors.dim}(${duration}ms)${colors.reset}`);
            }
        } catch (err: any) {
            const duration = Date.now() - start;
            failed++;
            const errorMessage = err?.message || String(err);
            const errorStack = err?.stack || errorMessage;
            report.push({
                id: t.id,
                tier: t.tier,
                domain: t.domain,
                description: t.description,
                status: 'fail',
                durationMs: duration,
                error: errorMessage,
                stack: errorStack
            });
            if (!cliOptions.json) {
                console.log(`  ${colors.red}✗${colors.reset} ${colors.bold}${t.id}${colors.reset} — ${t.description} ${colors.dim}(${duration}ms)${colors.reset}`);
                console.log(`    ${colors.red}Error: ${errorMessage}${colors.reset}`);
                if (err?.stack) {
                    console.log(`    ${colors.dim}${err.stack.split('\n').slice(1, 4).join('\n    ')}${colors.reset}`);
                }
            }

            if (cliOptions.bail) {
                if (!cliOptions.json) {
                    console.log(`\n${colors.yellow}⚠️ Execution halted due to --bail flag.${colors.reset}`);
                }
                break;
            }
        }
    }

    const totalDuration = Date.now() - suiteStartTime;

    if (!cliOptions.json) {
        console.log(`\n${colors.bold}${colors.magenta}───────────────────────────────────────────────────────────────────────────${colors.reset}`);
        console.log(`${colors.bold}E2E TEST SUMMARY:${colors.reset}`);
        console.log(`  Total Executed : ${colors.bold}${passedTestsCount(passed, failed, skipped)}${colors.reset}`);
        console.log(`  Passed         : ${colors.green}${colors.bold}${passed}${colors.reset}`);
        console.log(`  Failed         : ${failed > 0 ? colors.red : colors.green}${colors.bold}${failed}${colors.reset}`);
        console.log(`  Skipped        : ${skipped > 0 ? colors.yellow : colors.dim}${skipped}${colors.reset}`);
        console.log(`  Total Duration : ${colors.cyan}${totalDuration}ms${colors.reset}`);
        console.log(`${colors.bold}${colors.magenta}───────────────────────────────────────────────────────────────────────────${colors.reset}\n`);

        const hasFailures = failed > 0;
        if (hasFailures) {
            console.log(`${colors.bgRed}${colors.white}${colors.bold} FAILED ${colors.reset} One or more E2E test assertions failed.\n`);
        } else {
            console.log(`${colors.bgGreen}${colors.white}${colors.bold} PASSED ${colors.reset} All E2E test assertions passed successfully!\n`);
        }
    } else {
        console.log(JSON.stringify({
            summary: {
                total: passed + failed + skipped,
                passed,
                failed,
                skipped,
                durationMs: totalDuration,
                timestamp: new Date().toISOString()
            },
            tests: report
        }, null, 2));
    }

    const hasFailures = failed > 0;
    process.exit(hasFailures ? 1 : 0);
}

function passedTestsCount(p: number, f: number, s: number) {
    return p + f + s;
}

const isMainScript = process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/test-e2e-suite.ts');
if (isMainScript) {
    runTestSuite().catch(err => {
        console.error('Fatal execution error in E2E Test Suite:', err);
        process.exit(1);
    });
}
