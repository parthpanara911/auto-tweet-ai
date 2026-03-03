import Repository from "../db/models/Repository.js";
import AppError from "../errors/AppError.js";

class RepositoryService {
    async syncUserRepositories(user, githubService) {
        try {
            const repos = await this._fetchAllReposWithPagination(githubService);

            if (repos.length === 0) return [];

            const upsertPromises = repos.map((repo) =>
                Repository.findOneAndUpdate(
                    { githubId: repo.githubId },
                    {
                        ...repo,
                        userId: user._id,
                        isTracking: false,
                        lastSyncedAt: new Date(),
                    },
                    { upsert: true, new: true }
                )
            );

            const syncedRepos = await Promise.all(upsertPromises);
            return syncedRepos;
        } catch (error) {
            throw error;
        }
    }

    async getUserRepositories(userId, options = {}) {
        const {
            isTracking = null,
            limit = 50,
            skip = 0,
            sortBy = '-createdAt',
        } = options;

        const query = { userId };

        if (isTracking !== null) {
            query.isTracking = isTracking;
        }

        try {
            const [repos, total] = await Promise.all([
                Repository.find(query)
                    .limit(limit)
                    .skip(skip)
                    .sort(sortBy),
                Repository.countDocuments(query)
            ]);

            return {
                repos,
                pagination: {
                    total,
                    limit,
                    skip,
                    pages: Math.ceil(total / limit),
                },
            };
        } catch (error) {
            throw new AppError('Failed to fetch repositories', 500, 'REPO_FETCH_ERROR');
        }
    }

    async addRepositoryToTracking(userId, repoFullName, githubService) {
        try {
            const repoData = await githubService.fetchRepositoryDetails(repoFullName);

            const repo = await Repository.findOneAndUpdate(
                { githubId: repoData.githubId, userId },
                {
                    $set: {
                        ...repoData,
                        isTracking: true,
                        lastSyncedAt: new Date()
                    }
                },
                { new: true, upsert: true }
            );

            return repo;
        } catch (error) {
            throw error;
        }
    }

    async removeRepositoryFromTracking(userId, repositoryId) {
        try {
            const repo = await Repository.findOneAndUpdate(
                { _id: repositoryId, userId },
                { $set: { isTracking: false } },
                { new: true },
            )

            if (!repo) {
                throw new AppError('Repository not found', 404, 'REPO_NOT_FOUND');
            }

            return repo;
        } catch (error) {
            throw error;
        }
    }

    async _fetchAllReposWithPagination(githubService) {
        const allRepos = [];
        let page = 1;
        const perPage = 100;

        while (true) {
            const repos = await githubService.fetchUserRepositories(page, perPage);

            if (repos.length === 0) break;

            allRepos.push(...repos);
            page++;

            if (page > 10) break;
        }

        return allRepos;
    }
}

export default RepositoryService;