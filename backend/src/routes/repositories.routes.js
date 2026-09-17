import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import RepositoryController from "../controllers/repository.controller.js";
import asyncHandler from "../utils/asyncHandler.js";
import { rateLimit, keyByUser } from "../middleware/rate-limit.js";
import { mutationLimiter, generalApiLimiter } from "../config/rate-limiters.js";

const router = Router();

router.use(authMiddleware);

// Sync repositories from GitHub
router.post('/sync', asyncHandler((req, res) => RepositoryController.syncRepositories(req, res)));

// Get user's repositories
router.get('/', rateLimit(generalApiLimiter, keyByUser), asyncHandler((req, res) => RepositoryController.getUserRepositories(req, res)));

// Add repository to tracking
router.patch('/track', rateLimit(mutationLimiter, keyByUser), asyncHandler((req, res) => RepositoryController.addRepositoryToTracking(req, res)));

// Remove repository from tracking
router.patch('/:repositoryId/untrack', rateLimit(mutationLimiter, keyByUser), asyncHandler((req, res) => RepositoryController.removeRepositoryFromTracking(req, res)));

// Get repository details
router.get('/:repositoryId', rateLimit(generalApiLimiter, keyByUser), asyncHandler((req, res) => RepositoryController.getRepositoryDetails(req, res)));

export default router;