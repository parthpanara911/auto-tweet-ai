import config from "./config/environment.js";
import app from "./app.js";
import connectDB from "./db/connection.js";
import { initRedis } from "./config/redis.js";
import { initializeQueues, commitProcessingQueue, tweetGenerationQueue } from "./queue/bull.js";
import { setupBullBoard } from "./config/bullBoard.js";

const PORT = config.PORT;

const startServer = async () => {
    console.log("Starting server...");
    try {
        await connectDB();

        let queue;
        try {
            console.log("Connecting Redis...");
            await initRedis();

            console.log("Initializing queue...");
            await initializeQueues();

            setupBullBoard(app, {
                commitQueue: commitProcessingQueue,
                tweetQueue: tweetGenerationQueue,
            });

            const pendingJobs = await commitProcessingQueue.count();
            const activeJobs = await commitProcessingQueue.getActiveCount();
            console.log(`Commit queue initialized (${pendingJobs} pending, ${activeJobs} active)`);
        } catch (redisError) {
            console.error("Redis unavailable:", redisError.message);
            console.warn("Running without queue support");
        }

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();