import connectDB from "./db/connection.js";
import { initRedis } from "./config/redis.js";
import { initializeQueues, commitProcessingQueue, tweetGenerationQueue } from "./queue/bull.js";
import { registerCommitProcessor } from "./queue/processors/register-commit-processor.js";
import { registerTweetProcessor } from "./queue/processors/register-tweet-processor.js";
import TweetProcessor from "./queue/processors/tweet-processor.js";

const startWorker = async () => {
    console.log("Starting worker...");
    try {
        await connectDB();

        await initRedis();

        await initializeQueues();

        registerCommitProcessor(commitProcessingQueue);
        registerTweetProcessor(tweetGenerationQueue);

        console.log("Commit processor registered");
        console.log("Tweet processor registered");
        console.log("Worker started successfully");
    } catch (error) {
        console.error("Worker startup failed:", error);
        process.exit(1);
    }
};

startWorker();