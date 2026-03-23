import express from "express";
import authMiddleware from "../middleware/auth.js";
import RepositoryController from "../controllers/repository.controller.js";

const router = express.Router();

router.use(authMiddleware);

// Sync repositories from GitHub
router.post('/sync', (req, res, next) => RepositoryController.syncRepositories(req, res, next));

// Get user's repositories
router.get('/', (req, res, next) => RepositoryController.getUserRepositories(req, res, next));

// Add repository to tracking
router.patch('/track', (req, res, next) => RepositoryController.addRepositoryToTracking(req, res, next));

// Get repository details
router.get('/:repositoryId', (req, res, next) => RepositoryController.getRepositoryDetails(req, res, next));

// Remove repository from tracking
router.patch('/:repositoryId/untrack', (req, res, next) => RepositoryController.removeRepositoryFromTracking(req, res, next));

export default router;