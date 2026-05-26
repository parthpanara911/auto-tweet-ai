import config from "../../config/environment.js";
import TweetProcessor from "./tweet-processor.js";

export const registerTweetProcessor = (queue) => {
    queue.process(
        "tweet-generation",
        config.TWEET_QUEUE_CONCURRENCY,
        async (job) => {
            return await TweetProcessor.processJob(job);
        }
    );
};