import { redisClient } from "../config/redis.js";

class RepositorySyncLockService {
    async acquireLock(userId) {
        const key = `repo-sync-lock:${userId}`;
        return await redisClient.set(
            key,
            Date.now(),
            {
                NX: true,
                EX: 60,
            }
        );
    }

    async releaseLock(userId) {
        await redisClient.del(
            `repo-sync-lock:${userId}`
        );
    }
}

export default new RepositorySyncLockService();