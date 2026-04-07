import { redisClient } from "../config/redis.js";
import Commit from "../db/models/Commit.js";

class DedupService {
    /**
     * Check if commit SHA has been seen before
     * Multi-layer: Redis + MongoDB
     */
    async checkDuplicate(commitSha) {
        try {
            const cacheKey = `webhook:commit:${commitSha}`;
            const cached = await redisClient.get(cacheKey);

            if (cached) {
                console.log(`[Dedup] Duplicate found in cache: ${commitSha}`);
                return true;
            }

            const existing = await Commit.findOne({ githubSha: commitSha });

            if (existing) {
                await this.markAsSeen(commitSha);
                console.log(`[Dedup] Duplicate found in DB: ${commitSha}`);
                return true;
            }

            console.log(`[Dedup] New commit: ${commitSha}`);
            return false;
        } catch (error) {
            console.error(`[Dedup] Error checking duplicate: ${error.message}`);
            return false;
        }
    }

    /**
     * Mark commit SHA as seen
     * Stores in Redis with TTL (7d)
     */
    async markAsSeen(commitSha, ttlSeconds = 604800) {
        try {
            const cacheKey = `webhook:commit:${commitSha}`;
            await redisClient.set(cacheKey, Date.now().toString(), {
                EX: ttlSeconds
            });
            console.log(`[Dedup] Marked as seen: ${commitSha}`);
        } catch (error) {
            console.error(`[Dedup] Error marking as seen: ${error.message}`);
        }
    }

    /**
     * Check if delivery ID was already processed
     * Prevents processing same delivery twice
     */
    async checkDeliveryId(deliveryId) {
        try {
            const key = `webhook:delivery:${deliveryId}`;
            const exists = await redisClient.get(key);
            return !!exists;
        } catch (error) {
            console.error(`[Dedup] Error checking delivery: ${error.message}`);
            return false;
        }
    }

    /**
     * Mark delivery as processed
     * Stored in Redis with 24h TTL
     */

    async markDeliveryAsProcessed(deliveryId, ttlSeconds = 86400) {
        try {
            const key = `webhook:delivery:${deliveryId}`;
            await redisClient.set(key, Date.now().toString(), {
                EX: ttlSeconds
            });
            console.log(`[Dedup] Marked delivery as processed: ${deliveryId}`);
        } catch (error) {
            console.error(
                `[Dedup] Error marking delivery: ${error.message}`
            );
        }
    }

    /**
     * Clear all dedup cache for a user
     */
    async clearUserCache(userId) {
        try {
            const pattern = `webhook:commit:*`;
            const keys = await redisClient.keys(pattern);

            if (keys.length === 0) return 0;

            let deleted = 0;
            for (const key of keys) {
                const result = await redisClient.del(key);
                if (result) deleted++;
            }

            console.log(`[Dedup] Cleared ${deleted} cache entries for user ${userId}`);
            return deleted;
        } catch (error) {
            console.error(`[Dedup] Error clearing user cache: ${error.message}`);
            return 0;
        }
    }
}

export default new DedupService();