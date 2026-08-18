import GithubService from "../services/github.service.js";
import RepositoryService from "../services/repository.service.js";
import RepositorySyncCooldownService from "../services/repository-sync-cooldown.service.js";
import RepositorySyncLockService from "../services/repository-sync-lock.service.js";
import { decrypt } from "../utils/encryption.js";
import { redisClient } from "../config/redis.js";
import Repository from "../db/models/Repository.js";
import AppError from "../errors/AppError.js";

class RepositoryController {
    async syncRepositories(req, res) {
        const user = req.user;
        const userId = user._id.toString();
        let lockAcquired = false;

        try {
            const force = req.query.force === 'true';
            const decryptedToken = decrypt(user.githubAccessToken);

            if (await RepositorySyncCooldownService.isCoolingDown(userId)) {
                throw new AppError(
                    "Repository sync available after 5 minutes",
                    429,
                    "SYNC_COOLDOWN"
                );
            }

            lockAcquired = await RepositorySyncLockService.acquireLock(userId);

            if (!lockAcquired) {
                throw new AppError(
                    "Sync already running",
                    429,
                    "SYNC_IN_PROGRESS"
                );
            }

            const githubService = new GithubService({
                accessToken: decryptedToken,
                redisClient
            });

            const result = await RepositoryService.syncUserRepositories(
                user,
                githubService,
                { force }
            );

            await RepositorySyncCooldownService.setCooldown(userId);

            return res.json({
                message: result.skipped
                    ? 'Sync skipped (recently synced)'
                    : 'Repositories synced successfully',
                ...result,
            });
        } finally {
            if (lockAcquired) {
                await RepositorySyncLockService
                    .releaseLock(userId);
            }
        }
    }

    async getUserRepositories(req, res) {
        const user = req.user;
        const { isTracking, isPrivate, page = 1, limit = 12, search = '' } = req.query;

        const parsedPage = parseInt(page);
        const parsedLimit = parseInt(limit);

        const finalPage = isNaN(parsedPage) ? 1 : parsedPage;
        const finalLimit = Math.min(isNaN(parsedLimit) ? 10 : parsedLimit, 50);

        const result = await RepositoryService.getUserRepositories(user._id, {
            isTracking: isTracking ? isTracking === 'true' : null,
            isPrivate: isPrivate !== undefined ? isPrivate === 'true' : null,
            skip: (finalPage - 1) * finalLimit,
            limit: finalLimit,
            search,
        });

        res.json({
            repositories: result.repos,
            pagination: result.pagination,
        });
    }

    async addRepositoryToTracking(req, res) {
        const user = req.user;
        const { repoFullName } = req.body;

        if (!repoFullName) {
            throw new AppError('repoFullName is required', 400, 'INVALID_REQUEST');
        }

        if (!repoFullName.includes('/')) {
            throw new AppError('Invalid repo format. Use "owner/repo"', 400, 'INVALID_FORMAT');
        }

        const decryptedToken = decrypt(user.githubAccessToken);
        const githubService = new GithubService({
            accessToken: decryptedToken,
            redisClient
        });

        const repo = await RepositoryService.addRepositoryToTracking(
            user._id,
            repoFullName,
            githubService
        );

        res.status(201).json({
            message: 'Repository added to tracking',
            repository: {
                id: repo._id,
                name: repo.name,
                fullName: repo.fullName,
                isTracking: repo.isTracking,
            },
        });
    }

    async removeRepositoryFromTracking(req, res) {
        const user = req.user;
        const { repositoryId } = req.params;

        const repo = await RepositoryService.removeRepositoryFromTracking(
            user._id,
            repositoryId
        );

        res.json({
            message: 'Repository removed from tracking',
            repository: {
                id: repo._id,
                name: repo.name,
                isTracking: repo.isTracking,
            },
        });
    }

    async getRepositoryDetails(req, res) {
        const user = req.user;
        const { repositoryId } = req.params;

        const repo = await Repository.findOne({
            _id: repositoryId,
            userId: user._id,
        });

        if (!repo) {
            throw new AppError('Repository not found', 404, 'REPO_NOT_FOUND');
        }

        res.json({
            repository: repo,
        });
    }
}

export default new RepositoryController();