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
            await redisClient.setex(cacheKey, ttlSeconds, Date.now().toString());
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
            await redisClient.setex(key, ttlSeconds, Date.now().toString());
            console.log(`[Dedup] 📝 Marked delivery as processed: ${deliveryId}`);
        } catch (error) {
            console.error(
                `[Dedup] Error marking delivery: ${error.message}`
            );
        }
    }
}

export default DedupService;