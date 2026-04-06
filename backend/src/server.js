import config from "./config/environment.js";
import app from "./app.js";
import connectDB from "./db/connection.js";
import { initRedis, initQueue } from "./config/redis.js";
import { setupBullBoard } from "./config/bullBoard.js";
import { setupTestRoutes } from "./routes/test.js";

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
            queue = initQueue();

            const { registerCommitProcessor } = await import("./queue/processors/commit-processor.js");

            registerCommitProcessor(queue);

            setupBullBoard(app, queue);
            setupTestRoutes(app, queue);

            const pendingJobs = await queue.count();
            const activeJobs = await queue.getActiveCount();
            console.log(`Bull queue initialized (${pendingJobs} pending, ${activeJobs} active)`);
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