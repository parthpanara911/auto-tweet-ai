import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import CommitController from "../controllers/commit.controller.js";
import asyncHandler from "../utils/asyncHandler.js";
import { rateLimit, keyByUser } from "../middleware/rate-limit.js";
import { generalApiLimiter } from "../config/rate-limiters.js";

const router = Router();

router.use(authMiddleware);
router.use(rateLimit(generalApiLimiter, keyByUser));

router.get('/', asyncHandler((req, res) => CommitController.getUserCommits(req, res)));

router.get('/:commitId', asyncHandler((req, res) => CommitController.getCommitById(req, res)));

export default router;