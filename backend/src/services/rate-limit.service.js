import { redisClient } from "../config/redis.js";
import AppError from "../errors/AppError.js";

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

            const status = {
                remaining,
                limit,
                reset,
                updatedAt: new Date()
            };

            const key = `rate-limit:${userId}`;
            const ttl = Math.max(reset - Math.floor(Date.now() / 1000), 3600);

            await redisClient.set(key, JSON.stringify(status), {
                EX: ttl
            });

            if (remaining < Math.max(100, limit * 0.05)) {
                console.warn(`[Ratelimit] Low remaining: ${remaining}/${limit} for user ${userId}`);
            }
            return status;
        } catch (error) {
            console.error(`[Ratelimit] Error updating status: ${error.message}`);
        }
    }

    /**
     * Check if user can make API request
     * Returns true if enough remaining quota
     */
    async checkCanMakeRequest(userId, requestsNeeded = 1) {
        try {
            const status = await this.getRateLimitStatus(userId);
            if (!status) {
                console.log(`[Ratelimit] No status cached, allowing request: ${userId}`);
                return true;
            }

            const canMake = status.remaining >= requestsNeeded;
            if (!canMake) {
                console.warn(`[Ratelimit] Not enough quota for ${userId}: ${status.remaining} remaining, need ${requestsNeeded}`);
            }
            return canMake;
        } catch (error) {
            console.error(`[Ratelimit] Error checking quota: ${error.message}`);
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
                throw new AppError('No rate limit status cached', 404, 'RATE_LIMIT_NOT_FOUND');
            }

            const now = Math.floor(Date.now() / 1000);
            const waitSeconds = Math.max(status.reset - now, 0);

            if (waitSeconds > 0) {
                console.log(`[Ratelimit] Waiting ${waitSeconds}s for reset: ${userId}`);

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
}

export default new RateLimitService();