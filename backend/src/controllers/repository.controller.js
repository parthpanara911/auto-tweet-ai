import GithubService from "../services/github.service.js";
import RepositoryService from "../services/repository.service.js";
import { decrypt } from "../utils/encryption.js";
import Repository from "../db/models/Repository.js";
import AppError from "../errors/AppError.js";

class RepositoryController {
    constructor(repositoryService) {
        this.repositoryService = repositoryService;
    }

    async syncRepositories(req, res, next) {
        try {
            const user = req.user;

            const decryptedToken = decrypt(user.githubAccessToken);
            const githubService = new GithubService(decryptedToken);

            const syncedRepos = await this.repositoryService.syncUserRepositories(
                user,
                githubService
            );

            res.json({
                message: 'Repositories synced successfully',
                count: syncedRepos.length,
                repositories: syncedRepos.map((repo) => ({
                    id: repo._id,
                    name: repo.name,
                    fullName: repo.fullName,
                    description: repo.description,
                    url: repo.url,
                    isTracking: repo.isTracking,
                })),
            });
        } catch (error) {
            next(error);
        }
    }

    async getUserRepositories(req, res, next) {
        try {
            const user = req.user;
            const { isTracking, page = 1, limit = 10 } = req.query;

            const parsedPage = parseInt(page);
            const parsedLimit = parseInt(limit);

            const finalPage = isNaN(parsedPage) ? 1 : parsedPage;
            const finalLimit = Math.min(isNaN(parsedLimit) ? 10 : parsedLimit, 50);

            const result = await this.repositoryService.getUserRepositories(user._id, {
                isTracking: isTracking ? isTracking === 'true' : null,
                skip: (finalPage - 1) * finalLimit,
                limit: finalLimit,
            });

            res.json({
                repositories: result.repos,
                pagination: result.pagination,
            });
        } catch (error) {
            next(error);
        }
    }

    async addRepositoryToTracking(req, res, next) {
        try {
            const user = req.user;
            const { repoFullName } = req.body;

            if (!repoFullName) {
                throw new AppError('repoFullName is required', 400, 'INVALID_REQUEST');
            }

            if (!repoFullName.includes('/')) {
                throw new AppError('Invalid repo format. Use "owner/repo"', 400, 'INVALID_FORMAT');
            }

            const decryptedToken = decrypt(user.githubAccessToken);
            const githubService = new GithubService(decryptedToken);

            const repo = await this.repositoryService.addRepositoryToTracking(
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
        } catch (error) {
            next(error);
        }
    }

    async removeRepositoryFromTracking(req, res, next) {
        try {
            const user = req.user;
            const { repositoryId } = req.params;

            const repo = await this.repositoryService.removeRepositoryFromTracking(
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
        } catch (error) {
            next(error);
        }
    }

    async getRepositoryDetails(req, res, next) {
        try {
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
        } catch (error) {
            next(error);
        }
    }
}

const repositoryService = new RepositoryService();
const repositoryController = new RepositoryController(repositoryService);

export default repositoryController;