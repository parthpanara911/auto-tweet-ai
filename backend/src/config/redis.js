/** Initialize Redis client and Bull queue
 * Central point for all Redis operations
 * Configures queue settings for async commit processing
**/
import { createClient } from "redis";
import { Queue } from "bull";
import AppError from "../errors/AppError.js";
import config from "../config/environment.js";

const redisClient = createClient({
    url: config.REDIS_URL,
    retryStrategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
            return new AppError('Redis connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
            return new AppError('Redis retry time exhausted');
        }
        if (options.attempt > 10) {
            return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
    }
});

redisClient.on('connect', () => {
    console.log("Redis connected");
});
redisClient.on('error', (error) => {
    console.error("Redis error:", error.message);
});
redisClient.on('reconnecting', (error) => {
    console.error("Redis reconnecting...");
});

const commitProcessingQueue = new Queue('commit-processing', {
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

commitProcessingQueue.process(5, async (job) => {
});

commitProcessingQueue.on('completed', (job, result) => {
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

commitProcessingQueue.on('ready', () => {
    console.log('Bull queue ready');
});

export { redisClient, commitProcessingQueue };