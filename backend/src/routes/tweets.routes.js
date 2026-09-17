import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import TweetController from "../controllers/tweet.controller.js";
import asyncHandler from "../utils/asyncHandler.js";
import { rateLimit, keyByUser } from "../middleware/rate-limit.js";
import { tweetGenerationLimiter, mutationLimiter, generalApiLimiter } from "../config/rate-limiters.js";

const router = Router();

router.use(authMiddleware);

/**
 * Get All Tweets
 * Query: ?page=1&limit=10&status=draft
 */
router.get('/', rateLimit(generalApiLimiter, keyByUser), asyncHandler((req, res) => TweetController.getUserTweets(req, res)));

// Get Draft Tweets
router.get('/drafts', rateLimit(generalApiLimiter, keyByUser), asyncHandler((req, res) => TweetController.getDraftTweets(req, res)));

// Get Stats
router.get('/stats', rateLimit(generalApiLimiter, keyByUser), asyncHandler((req, res) => TweetController.getStats(req, res)));

/**
 * Generate New Tweet
 * Body: { commitIds?: ["id1", "id2"] } (optional)
 */
router.post('/generate', rateLimit(tweetGenerationLimiter, keyByUser), asyncHandler((req, res) => TweetController.generateTweet(req, res)));

// Get single tweet
router.get('/:tweetId', rateLimit(generalApiLimiter, keyByUser), asyncHandler((req, res) => TweetController.getTweetById(req, res)));

/**
 * Edit Draft Tweet
 * Body: { content: "New tweet text..." }
 */
router.patch('/:tweetId', rateLimit(mutationLimiter, keyByUser), asyncHandler((req, res) => TweetController.editTweet(req, res)));

// Approve Draft
router.post('/:tweetId/approve', rateLimit(mutationLimiter, keyByUser), asyncHandler((req, res) => TweetController.approveTweet(req, res)));

// Reject Draft 
router.post('/:tweetId/reject', rateLimit(mutationLimiter, keyByUser), asyncHandler((req, res) => TweetController.rejectTweet(req, res)));

// Delete Tweet
router.delete('/:tweetId', rateLimit(mutationLimiter, keyByUser), asyncHandler((req, res) => TweetController.deleteTweet(req, res)));

export default router;