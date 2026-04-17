import express from "express";
import authMiddleware from "../middleware/auth.js";
import TweetController from "../controllers/tweet.controller.js";

const router = express.Router();

router.use(authMiddleware);

/**
 * Get All Tweets
 * Query: ?page=1&limit=10&status=draft
 */
router.get('/', (req, res, next) =>
    TweetController.getUserTweets(req, res, next)
);

// Get Draft Tweets
router.get('/drafts', (req, res, next) =>
    TweetController.getDraftTweets(req, res, next)
);

// Get Stats
router.get('/stats', (req, res, next) =>
    TweetController.getStats(req, res, next)
);

/**
 * Generate New Tweet
 * Body: { commitIds?: ["id1", "id2"] } (optional)
 */
router.post('/generate', (req, res, next) =>
    TweetController.generateTweet(req, res, next)
);

// Get single tweet
router.get('/:tweetId', (req, res, next) =>
    TweetController.getTweetById(req, res, next)
);

/**
 * Edit Draft Tweet
 * Body: { content: "New tweet text..." }
 */
router.patch('/:tweetId', (req, res, next) =>
    TweetController.editTweet(req, res, next)
);

// Approve Draft
router.post('/:tweetId/approve', (req, res, next) =>
    TweetController.approveTweet(req, res, next)
);

// Reject Draft 
router.post('/:tweetId/reject', (req, res, next) =>
    TweetController.rejectTweet(req, res, next)
);

// Delete Tweet
router.delete('/:tweetId', (req, res, next) =>
    TweetController.deleteTweet(req, res, next)
);

export default router;