import express from "express";
import authMiddleware from "../middleware/auth.js";
import RepositoryController from "../controllers/repository.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.post('/sync', RepositoryController.syncRepositories.bind(RepositoryController));
router.get('/', RepositoryController.getUserRepositories.bind(RepositoryController));
router.post('/track', RepositoryController.addRepositoryToTracking.bind(RepositoryController));
router.get('/:repositoryId', RepositoryController.getRepositoryDetails.bind(RepositoryController));
router.post('/:repositoryId/untrack', RepositoryController.removeRepositoryFromTracking.bind(RepositoryController));

export default router;