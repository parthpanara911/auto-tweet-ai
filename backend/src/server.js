import config from "./config/environment.js";
import app from "./app.js";
import connectDB from "./db/connection.js";
import { initRedis, initQueue, registerProcessors } from "./config/redis.js";

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
            registerProcessors();

            // await queue.add({ msg: "queue test" });

            const pendingJobs = await queue.count();
            console.log(`Bull queue initialized (${pendingJobs} pending jobs)`);
        } catch (redisError) {
            console.error("Redis unavailable:", redisError.message);
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