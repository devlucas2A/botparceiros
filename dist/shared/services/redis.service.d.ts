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
declare class RedisService {
    client: RedisClientLike | null;
    isConnected: boolean;
    constructor();
    private initialize;
    /**
     * Tenta obter o cliente se estiver conectado.
     */
    getClient(): RedisClientLike | null;
}
export declare const redisService: RedisService;
export {};
//# sourceMappingURL=redis.service.d.ts.map