import { redisClient } from "../config/redis.js";

class RepositorySyncCooldownService {
    async isCoolingDown(userId) {
        const exists = await redisClient.exists(
            `repo-sync-cooldown:${userId}`
        );

        return exists === 1;
    }

    async setCooldown(userId) {
        await redisClient.set(
            `repo-sync-cooldown:${userId}`,
            Date.now(),
            {
                EX: 300,
            }
        );
    }
}

export default new RepositorySyncCooldownService();