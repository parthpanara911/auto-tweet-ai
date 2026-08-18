import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import RepositoryController from "../controllers/repository.controller.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

router.use(authMiddleware);

// Sync repositories from GitHub
router.post('/sync', asyncHandler((req, res) => RepositoryController.syncRepositories(req, res)));

// Get user's repositories
router.get('/', asyncHandler((req, res) => RepositoryController.getUserRepositories(req, res)));

// Add repository to tracking
router.patch('/track', asyncHandler((req, res) => RepositoryController.addRepositoryToTracking(req, res)));

// Remove repository from tracking
router.patch('/:repositoryId/untrack', asyncHandler((req, res) => RepositoryController.removeRepositoryFromTracking(req, res)));

// Get repository details
router.get('/:repositoryId', asyncHandler((req, res) => RepositoryController.getRepositoryDetails(req, res)));

export default router;