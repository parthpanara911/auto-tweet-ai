import { createClient } from "redis";
import config from "../config/environment.js";

let redisClient;

const initRedis = async () => {
    redisClient = createClient({
        url: config.REDIS_URL,
        socket: {
            reconnectStrategy: (retries) => {
                if (retries > 5) {
                    return new Error("Redis max retries reached");
                }
                return retries * 500;
            }
        }
    });

    redisClient.on('connect', () => {
        console.log("Redis connected");
    });

    redisClient.on('error', (error) => {
        console.error("Redis error:", error.message);
    });

    redisClient.on('reconnecting', () => {
        console.error("Redis reconnecting...");
    });

    await redisClient.connect();

    return redisClient;
};

export { initRedis, redisClient };