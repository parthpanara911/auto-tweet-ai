import { RateLimiterRedis } from "rate-limiter-flexible";
import { redisClient } from "./redis.js";

export const authIpLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: "rl:auth",
    points: 10,
    duration: 10 * 60
});

export const authRefreshLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: "rl:refresh",
    points: 20,
    duration: 60 * 60
});

export const tweetGenerationLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: "rl:tweet-gen",
    points: 5,
    duration: 60 * 60
});

export const mutationLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: "rl:mutate",
    points: 30,
    duration: 60
});

export const generalApiLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: "rl:general",
    points: 100,
    duration: 60
});