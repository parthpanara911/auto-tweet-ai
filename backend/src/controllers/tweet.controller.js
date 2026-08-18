import { tweetGenerationQueue } from "../queue/bull.js";
import TweetService from "../services/tweet-generation/tweet.service.js";

class TweetController {
    async getUserTweets(req, res) {
        const userId = req.user._id;
        const { page = 1, limit = 10, status = null, search = '' } = req.query;
        const parsedPage = Math.max(1, parseInt(page, 10) || 1);
        const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

        const result = await TweetService.getUserTweets(userId, {
            page: parsedPage,
            limit: parsedLimit,
            status,
            search,
        });

        res.json({
            status: 'success',
            data: result,
        });
    }

    async getTweetById(req, res) {
        const { tweetId } = req.params;
        const userId = req.user._id;

        const result = await TweetService.getTweetById(tweetId, userId);

        res.json({
            status: 'success',
            data: result,
        });
    }

    async generateTweet(req, res) {
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

        const job = await tweetGenerationQueue.add('tweet-generation', jobData);

        console.log('[TweetController] Tweet generation job queued', {
            userId,
            jobId: job.id,
        });

        res.status(202).json({
            status: 'queued',
            message: 'Tweet generation started',
            jobId: job.id.toString(),
        });
    }

    async getDraftTweets(req, res) {
        const userId = req.user._id;

        const result = await TweetService.getDraftTweets(userId);

        res.json({
            status: 'success',
            data: result,
        });
    }

    async approveTweet(req, res) {
        const { tweetId } = req.params;
        const userId = req.user._id;

        const result = await TweetService.approveTweet(tweetId, userId);

        res.json({
            status: 'success',
            message: 'Tweet approved',
            data: result,
        });
    }

    async rejectTweet(req, res) {
        const { tweetId } = req.params;
        const userId = req.user._id;

        await TweetService.rejectTweet(tweetId, userId);

        res.json({
            status: 'success',
            message: 'Tweet rejected',
        });
    }

    async editTweet(req, res) {
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
            data: result,
        });
    }

    async deleteTweet(req, res) {
        const { tweetId } = req.params;
        const userId = req.user._id;

        await TweetService.deleteTweet(tweetId, userId);

        res.json({
            status: 'success',
            message: 'Tweet deleted',
        });
    }

    async getStats(req, res) {
        const userId = req.user._id;

        const stats = await TweetService.getStats(userId);

        res.json({
            status: 'success',
            data: stats,
        });
    }
}

export default new TweetController();