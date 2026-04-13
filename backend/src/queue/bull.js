import Queue from "bull";
import config from "../config/environment.js";
import { registerCommitProcessor } from "./processors/commit-processor.js";
import TweetProcessor from "./processors/tweet-processor.js";

const redisConfig = {
    url: config.REDIS_URL
}

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

registerCommitProcessor(commitProcessingQueue);

tweetGenerationQueue.process("tweet-generation", 5, async (job) => {
    return await TweetProcessor.processJob(job);
});

// Event handlers
const attachQueueEvents = (queue, name) => {
    queue.on('ready', () => console.log(`${name} queue ready`));

    queue.on('completed', (job) => {
        console.log(`${name} job completed`, { jobId: job.id });
    });

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