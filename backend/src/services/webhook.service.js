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

            // ======= Fetch repo details =======
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

            const existingWebhook = await Webhook.findOne({
                repositoryId,
                isActive: true
            });

            if (existingWebhook) {
                throw new AppError(
                    'Webhook already exists for this repository',
                    409,
                    'WEBHOOK_EXISTS'
                );
            }

            // ======= Generate random secret =======
            const secret = crypto.randomBytes(32).toString('hex');

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

            const githubWebhookId = response.data.id;

            if (!githubWebhookId) {
                throw new AppError(
                    'Github API did not return webhook ID',
                    500,
                    'GITHUB_API_ERROR'
                );
            }

            // ======= Encrypt secret =======
            const encryptedSecret = encrypt(secret);

            // ======= Save to database =======
            const webhook = new Webhook({
                githubId: githubWebhookId,
                repositoryId,
                userId,
                secret: encryptedSecret,
                url: webhookUrl,
                isActive: true
            });

            await webhook.save();

            console.log(`Webhook registered: GitHub ID ${githubWebhookId} for repo ${repository.fullName}`);

            return {
                id: webhook._id,
                githubId: webhook.githubId,
                repositoryId: webhook.repositoryId,
                url: webhook.url,
                isActive: webhook.isActive,
                createdAt: webhook.createdAt
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

            if (webhook.userId.toString() !== userId) {
                throw new AppError(
                    'Unauthorized to delete this webhook',
                    403,
                    'UNAUTHORIZED'
                );
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

                console.log(`Webhook deleted from GitHub: ${webhook.githubId}`);
            } catch (error) {
                if (error.statusCode !== 404) {
                    throw error;
                }
                console.warn(`Webhook already deleted on GitHub: ${webhook.githubId}`);
            }

            webhook.isActive = false;
            await webhook.save();

            return {
                id: webhook._id,
                githubId: webhook.githubId,
                message: 'Webhook successfully deleted'
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
            return this._handleGitHubError(error);
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

export default WebhookService;