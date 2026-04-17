import express from "express";
import passport from "passport";
import { generateTokens, verifyToken } from "../utils/jwt.js";
import authMiddleware from "../middleware/auth.js";
<<<<<<< Updated upstream
=======
import config from "../config/environment.js";
import Repository from "../db/models/Repository.js";
>>>>>>> Stashed changes
import Webhook from "../db/models/Webhook.js";
import { decrypt } from "../utils/encryption.js";
import WebhookService from "../services/webhook.service.js";
import DedupService from "../services/dedup.service.js";
import RateLimitService from "../services/rate-limit.service.js";
import { commitProcessingQueue, redisClient } from "../config/redis.js";
import AppError from "../errors/AppError.js";

const router = express.Router();

router.get('/github', passport.authenticate('github', {
    scope: ['user:email', 'repo', 'admin:repo_hook']
}));

router.get('/github/callback',
    passport.authenticate('github', { session: false }),
    (req, res) => {
        const { accessToken, refreshToken } = generateTokens(req.user._id);

        res.json({
            message: 'Login successful',
            accessToken,
            refreshToken,
            user: req.user
        });
    }
);

router.post('/refresh', (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            throw new AppError('Refresh token required', 400, 'REFRESH_TOKEN_MISSING');
        }

        const decoded = verifyToken(refreshToken, true);
        const { accessToken } = generateTokens(decoded.userId);

        res.json({ accessToken });
    } catch (error) {
        next(error);
    }
});

<<<<<<< Updated upstream
router.post('/logout', authMiddleware, async (req, res, next) => {
    const startTime = Date.now();
    const cleanup = {
        webhooksDeleted: 0,
        jobsCancelled: 0,
        cacheCleared: 0,
        tokenRevoked: false,
        errors: []
    };
=======
router.post(
    '/logout',
    (req, res, next) => {
        res.clearCookie('access_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
        });
        next();
    },
    authMiddleware,
    async (req, res, next) => {
        const startTime = Date.now();
        const cleanup = {
            webhooksDeleted: 0,
            jobsCancelled: 0,
            cacheCleared: 0,
            tokenRevoked: false,
            errors: []
        };
>>>>>>> Stashed changes

    try {
        const user = req.user;

        console.log(`[Auth] Logging out user: ${user._id}`);

        // Get all webhooks for user
        let webhooks = [];
        try {
<<<<<<< Updated upstream
            webhooks = await Webhook.find({ userId: user._id });
=======
            const user = req.user;

            // Get all webhooks for user
            let webhooks = [];
            try {
                webhooks = await Webhook.find({ userId: user._id });
            } catch (error) {
                console.error('[Auth] Error finding webhooks:', error.message);
                cleanup.errors.push('Failed to find webhooks');
            }

            // Delete webhooks from github
            let githubAccessToken = null;
            if (user.githubAccessToken) {
                try {
                    githubAccessToken = decrypt(user.githubAccessToken);
                } catch (error) {
                    cleanup.errors.push('Failed to decrypt token');
                }
            } else {
                console.log('[Auth] No GitHub token found (already logged out)');
            }

            for (const webhook of webhooks) {
                try {
                    if (githubAccessToken) {
                        await WebhookService.unregisterWebhook(
                            user._id,
                            webhook._id,
                            githubAccessToken
                        );
                    } else {
                        webhook.isActive = false;
                        await webhook.save();
                    }
                    cleanup.webhooksDeleted++;
                } catch (error) {
                    cleanup.errors.push(`Failed to delete webhook ${webhook._id}`);
                }
            }

            const repoIds = webhooks.map(w => w.repositoryId);

            await Repository.updateMany(
                { _id: { $in: repoIds } },
                { isTracking: false }
            );

            // Cancel pending jobs
            try {
                const waitingJobs = await commitProcessingQueue.getJobs(['waiting']);
                const activeJobs = await commitProcessingQueue.getJobs(['active']);

                const allJobs = [...waitingJobs, ...activeJobs];

                // Filter jobs for this user
                const userJobs = allJobs.filter((job) => {
                    return job.data && job.data.userId === user._id.toString();
                });

                for (const job of userJobs) {
                    try {
                        await job.remove();
                        cleanup.jobsCancelled++;
                    } catch (error) {
                        cleanup.errors.push(`Failed to cancel job ${job.id}`);
                    }
                }
            } catch (error) {
                cleanup.errors.push('Failed to cancel jobs');
            }

            // Clear Redis cache
            try {
                const dedupCleared = await DedupService.clearUserCache(user._id);
                const rateLimitCleared = await RateLimitService.clearUserCache(user._id);

                // Clear any other user-specific cache
                const patterns = [
                    `rate-limit:${user._id}`,
                    `session:${user._id}`,
                    `webhook:*:${user._id}`,
                    `repo:*:${user._id}`
                ]

                let totalCleared = dedupCleared + rateLimitCleared;

                for (const pattern of patterns) {
                    try {
                        const keys = await redisClient.keys(pattern);
                        for (const key of keys) {
                            await redisClient.del(key);
                            totalCleared++;
                        }
                    } catch (error) {
                        // Ignore errors in pattern matching
                    }
                }

                cleanup.cacheCleared = totalCleared;
            } catch (error) {
                cleanup.errors.push('Failed to clear cache');
            }

            // Revoke github token in database
            try {
                user.githubAccessToken = null;
                user.githubTokenRevoked = true;
                user.tokenRevokedAt = new Date();
                await user.save();
                cleanup.tokenRevoked = true;
            } catch (error) {
                console.error('[Auth] Error revoking token:', error.message);
                cleanup.errors.push('Failed to revoke token');
            }

            // Clear auth cookie (cookie-based clients)
            res.clearCookie('access_token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
            });

            // Return response
            const processingTime = Date.now() - startTime;
            console.log(`[Auth] User logged out: ${user._id} (${processingTime}ms)`);

            return res.json({
                message: 'Logged out successfully',
                cleanup,
                processingTime,
                timestamp: new Date()
            });
>>>>>>> Stashed changes
        } catch (error) {
            console.error('[Auth] Error finding webhooks:', error.message);
            cleanup.errors.push('Failed to find webhooks');
        }

        // Delete webhooks from github
        let githubAccessToken = null;
        if (user.githubAccessToken) {
            try {
                githubAccessToken = decrypt(user.githubAccessToken);
            } catch (error) {
                console.warn('[Auth] Failed to decrypt GitHub token:', error.message);
                cleanup.errors.push('Failed to decrypt token');
            }
        } else {
            console.log('[Auth] No GitHub token found (already logged out)');
        }

        for (const webhook of webhooks) {
            try {
                if (githubAccessToken) {
                    await WebhookService.unregisterWebhook(
                        user._id,
                        webhook._id,
                        githubAccessToken
                    );
                } else {
                    webhook.isActive = false;
                    await webhook.save();
                }
                cleanup.webhooksDeleted++;
            } catch (error) {
                console.warn(`[Auth] Failed to delete webhook ${webhook._id}: ${error.message}`);
                cleanup.errors.push(`Failed to delete webhook ${webhook._id}`);
            }
        }

        // Cancel pending jobs
        try {
            const waitingJobs = await commitProcessingQueue.getJobs(['waiting']);
            const activeJobs = await commitProcessingQueue.getJobs(['active']);

            const allJobs = [...waitingJobs, ...activeJobs];

            // Filter jobs for this user
            const userJobs = allJobs.filter((job) => {
                return job.data && job.data.userId === user._id.toString();
            });

            for (const job of userJobs) {
                try {
                    await job.remove();
                    cleanup.jobsCancelled++;
                } catch (error) {
                    console.warn(`[Auth] Failed to cancel job ${job.id}: ${error.message}`);
                    cleanup.errors.push(`Failed to cancel job ${job.id}`);
                }
            }
        } catch (error) {
            console.warn(`[Auth] Failed to cancel jobs: ${error.message}`);
            cleanup.errors.push('Failed to cancel jobs');
        }

        // Clear Redis cache
        try {
            const dedupCleared = await DedupService.clearUserCache(user._id);
            const rateLimitCleared = await RateLimitService.clearUserCache(user._id);

            // Clear any other user-specific cache
            const patterns = [
                `rate-limit:${user._id}`,
                `session:${user._id}`,
                `webhook:*:${user._id}`,
                `repo:*:${user._id}`
            ]

            let totalCleared = dedupCleared + rateLimitCleared;

            for (const pattern of patterns) {
                try {
                    const keys = await redisClient.keys(pattern);
                    for (const key of keys) {
                        await redisClient.del(key);
                        totalCleared++;
                    }
                } catch (error) {
                    // Ignore errors in pattern matching
                }
            }

            cleanup.cacheCleared = totalCleared;
        } catch (error) {
            console.warn(`[Auth] Failed to clear cache: ${error.message}`);
            cleanup.errors.push('Failed to clear cache');
        }

        // Revoke github token in database
        try {
            user.githubAccessToken = null;
            user.githubTokenRevoked = true;
            user.tokenRevokedAt = new Date();
            await user.save();
            cleanup.tokenRevoked = true;
            console.log(`[Auth] Revoked GitHub token`);
        } catch (error) {
            console.error('[Auth] Error revoking token:', error.message);
            cleanup.errors.push('Failed to revoke token');
        }

        // Return response
        const processingTime = Date.now() - startTime;
        console.log(`[Auth] User logged out: ${user._id} (${processingTime}ms)`);

        return res.json({
            message: 'Logged out successfully',
            cleanup,
            processingTime,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('[Auth] Error during logout:', error);
        next(error);
    }
});

router.get('/me', authMiddleware, (req, res) => {
    res.json({
        user: {
            id: req.user._id,
            username: req.user.username,
            email: req.user.email,
            avatar: req.user.avatar,
        },
    });
});

export default router;