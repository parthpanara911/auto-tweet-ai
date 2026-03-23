import express from "express";
import authMiddleware from "../middleware/auth.js";
import verifyWebhookSignature from "../middleware/verify-webhook-signature.js";
import WebhookController from "../controllers/webhook.controller.js";

const router = express.Router();

// GitHub webhook receiver endpoint
router.post('/github/:webhookId',
    express.raw({ type: 'application/json' }),
    verifyWebhookSignature,
    (req, res, next) => WebhookController.handleGitHubWebhook(req, res, next)
);

/**
 * Register webhook for a repository
 * Body: {repositoryId: "repo_mongodb_id"}
 */
router.post('/register', authMiddleware,
    (req, res, next) => WebhookController.registerWebhook(req, res, next)
);

/**
 * Get all webhooks for authenticated user
 * Query: ?page=1&limit=10
 */
router.get('/', authMiddleware,
    (req, res, next) => WebhookController.getUserWebhooks(req, res, next)
);

// Unregister and delete a webhook
router.delete('/:webhookId', authMiddleware,
    (req, res, next) => WebhookController.unregisterWebhook(req, res, next)
);

/**
 * Get recent webhook events
 * Query: ?page=1&limit=20&status=failed
 */
router.get('/:webhookId/events', authMiddleware,
    (req, res, next) => WebhookController.getWebhookEvents(req, res, next)
);

export default router;