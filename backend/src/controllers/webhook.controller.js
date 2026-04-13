import DedupService from "../services/dedup.service.js";
import WebhookEventService from "../services/webhook-event.service.js";
import WebhookEventLog from "../db/models/WebhookEventLog.js";
import { commitProcessingQueue } from "../queue/bull.js";
import { decrypt } from "../utils/encryption.js";
import WebhookService from "../services/webhook.service.js";
import Webhook from "../db/models/Webhook.js";
import AppError from "../errors/AppError.js";

class WebhookController {
    /**
     * Handle incoming github webhook
     * Extract commits, check duplicates, queue jobs
     */
    async handleGitHubWebhook(req, res, next) {
        const jobsToQueue = [];

        try {
            const webhook = req.webhook;
            const deliveryId = req.deliveryId;
            const payload = req.payload;
            const eventType = req.headers['x-github-event'];

            console.log(`[Webhook] Processing delivery: ${deliveryId}, event: ${eventType}`);

            // ======= Check delivery duplicate =======
            const isDuplicateDelivery = await DedupService.checkDeliveryId(deliveryId);

            if (isDuplicateDelivery) {
                console.log(`[Webhook] Duplicate delivery detected: ${deliveryId}`);

                return res.status(202).json({
                    message: 'Webhook received (duplicate delivery)',
                    deliveryId
                });
            }

            // ======= Extract commits =======
            const commits = WebhookEventService.extractCommits(payload);

            if (!commits || commits.length === 0) {
                await WebhookEventLog.create({
                    webhookId: webhook._id,
                    githubDeliveryId: deliveryId,
                    payload: {
                        repo: payload.repository?.full_name,
                        branch: payload.ref?.replace('refs/heads/', ''),
                        commitsCount: payload.commits?.length,
                        author: payload.head_commit?.author?.name,
                        message: payload.head_commit?.message
                    },
                    signatureValid: true,
                    isDuplicate: false,
                    status: 'completed',
                    processingTime: 0
                }).catch((err) => {
                    console.error('Failed to log webhook:', err.message);
                });

                return res.status(202).json({
                    message: 'Webhook received (no commits)',
                    deliveryId,
                    commitCount: 0
                });
            }

            console.log(`[Webhook] Extracted ${commits.length} commits`);

            // ======= Process each commit =======
            for (const commit of commits) {
                const isDuplicate = await DedupService.checkDuplicate(commit.githubSha);

                if (isDuplicate) {
                    console.log(`[Webhook] Skipping duplicate: ${commit.githubSha}`);
                    continue;
                }

                const job = await commitProcessingQueue.add(
                    'commit-processing',
                    {
                        commitSha: commit.githubSha,
                        repositoryId: webhook.repositoryId,
                        userId: webhook.userId,
                        payload: commit
                    },
                    {
                        jobId: `${webhook.repositoryId}-${commit.githubSha}`
                    }
                );

                jobsToQueue.push(job.id);

                await DedupService.markAsSeen(commit.githubSha);

                console.log(`[Webhook] Queued: ${job.id}`);
            }

            // ======= Log event =======
            await WebhookEventLog.create({
                webhookId: webhook._id,
                githubDeliveryId: deliveryId,
                payload: {
                    repo: payload.repository?.full_name,
                    branch: payload.ref?.replace('refs/heads/', ''),
                    commitsCount: payload.commits?.length,
                    author: payload.head_commit?.author?.name,
                    message: payload.head_commit?.message
                },
                signatureValid: true,
                isDuplicate: false,
                status: 'queued',
                processingTime: 0
            }).catch((err) => {
                console.error('Failed to log webhook:', err.message);
            });

            await DedupService.markDeliveryAsProcessed(deliveryId);

            return res.status(202).json({
                message: 'Webhook received and processed',
                deliveryId,
                commitCount: commits.length,
                jobsToQueue: jobsToQueue.length
            });
        } catch (error) {
            console.error('[Webhook] Error processing:', error);
            next(error);
        }
    }

    /**
     * Register webhook for repository
     */
    async registerWebhook(req, res, next) {
        try {
            const user = req.user;
            const { repositoryId } = req.body;

            if (!repositoryId) {
                throw new AppError(
                    'repositoryId is required',
                    400,
                    'MISSING_REPO_ID'
                );
            }

            const githubAccessToken = decrypt(user.githubAccessToken);

            const webhookUrl = `${process.env.WEBHOOK_BASE_URL}/webhooks/github`;

            const webhook = await WebhookService.registerWebhook(
                user._id,
                repositoryId,
                githubAccessToken,
                webhookUrl
            );

            return res.status(201).json({
                message: 'Webhook registered successfully',
                webhook
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Unregister webhook
     */
    async unregisterWebhook(req, res, next) {
        try {
            const user = req.user;
            const { webhookId } = req.params;

            const githubAccessToken = decrypt(user.githubAccessToken);

            const result = await WebhookService.unregisterWebhook(
                user._id,
                webhookId,
                githubAccessToken
            );

            return res.json({
                message: 'Webhook unregistered successfully',
                result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get user's webhooks
     */
    async getUserWebhooks(req, res, next) {
        try {
            const user = req.user;
            const { page = 1, limit = 10 } = req.query;

            const parsedPage = parseInt(page);
            const parsedLimit = parseInt(limit);

            const finalPage = isNaN(parsedPage) ? 1 : parsedPage;
            const finalLimit = Math.min(isNaN(parsedLimit) ? 10 : parsedLimit, 50);
            const skip = (finalPage - 1) * finalLimit;


            const [webhooks, total] = await Promise.all([
                Webhook.find({ userId: user._id })
                    .populate('repositoryId', 'name fullName')
                    .skip(skip)
                    .limit(finalLimit)
                    .sort({ createdAt: -1 })
                    .lean(),

                Webhook.countDocuments({ userId: user._id })
            ]);

            return res.json({
                webhooks,
                pagination: {
                    total,
                    page: finalPage,
                    limit: finalLimit,
                    pages: Math.ceil(total / finalLimit)
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get webhook events
     */
    async getWebhookEvents(req, res, next) {
        try {
            const { webhookId } = req.params;
            const { page = 1, limit = 20, status } = req.query;

            const parsedPage = parseInt(page);
            const parsedLimit = parseInt(limit);

            const finalPage = isNaN(parsedPage) ? 1 : parsedPage;
            const finalLimit = Math.min(isNaN(parsedLimit) ? 10 : parsedLimit, 50);
            const skip = (finalPage - 1) * finalLimit;

            const webhook = await Webhook.findOne({
                githubId: webhookId,
                userId: req.user._id
            })

            const query = { webhookId: webhook._id };
            if (status) query.status = status;

            const [events, total] = await Promise.all([
                await WebhookEventLog.find(query)
                    .skip(skip)
                    .limit(finalLimit)
                    .sort({ createdAt: -1 })
                    .lean(),

                WebhookEventLog.countDocuments(query)
            ]);

            return res.json({
                events,
                pagination: {
                    total,
                    page: finalPage,
                    limit: finalLimit,
                    pages: Math.ceil(total / finalLimit)
                }
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new WebhookController();