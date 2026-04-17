import crypto from "crypto";
import axios from "axios";
import Repository from "../db/models/Repository.js";
import Webhook from "../db/models/Webhook.js";
import { encrypt } from "../utils/encryption.js";
import AppError from "../errors/AppError.js";

class WebhookService {
    /**
     * Register a new webhook with GitHub for a repository
     */
    async registerWebhook(userId, repositoryId, githubAccessToken, webhookUrl) {
        try {
            if (!userId || !repositoryId || !githubAccessToken || !webhookUrl) {
                throw new AppError(
                    'Missing required parameters for webhook registration',
                    400,
                    'MISSING_PARAMS'
                );
            }

            const repository = await Repository.findById(repositoryId)
                .select('fullName')
                .exec();

            if (!repository) {
                throw new AppError(
                    'Repository not found',
                    404,
                    'REPO_NOT_FOUND'
                );
            }

            // ======= Find existing webhook =======
            const existingWebhook = await Webhook.findOne({
                userId,
                repositoryId
            });

            // Generate new secret every time
            const secret = crypto.randomBytes(32).toString('hex');
            const encryptedSecret = encrypt(secret);

            let githubWebhookId;

            // ======= Create New =======
            if (!existingWebhook) {
                const githubApiUrl = `https://api.github.com/repos/${repository.fullName}/hooks`;

                const response = await this._callGitHubAPI(
                    'POST',
                    githubApiUrl,
                    githubAccessToken,
                    {
                        name: 'web',
                        active: true,
                        events: ['push'],
                        config: {
                            url: webhookUrl,
                            content_type: 'json',
                            secret: secret,
                            insecure_ssl: '0'
                        }
                    }
                );

                githubWebhookId = response.data.id;

                const webhook = new Webhook({
                    githubId: githubWebhookId,
                    repositoryId,
                    userId,
                    secret: encryptedSecret,
                    url: webhookUrl,
                    isActive: true
                });

                await webhook.save();

                console.log(`[Webhook] Registered: GitHub ID ${githubWebhookId} for repo ${repository.fullName}`);

                await Repository.findByIdAndUpdate(repositoryId, {
                    isTracking: true
                });

                return {
                    id: webhook._id,
                    githubId: webhook.githubId,
                    repositoryId,
                    url: webhook.url,
                    isActive: true,
                };
            }

            // ======= Update Existing =======
            const githubApiUrl = `https://api.github.com/repos/${repository.fullName}/hooks/${existingWebhook.githubId}`;

            try {
                // Update webhook on GitHub
                await this._callGitHubAPI(
                    'PATCH',
                    githubApiUrl,
                    githubAccessToken,
                    {
                        config: {
                            url: webhookUrl,
                            content_type: 'json',
                            secret: secret,
                            insecure_ssl: '0'
                        },
                        active: true
                    }
                );

                githubWebhookId = existingWebhook.githubId;

                console.log(`[Webhook] Updated GitHub webhook: ${existingWebhook.githubId}`);
            } catch (error) {
                // If webhook not found on GitHub, recreate it
                if (error.statusCode === 404 || error.status === 404) {
                    console.warn(`[Webhook] GitHub webhook not found (${existingWebhook.githubId}), creating new one...`);

                    const response = await this._callGitHubAPI(
                        'POST',
                        `https://api.github.com/repos/${repository.fullName}/hooks`,
                        githubAccessToken,
                        {
                            name: 'web',
                            active: true,
                            events: ['push'],
                            config: {
                                url: webhookUrl,
                                content_type: 'json',
                                secret: secret,
                                insecure_ssl: '0'
                            }
                        }
                    );

                    githubWebhookId = response.data.id;
                } else {
                    throw error;
                }
            }

            // Update DB
            existingWebhook.githubId = githubWebhookId;
            existingWebhook.secret = encryptedSecret;
            existingWebhook.url = webhookUrl;
            existingWebhook.isActive = true;
            existingWebhook.failureCount = 0;

            await existingWebhook.save();

            await Repository.findByIdAndUpdate(repositoryId, {
                isTracking: true
            });

            return {
                id: existingWebhook._id,
                githubId: existingWebhook.githubId,
                repositoryId,
                url: existingWebhook.url,
                isActive: true
            };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError(
                error.message || 'Failed to register webhook',
                error.statusCode || 500,
                'WEBHOOK_REGISTER_ERROR'
            );
        }
    }

    /**
     * Unregister a webhook from GitHub
     */
    async unregisterWebhook(userId, webhookId, githubAccessToken) {
        try {
            if (!userId || !webhookId || !githubAccessToken) {
                throw new AppError(
                    'Missing required parameters',
                    400,
                    'MISSING_PARAMS'
                );
            }

            // ======= Fetch webhook =======
            const webhook = await Webhook.findById(webhookId)
                .populate('repositoryId', 'fullName')
                .exec();

            if (!webhook) {
                throw new AppError(
                    'Webhook not found',
                    404,
                    'WEBHOOK_NOT_FOUND'
                );
            }

            if (!webhook.userId.equals(userId)) {
                throw new AppError(
                    'Unauthorized to delete this webhook',
                    403,
                    'UNAUTHORIZED'
                );
            }

            if (!webhook.isActive) {
                return {
                    id: webhook._id,
                    githubId: webhook.githubId,
                    isActive: false
                };
            }

            // ======= Call GitHub API to delete =======
            const { fullName } = webhook.repositoryId;
            const githubApiUrl = `https://api.github.com/repos/${fullName}/hooks/${webhook.githubId}`;

            try {
                await this._callGitHubAPI(
                    'DELETE',
                    githubApiUrl,
                    githubAccessToken
                );

                console.log(`[Webhook] Deleted from GitHub: ${webhook.githubId}`);
            } catch (error) {
                const status =
                    error.statusCode ||
                    error.status ||
                    error.response?.status;

                if (status !== 404) {
                    throw error;
                }

                console.warn(
                    `[Webhook] Already deleted on GitHub: ${webhook.githubId}`
                );
            }

            webhook.isActive = false;
            await webhook.save();

            await Repository.findByIdAndUpdate(
                webhook.repositoryId._id,
                { isTracking: false }
            );

            return {
                id: webhook._id,
                githubId: webhook.githubId,
                isActive: false
            };
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError(
                error.message || 'Failed to unregister webhook',
                error.statusCode || 500,
                'WEBHOOK_UNREGISTER_ERROR'
            );
        }
    }

    /**
     * Internal: Call GitHub API
     */
    async _callGitHubAPI(method, url, accessToken, data = null) {
        try {
            const config = {
                method,
                url,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/vnd.github.v3+json',
                    'User-Agent': 'AutoTweetAI-Backend'
                }
            };

            if (data) {
                config.data = data;
            }

            const response = await axios(config);
            return response;
        } catch (error) {
            this._handleGitHubError(error);
        }
    }

    /**
     * Internal: Map GitHub API errors to AppError
     */
    _handleGitHubError(error) {
        const status = error.response?.status;
        const data = error.response?.data;

        if (status === 401) {
            throw new AppError(
                'GitHub token is invalid or expired',
                401,
                'GITHUB_AUTH_FAILED'
            );
        }

        if (status === 403) {
            throw new AppError(
                'GitHub API rate limit exceeded',
                429,
                'GITHUB_RATE_LIMIT'
            );
        }

        if (status === 404) {
            throw new AppError(
                'Repository or webhook not found on GitHub',
                404,
                'GITHUB_NOT_FOUND'
            );
        }

        if (status === 422) {
            throw new AppError(
                'Invalid webhook configuration',
                422,
                'GITHUB_VALIDATION_ERROR'
            );
        }

        throw new AppError(
            data?.message || error.message || 'GitHub API error',
            status || 500,
            'GITHUB_API_ERROR'
        );
    }
}

export default new WebhookService();