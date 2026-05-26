import { redisClient } from "../config/redis.js";

class RateLimitService {
    // Get current rate limit status for user
    async getRateLimitStatus(userId) {
        try {
            const key = `rate-limit:${userId}`;
            const cached = await redisClient.get(key);

            if (!cached) {
                return null;
            }
            return JSON.parse(cached);
        } catch (error) {
            console.error(`[Ratelimit] Error getting status: ${error.message}`);
            return null;
        }
    }

    /** 
     * Update rate limit from GitHub response headers
     * Called after every GitHub API call
     */
    async updateRateLimitFromHeaders(userId, headers) {
        try {
            const remaining = parseInt(headers['x-ratelimit-remaining'] || '0', 10);
            const limit = parseInt(headers['x-ratelimit-limit'] || '5000', 10);
            const reset = parseInt(headers['x-ratelimit-reset'] || Date.now() / 1000, 10);

            if (process.env.NODE_ENV !== "production") {
                console.log(`[Ratelimit] ${remaining}/${limit} remaining (user: ${userId})`);
            }

            const status = {
                remaining,
                limit,
                reset,
                updatedAt: new Date().toISOString()
            };

            const key = `rate-limit:${userId}`;
            const now = Math.floor(Date.now() / 1000);
            const ttl = Math.max(reset - now, 1);

            await redisClient.set(key, JSON.stringify(status), {
                EX: ttl
            });

            if (remaining < Math.max(100, limit * 0.05)) {
                console.warn(`[Ratelimit] Low remaining: ${remaining}/${limit} for user ${userId}, resets at ${new Date(reset * 1000)}`);
            }
            return status;
        } catch (error) {
            console.error(`[Ratelimit] Error updating status: ${error.message}`);
            // Don't throw - continue processing
            return null;
        }
    }

    /**
     * Check if user can make API request
     * Returns true if enough quota available
     */
    async checkCanMakeRequest(userId, requestsNeeded = 1) {
        try {
            const status = await this.getRateLimitStatus(userId);
            if (!status) {
                console.log(`[Ratelimit] No status cached, allowing request: ${userId}`);
                return true;
            }

            if (status.remaining <= 0) {
                console.warn(`[Ratelimit] Cached remaining is 0, but may be stale. Allowing request.`);
                return true;
            }
        } catch (error) {
            console.error(`[Ratelimit] Error checking quota: ${error.message}`);
            // Fail open - allow request
            return true;
        }
    }

    /**
     * Wait for rate limit to reset
     * Returns promise that resolves when rate limit resets
     */
    async waitForRateLimitReset(userId) {
        try {
            const status = await this.getRateLimitStatus(userId);
            if (!status) {
                console.warn(`[Ratelimit] No rate limit status cached`);
                return;
            }

            const now = Math.floor(Date.now() / 1000);
            const waitSeconds = Math.max(status.reset - now, 0);

            if (waitSeconds > 0) {
                console.log(
                    `[Ratelimit] Waiting ${waitSeconds}s for reset (until ${new Date(status.reset * 1000)})`
                );

                return new Promise((resolve) => {
                    setTimeout(() => {
                        console.log(`[Ratelimit] Rate limit reset, resuming: ${userId}`);
                        resolve();
                    }, waitSeconds * 1000);
                });
            }
            return Promise.resolve();
        } catch (error) {
            console.error(`[Ratelimit] Error waiting for reset: ${error.message}`);
        }
    }

    /**
     * Clear rate limit cache for user
     */
    async clearUserCache(userId) {
        try {
            const key = `rate-limit:${userId}`;
            const result = await redisClient.del(key);
            if (result) {
                console.log(`[RateLimit] Cleared cache for user ${userId}`);
            }
            return result;
        } catch (error) {
            console.error(`[RateLimit] Error clearing cache: ${error.message}`);
            return false;
        }
    }
}

export default new RateLimitService();