import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import verifyWebhookSignature from "../middleware/verify-webhook-signature.js";
import WebhookController from "../controllers/webhook.controller.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

// GitHub webhook receiver endpoint
router.post('/github', verifyWebhookSignature,
    (req, res, next) => WebhookController.handleGitHubWebhook(req, res, next)
);

router.use(authMiddleware);

/**
 * Register webhook for a repository
 * Body: {repositoryId: "repo_mongodb_id"}
 */
router.post('/register', asyncHandler((req, res) => WebhookController.registerWebhook(req, res)));

/**
 * Get all webhooks for authenticated user
 * Query: ?page=1&limit=10
 */
router.get('/', asyncHandler((req, res) => WebhookController.getUserWebhooks(req, res)));

// Unregister and delete a webhook
router.delete('/:webhookId', asyncHandler((req, res) => WebhookController.unregisterWebhook(req, res)));

/**
 * Get recent webhook events
 * Query: ?page=1&limit=20&status=failed
 */
router.get('/:webhookId/events', asyncHandler((req, res) => WebhookController.getWebhookEvents(req, res)));

export default router;