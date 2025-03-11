import Redis from "ioredis";
import { type IDatabaseCacheAdapter, type UUID, elizaLogger } from "@elizaos/core";

export class RedisClient implements IDatabaseCacheAdapter {
    private client: Redis;

    constructor(redisUrl: string) {
        this.client = new Redis(redisUrl);

        this.client.on("connect", () => {
            elizaLogger.success("Connected to Redis");
        });

        this.client.on("error", (err) => {
            elizaLogger.error("Redis error:", err);
        });
    }

    async getCache(params: {
        agentId: UUID;
        key: string;
    }): Promise<string | undefined> {
        try {
            const redisKey = this.buildKey(params.agentId, params.key);
            const value = await this.client.get(redisKey);
            return value || undefined;
        } catch (err) {
            elizaLogger.error("Error getting cache:", err);
            return undefined;
        }
    }

    async setCache(params: {
        agentId: UUID;
        key: string;
        value: string;
    }): Promise<boolean> {
        try {
            const redisKey = this.buildKey(params.agentId, params.key);
            await this.client.set(redisKey, params.value);
            return true;
        } catch (err) {
            elizaLogger.error("Error setting cache:", err);
            return false;
        }
    }

    async deleteCache(params: {
        agentId: UUID;
        key: string;
    }): Promise<boolean> {
        try {
            const redisKey = this.buildKey(params.agentId, params.key);
            const result = await this.client.del(redisKey);
            return result > 0;
        } catch (err) {
            elizaLogger.error("Error deleting cache:", err);
            return false;
        }
    }

    async hget(params: {
        agentId: string;
        key: string;
        field: string;
    }): Promise<string | undefined> {
        try {
            const redisKey = this.buildKey(params.agentId, params.key);
            const value = await this.client.hget(redisKey, params.field);
            return value || undefined;
        } catch (err) {
            elizaLogger.error("Error getting hash field:", err);
            return undefined;
        }
    }

    async hset(params: {
        agentId: string;
        key: string;
        field: string;
        value: string;
    }): Promise<boolean> {
        try {
            const redisKey = this.buildKey(params.agentId, params.key);
            await this.client.hset(redisKey, params.field, params.value);
            return true;
        } catch (err) {
            elizaLogger.error("Error setting hash field:", err);
            return false;
        }
    }

    async expire(params: {
        agentId: string;
        key: string;
        seconds: number;
    }): Promise<boolean> {
        try {
            const redisKey = this.buildKey(params.agentId, params.key);
            const result = await this.client.expire(redisKey, params.seconds);
            return result === 1;
        } catch (err) {
            elizaLogger.error("Error setting expiration:", err);
            return false;
        }
    }
    async disconnect(): Promise<void> {
        try {
            await this.client.quit();
            elizaLogger.success("Disconnected from Redis");
        } catch (err) {
            elizaLogger.error("Error disconnecting from Redis:", err);
        }
    }

    private buildKey(agentId: string, key: string): string {
        return `${agentId}:${key}`; // Constructs a unique key based on agentId and key
    }
    async publish(params: {
        channel: string;
        message: string;
    }): Promise<void> {
        try {
            await this.client.publish(params.channel, params.message);
            elizaLogger.success(`Message published to channel ${params.channel}`);
        } catch (err) {
            elizaLogger.error("Error publishing message:", err);
        }
    }

    async subscribe(params: {
        channel: string;
        onMessage: (channel: string, message: string) => void;
    }): Promise<void> {
        try {
            await this.client.subscribe(params.channel);
            this.client.on("message", params.onMessage);
            elizaLogger.success(`Subscribed to channel ${params.channel}`);
        } catch (err) {
            elizaLogger.error("Error subscribing to channel:", err);
        }
    }

    async unsubscribe(params: {
        channel: string;
    }): Promise<void> {
        try {
            await this.client.unsubscribe(params.channel);
            elizaLogger.success(`Unsubscribed from channel ${params.channel}`);
        } catch (err) {
            elizaLogger.error("Error unsubscribing from channel:", err);
        }
    }
    async psubscribe(params: {
        pattern: string;
        onMessage: (pattern: string, channel: string, message: string) => void;
    }): Promise<void> {
        try {
            await this.client.psubscribe(params.pattern);
            this.client.on("pmessage", params.onMessage);
            elizaLogger.success(`Pattern subscribed to ${params.pattern}`);
        } catch (err) {
            elizaLogger.error("Error pattern subscribing:", err);
        }
    }

    async punsubscribe(params: {
        pattern: string;
    }): Promise<void> {
        try {
            await this.client.punsubscribe(params.pattern);
            elizaLogger.success(`Pattern unsubscribed from ${params.pattern}`);
        } catch (err) {
            elizaLogger.error("Error pattern unsubscribing:", err);
        }
    }
}

export default RedisClient;
