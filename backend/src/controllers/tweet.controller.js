import { commitProcessingQueue } from "../queue/bull.js";
import TweetService from "../services/tweet-generation/tweet.service.js";

class TweetController {
    async getUserTweets(req, res, next) {
        try {
            const userId = req.user._id;
            const { page = 1, limit = 10, status = null } = req.query;

            const result = await TweetService.getUserTweets(userId, {
                page: parseInt(page),
                limit: parseInt(limit),
                status,
            });

            res.json({
                status: 'success',
                data: result.data,
            });
        } catch (error) {
            console.error('[TweetController] Error in getUserTweets', {
                userId: req.user._id,
                error: error.message,
            });
            next(error);
        }
    }

    async getTweetById(req, res, next) {
        try {
            const { tweetId } = req.params;
            const userId = req.user._id;

            const tweet = await TweetService.getTweetById(tweetId, userId);

            res.json({
                status: 'success',
                data: tweet.data,
            });
        } catch (error) {
            console.error('[TweetController] Error in getTweetById', {
                tweetId: req.params.tweetId,
                userId: req.user._id,
                error: error.message,
            });
            next(error);
        }
    }

    async generateTweet(req, res, next) {
        try {
            const userId = req.user._id;
            const { commitIds } = req.body;

            if (commitIds && !Array.isArray(commitIds)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'commitIds must be an array',
                });
            }

            const jobData = {
                userId: userId.toString(),
                triggerType: 'manual',
                commitIds: commitIds || null,
            };

            const job = await commitProcessingQueue.add('tweet-generation', jobData);

            console.log('[TweetController] Tweet generation job queued', {
                userId,
                jobId: job.id,
            });

            res.status(202).json({
                status: 'queued',
                message: 'Tweet generation started',
                jobId: job.id.toString(),
            });
        } catch (error) {
            console.error('[TweetController] Error in generateTweet', {
                userId: req.user._id,
                error: error.message,
            });
            next(error);
        }
    }

    async getDraftTweets(req, res, next) {
        try {
            const userId = req.user._id;

            const result = await TweetService.getDraftTweets(userId);

            res.json({
                status: 'success',
                data: result.data,
            });
        } catch (error) {
            console.error('[TweetController] Error in getDraftTweets', {
                userId: req.user._id,
                error: error.message,
            });
            next(error);
        }
    }

    async approveTweet(req, res, next) {
        try {
            const { tweetId } = req.params;
            const userId = req.user._id;

            const result = await TweetService.approveTweet(tweetId, userId);

            res.json({
                status: 'success',
                message: 'Tweet approved',
                data: result.data,
            });
        } catch (error) {
            console.error('[TweetController] Error in approveTweet', {
                tweetId: req.params.tweetId,
                userId: req.user._id,
                error: error.message,
            });
            next(error);
        }
    }

    async rejectTweet(req, res, next) {
        try {
            const { tweetId } = req.params;
            const userId = req.user._id;

            await TweetService.rejectTweet(tweetId, userId);

            res.json({
                status: 'success',
                message: 'Tweet rejected',
            });
        } catch (error) {
            console.error('[TweetController] Error in rejectTweet', {
                tweetId: req.params.tweetId,
                userId: req.user._id,
                error: error.message,
            });
            next(error);
        }
    }

    async editTweet(req, res, next) {
        try {
            const { tweetId } = req.params;
            const userId = req.user._id;
            const { content } = req.body;

            if (!content || typeof content !== 'string') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Content is required and must be a string',
                });
            }

            const result = await TweetService.editTweet(tweetId, userId, content);

            res.json({
                status: 'success',
                message: 'Tweet updated',
                data: result.data,
            });
        } catch (error) {
            console.error('[TweetController] Error in editTweet', {
                tweetId: req.params.tweetId,
                userId: req.user._id,
                error: error.message,
            });
            next(error);
        }
    }

    async deleteTweet(req, res, next) {
        try {
            const { tweetId } = req.params;
            const userId = req.user._id;

            await TweetService.deleteTweet(tweetId, userId);

            res.json({
                status: 'success',
                message: 'Tweet deleted',
            });
        } catch (error) {
            console.error('[TweetController] Error in deleteTweet', {
                tweetId: req.params.tweetId,
                userId: req.user._id,
                error: error.message,
            });
            next(error);
        }
    }

    async getStats(req, res, next) {
        try {
            const userId = req.user._id;

            const stats = await TweetService.getStats(userId);

            res.json({
                status: 'success',
                data: stats.data,
            });
        } catch (error) {
            console.error('[TweetController] Error in getStats', {
                userId: req.user._id,
                error: error.message,
            });
            next(error);
        }
    }
}

export default new TweetController();