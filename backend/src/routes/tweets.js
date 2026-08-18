import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import TweetController from "../controllers/tweet.controller.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

router.use(authMiddleware);

/**
 * Get All Tweets
 * Query: ?page=1&limit=10&status=draft
 */
router.get('/', asyncHandler((req, res) => TweetController.getUserTweets(req, res)));

// Get Draft Tweets
router.get('/drafts', asyncHandler((req, res) => TweetController.getDraftTweets(req, res)));

// Get Stats
router.get('/stats', asyncHandler((req, res) => TweetController.getStats(req, res)));

/**
 * Generate New Tweet
 * Body: { commitIds?: ["id1", "id2"] } (optional)
 */
router.post('/generate', asyncHandler((req, res) => TweetController.generateTweet(req, res)));

// Get single tweet
router.get('/:tweetId', asyncHandler((req, res) => TweetController.getTweetById(req, res)));

/**
 * Edit Draft Tweet
 * Body: { content: "New tweet text..." }
 */
router.patch('/:tweetId', asyncHandler((req, res) => TweetController.editTweet(req, res)));

// Approve Draft
router.post('/:tweetId/approve', asyncHandler((req, res) => TweetController.approveTweet(req, res)));

// Reject Draft 
router.post('/:tweetId/reject', asyncHandler((req, res) => TweetController.rejectTweet(req, res)));

// Delete Tweet
router.delete('/:tweetId', asyncHandler((req, res) => TweetController.deleteTweet(req, res)));

export default router;