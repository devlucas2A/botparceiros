import { Redis } from 'ioredis';
import { config } from './config.service';
import { logger } from './logger.service';

export interface RedisClientLike {
    get(key: string): Promise<string | null>;
    set(key: string, value: string | number): Promise<string | null>;
    set(key: string, value: string | number, mode: 'EX', seconds: number): Promise<string | null>;
    del(...keys: string[]): Promise<number>;
    incr(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    sadd(key: string, ...members: string[]): Promise<number>;
    smembers(key: string): Promise<string[]>;
    ping(): Promise<string>;
}

const UPSTASH_TIMEOUT_MS = 5000;

class UpstashRestClient implements RedisClientLike {
    private readonly baseUrl: string;
    private readonly token: string;

    constructor(baseUrl: string, token: string) {
        this.baseUrl = baseUrl.replace(/\/+$/, '');
        this.token = token;
    }

    private async command<T = unknown>(args: Array<string | number>): Promise<T> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), UPSTASH_TIMEOUT_MS);

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(args),
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`Upstash REST HTTP ${response.status}`);
            }

            const data = (await response.json()) as { result?: T; error?: string };
            if (data.error) {
                throw new Error(`Upstash REST error: ${data.error}`);
            }

            return data.result as T;
        } finally {
            clearTimeout(timeout);
        }
    }

    async get(key: string): Promise<string | null> {
        const res = await this.command<string | null>(['GET', key]);
        return res ?? null;
    }

    async set(
        key: string,
        value: string | number,
        mode?: 'EX',
        seconds?: number
    ): Promise<string | null> {
        if (mode === 'EX' && typeof seconds === 'number') {
            return await this.command<string | null>(['SET', key, String(value), 'EX', seconds]);
        }
        return await this.command<string | null>(['SET', key, String(value)]);
    }

    async del(...keys: string[]): Promise<number> {
        if (keys.length === 0) return 0;
        return await this.command<number>(['DEL', ...keys]);
    }

    async incr(key: string): Promise<number> {
        return await this.command<number>(['INCR', key]);
    }

    async expire(key: string, seconds: number): Promise<number> {
        return await this.command<number>(['EXPIRE', key, seconds]);
    }

    async sadd(key: string, ...members: string[]): Promise<number> {
        if (members.length === 0) return 0;
        return await this.command<number>(['SADD', key, ...members]);
    }

    async smembers(key: string): Promise<string[]> {
        const res = await this.command<string[] | null>(['SMEMBERS', key]);
        return Array.isArray(res) ? res : [];
    }

    async ping(): Promise<string> {
        return await this.command<string>(['PING']);
    }
}

class RedisService {
    public client: RedisClientLike | null = null;
    public isConnected: boolean = false;

    constructor() {
        this.initialize();
    }

    private initialize() {
        const redisConfig = config.getRedisConfig();

        if (redisConfig.restUrl && redisConfig.restToken) {
            this.client = new UpstashRestClient(redisConfig.restUrl, redisConfig.restToken);
            this.isConnected = true;
            logger.info('🚀 Upstash Redis REST configurado com sucesso');
            return;
        }

        if (!redisConfig.url) {
            logger.warn('⚠️ REDIS_URL/UPSTASH não configurados. Operando em modo de Fallback (Apenas PostgreSQL)');
            return;
        }

        try {
            const tcpClient = new Redis(redisConfig.url, {
                maxRetriesPerRequest: 3,
                retryStrategy: (times) => Math.min(times * 50, 2000),
            });

            tcpClient.on('connect', () => {
                logger.info('🚀 Conexão com Redis (TCP) estabelecida com sucesso');
                this.isConnected = true;
            });

            tcpClient.on('error', (err) => {
                logger.warn('⚠️ Erro de conexão com Redis (Fallback acionado para PostgreSQL):', { error: err.message });
                this.isConnected = false;
            });

            this.client = tcpClient;
        } catch (error: any) {
            logger.error('❌ Falha ao inicializar Redis:', { error: error.message });
            this.isConnected = false;
        }
    }

    /**
     * Tenta obter o cliente se estiver conectado.
     */
    public getClient(): RedisClientLike | null {
        return this.isConnected ? this.client : null;
    }
}

export const redisService = new RedisService();
