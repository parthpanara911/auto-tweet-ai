import config from "../../config/environment.js";
import CommitProcessor from "./commit-processor.js";

export const registerCommitProcessor = (queue) => {
    queue.process(
        "commit-processing",
        config.COMMIT_QUEUE_CONCURRENCY,
        async (job) => {
            return await CommitProcessor.processJob(job);
        }
    );
};