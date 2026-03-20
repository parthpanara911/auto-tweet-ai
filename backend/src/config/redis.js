/** Initialize Redis client and Bull queue
 * Central point for all Redis operations
 * Configures queue settings for async commit processing
**/
import { createClient } from "redis";
import Queue from "bull";
import config from "../config/environment.js";

let redisClient;
let commitProcessingQueue;

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

const initQueue = () => {
    commitProcessingQueue = new Queue('commit-processing', {
        redis: {
            url: config.REDIS_URL
        },
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000
            },
            timeout: 30000,
            removeOnComplete: {
                age: 3600
            },
            removeOnFail: false
        }
    });

    commitProcessingQueue.on('ready', () => {
        console.log('Bull queue ready');
    });

    commitProcessingQueue.on('completed', (job) => {
        console.log(`Job ${job.id} completed`);
    });

    commitProcessingQueue.on('failed', (job, err) => {
        console.log(`Job ${job.id} failed: ${err.message}`);
    });

    commitProcessingQueue.on('error', (error) => {
        console.log(`Queue error: ${error.message}`);
    });

    commitProcessingQueue.on('stalled', (job) => {
        console.log(`Job ${job.id} stalled`);
    });

    commitProcessingQueue.on('waiting', (jobId) => {
        console.log(`Job ${jobId} waiting in queue`);
    });

    return commitProcessingQueue;
};

const registerProcessors = () => {
    if (!commitProcessingQueue) {
        throw new Error("Queue not initialized");
    }

    commitProcessingQueue.process(5, async (job) => {
        console.log("Processing job:", job.data);
    });
};

export { initRedis, initQueue, registerProcessors, redisClient, commitProcessingQueue };