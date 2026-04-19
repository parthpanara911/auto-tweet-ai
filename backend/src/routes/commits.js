import express from "express";
import mongoose from "mongoose";
import authMiddleware from "../middleware/auth.js";
import Commit from "../db/models/Commit.js";

const router = express.Router();

// Get user's commits
router.get('/', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 10, tweeted, isProcessed, repositoryId } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const query = { userId };

        // "Not posted yet" — match false, null, or missing (strict `tweeted: false` omits legacy docs without the field).
        if (tweeted === 'false') query.tweeted = { $ne: true };
        if (tweeted === 'true') query.tweeted = true;
        if (isProcessed === 'true') query.isProcessed = true;
        if (repositoryId && mongoose.Types.ObjectId.isValid(String(repositoryId))) {
            query.repositoryId = new mongoose.Types.ObjectId(String(repositoryId));
        }

        const commits = await Commit.find(query)
            .select(
                '_id repositoryId githubSha message additions deletions filesChanged timestamp url isProcessed tweeted'
            )
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

        const total = await Commit.countDocuments(query);

        res.json({
            status: 'success',
            data: commits,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            },
        });
    } catch (error) {
        next(error);
    }
});

// Get single commit
router.get('/:commitId', authMiddleware, async (req, res, next) => {
    try {
        const { commitId } = req.params;
        const userId = req.user._id;

        const commit = await Commit.findOne({
            _id: commitId,
            userId
        });

        if (!commit) {
            return res.status(404).json({
                status: 'error',
                message: 'Commit not found',
            });
        }

        res.json({
            status: 'success',
            data: commit,
        });
    } catch (error) {
        next(error);
    }
});

export default router;