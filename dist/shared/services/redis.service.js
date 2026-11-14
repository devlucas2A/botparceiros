"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisService = void 0;
const ioredis_1 = require("ioredis");
const config_service_1 = require("./config.service");
const logger_service_1 = require("./logger.service");
const UPSTASH_TIMEOUT_MS = 5000;
class UpstashRestClient {
    baseUrl;
    token;
    constructor(baseUrl, token) {
        this.baseUrl = baseUrl.replace(/\/+$/, '');
        this.token = token;
    }
    async command(args) {
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
            const data = (await response.json());
            if (data.error) {
                throw new Error(`Upstash REST error: ${data.error}`);
            }
            return data.result;
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async get(key) {
        const res = await this.command(['GET', key]);
        return res ?? null;
    }
    async set(key, value, mode, seconds) {
        if (mode === 'EX' && typeof seconds === 'number') {
            return await this.command(['SET', key, String(value), 'EX', seconds]);
        }
        return await this.command(['SET', key, String(value)]);
    }
    async del(...keys) {
        if (keys.length === 0)
            return 0;
        return await this.command(['DEL', ...keys]);
    }
    async incr(key) {
        return await this.command(['INCR', key]);
    }
    async expire(key, seconds) {
        return await this.command(['EXPIRE', key, seconds]);
    }
    async sadd(key, ...members) {
        if (members.length === 0)
            return 0;
        return await this.command(['SADD', key, ...members]);
    }
    async smembers(key) {
        const res = await this.command(['SMEMBERS', key]);
        return Array.isArray(res) ? res : [];
    }
    async ping() {
        return await this.command(['PING']);
    }
}
class RedisService {
    client = null;
    isConnected = false;
    constructor() {
        this.initialize();
    }
    initialize() {
        const redisConfig = config_service_1.config.getRedisConfig();
        if (redisConfig.restUrl && redisConfig.restToken) {
            this.client = new UpstashRestClient(redisConfig.restUrl, redisConfig.restToken);
            this.isConnected = true;
            logger_service_1.logger.info('🚀 Upstash Redis REST configurado com sucesso');
            return;
        }
        if (!redisConfig.url) {
            logger_service_1.logger.warn('⚠️ REDIS_URL/UPSTASH não configurados. Operando em modo de Fallback (Apenas PostgreSQL)');
            return;
        }
        try {
            const tcpClient = new ioredis_1.Redis(redisConfig.url, {
                maxRetriesPerRequest: 3,
                retryStrategy: (times) => Math.min(times * 50, 2000),
            });
            tcpClient.on('connect', () => {
                logger_service_1.logger.info('🚀 Conexão com Redis (TCP) estabelecida com sucesso');
                this.isConnected = true;
            });
            tcpClient.on('error', (err) => {
                logger_service_1.logger.warn('⚠️ Erro de conexão com Redis (Fallback acionado para PostgreSQL):', { error: err.message });
                this.isConnected = false;
            });
            this.client = tcpClient;
        }
        catch (error) {
            logger_service_1.logger.error('❌ Falha ao inicializar Redis:', { error: error.message });
            this.isConnected = false;
        }
    }
    /**
     * Tenta obter o cliente se estiver conectado.
     */
    getClient() {
        return this.isConnected ? this.client : null;
    }
}
exports.redisService = new RedisService();
//# sourceMappingURL=redis.service.js.map