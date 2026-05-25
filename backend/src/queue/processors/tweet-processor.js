import User from "../../db/models/User.js";
import BatchTweetGeneratorService from "../../services/tweet-generation/batch-tweet-generator.service.js";
import AppError from "../../errors/AppError.js";

class TweetProcessor {
    async processJob(job) {
        const startTime = Date.now();
        try {
            const {
                userId,
                triggerType = 'manual',
                commitIds = null,
                repositoryId = null,
                commitShas = [],
                deliveryId = null,
            } = job.data;

            console.log('[TweetProcessor] Job started', {
                jobId: job.id,
                userId,
                triggerType,
                attempt: job.attemptsMade,
            });

            await job.progress(10);

            // Validate user
            const user = await User.findById(userId).lean();

            if (!user) {
                throw new AppError(
                    'User not found',
                    404,
                    'USER_NOT_FOUND'
                );
            }

            await job.progress(25);

            let result;

            // Route based on trigger
            if (triggerType === 'daily') {
                result = await BatchTweetGeneratorService.generateDailyTweets(userId);
            } else if (triggerType === 'manual') {
                result = await BatchTweetGeneratorService.generateOnDemandTweet(userId, commitIds);
            } else if (triggerType === 'auto_push') {
                result = await BatchTweetGeneratorService.generateAutoPushTweet(
                    userId,
                    repositoryId,
                    commitShas,
                    deliveryId
                );
            } else {
                throw new AppError(
                    `Invalid trigger type: ${triggerType}`,
                    400,
                    'INVALID_TRIGGER_TYPE'
                );
            }

            await job.progress(70);

            // Handle result states
            if (result.status === 'success') {
                await job.progress(100);

                console.log('[TweetProcessor] Job completed', {
                    jobId: job.id,
                    userId,
                    tweetId: result.tweetId,
                    commitCount: result.commitCount,
                    duration: Date.now() - startTime,
                });

                return {
                    status: 'completed',
                    tweetId: result.tweetId,
                    commitCount: result.commitCount,
                };
            }

            if (result.status === 'no_commits') {
                console.log('[TweetProcessor] Skipped - no commits', {
                    jobId: job.id,
                    userId,
                });

                return {
                    status: 'skipped',
                    reason: 'no_commits',
                };
            }

            if (result.status === 'skipped') {
                console.log('[TweetProcessor] Job skipped', {
                    jobId: job.id,
                    userId,
                    reason: result.reason || 'No eligible commits',
                    triggerType,
                    duration: Date.now() - startTime,
                });

                return {
                    status: 'skipped',
                    reason: result.reason || 'No eligible commits',
                };
            }

            if (result.status === 'generation_failed') {
                console.warn('[TweetProcessor] AI generation failed', {
                    jobId: job.id,
                    userId,
                    commitCount: result.commitCount,
                });

                throw new AppError(
                    'AI tweet generation failed',
                    500,
                    'AI_GENERATION_FAILED'
                );
            }

            throw new AppError(
                `Unknown result status: ${result.status}`,
                500,
                'UNKNOWN_RESULT_STATUS'
            );
        } catch (error) {
            const isAppError = error instanceof AppError;

            console.error('[TweetProcessor] Job failed', {
                jobId: job.id,
                userId: job.data.userId,
                error: error.message,
                attempt: job.attemptsMade,
                duration: Date.now() - startTime,
            });

            // Retry Strategy Control
            if (isAppError) {
                // Do NOT retry for client errors
                if (error.statusCode >= 400 && error.statusCode < 500) {
                    throw new Error('SKIP_RETRY');
                }
            }

            // Retry for server errors
            throw error;
        }
    }
}

export default new TweetProcessor();