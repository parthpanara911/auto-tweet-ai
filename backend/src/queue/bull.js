import Queue from "bull";
import config from "../config/environment.js";

const redisUrl = new URL(config.REDIS_URL);

const redisConfig = {
    host: redisUrl.hostname,
    port: Number(redisUrl.port),
    password: redisUrl.password,
    tls: {}
};

// Queues
const commitProcessingQueue = new Queue('commit-processing', {
    redis: redisConfig,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 1000
        },
        timeout: 30000,
        removeOnComplete: {
            age: 3600,
            count: 500
        },
        removeOnFail: 100
    }
});

const tweetGenerationQueue = new Queue('tweet-generation', {
    redis: redisConfig,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 1000
        },
        timeout: 30000,
        removeOnComplete: {
            age: 3600,
            count: 500
        },
        removeOnFail: 100
    }
});

// Event handlers
const attachQueueEvents = (queue, name) => {
    queue.on('ready', () => console.log(`${name} queue ready`));

    queue.on('failed', (job, err) => {
        console.error(`${name} job failed`, {
            jobId: job.id,
            error: err.message,
            attempts: job.attemptsMade
        });
    });

    queue.on('error', (err) => {
        console.error(`${name} queue error`, {
            error: err.message
        });
    });
};

attachQueueEvents(commitProcessingQueue, "CommitProcessing");
attachQueueEvents(tweetGenerationQueue, "TweetGeneration");

const initializeQueues = async () => {
    try {
        await Promise.all([
            commitProcessingQueue.isReady(),
            tweetGenerationQueue.isReady()
        ]);

        console.log("All Bull queues initialized");
    } catch (error) {
        console.error("Queue initialization failed", {
            error: error.message
        });
        throw error;
    }
};

export { commitProcessingQueue, tweetGenerationQueue, initializeQueues };