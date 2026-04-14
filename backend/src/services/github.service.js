import axios from "axios";
import CommitService from "./commit.service.js";
import RateLimitService from './rate-limit.service.js';
import AppError from "../errors/AppError.js";

class GithubService {
    constructor({ accessToken, redisClient }) {
        this.accessToken = accessToken;
        this.redisClient = redisClient;
        this.client = axios.create({
            baseURL: 'https://api.github.com',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });
    }

    async fetchUserRepositories(page = 1, perPage = 30) {
        try {
            const response = await this.client.get('/user/repos', {
                params: {
                    page,
                    per_page: perPage,
                    sort: 'updated',
                    direction: 'desc',
                }
            });

            return response.data.map((repo) => ({
                githubId: repo.id,
                name: repo.name,
                fullName: repo.full_name,
                description: repo.description,
                url: repo.html_url,
                language: repo.language,
                isPrivate: repo.private,
                stars: repo.stargazers_count,
            }));
        } catch (error) {
            this._handleGithubError(error);
        }
    }

    async fetchRepositoryDetails(repoFullName) {
        try {
            const response = await this.client.get(`/repos/${repoFullName}`);
            return {
                githubId: response.data.id,
                name: response.data.name,
                fullName: response.data.full_name,
                description: response.data.description,
                url: response.data.html_url,
                language: response.data.language,
                isPrivate: response.data.private,
                stars: response.data.stargazers_count,
            };
        } catch (error) {
            this._handleGithubError(error);
        }
    }

    async fetchRepositoryCommits(repoFullName, days = 30) {
        try {
            const since = new Date();
            since.setDate(since.getDate() - days);

            const response = await this.client.get(
                `/repos/${repoFullName}/commits`,
                {
                    params: {
                        since: since.toISOString(),
                        per_page: 100,
                    },
                }
            );

            return response.data;
        } catch (error) {
            this._handleGithubError(error);
        }
    }

    /**
     * Fetch detailed commit info from GitHub
     * Includes caching + rate limit handling
     */
    async fetchCommitDetails(owner, repo, sha, userId) {
        const cacheKey = `commit:${owner}:${repo}:${sha}`;
        try {
            // Check Redis cache 
            const cached = await this.redisClient.get(cacheKey);
            if (cached) {
                return {
                    ...JSON.parse(cached),
                    _fromCache: true
                };
            }

            // Call GitHub API
            const response = await this.client.get(
                `/repos/${owner}/${repo}/commits/${sha}`
            );

            // Parse response into normalized format
            const parsed = this.parseCommitResponse(response.data);

            // Update rate limit state
            await RateLimitService.updateRateLimitFromHeaders(userId, response.headers);

            // Cache result 
            await this.redisClient.set(
                cacheKey,
                JSON.stringify(parsed),
                { EX: 3600 }
            );
            return {
                ...parsed,
                _responseHeaders: response.headers
            };
        } catch (error) {
            console.error('[GithubService] Failed to fetch commits', {
                owner,
                repo,
                sha,
                message: error.message
            });
            this._handleGithubError(error);
        }
    }

    /**
     * Parse GitHub commit API response
     */
    parseCommitResponse(commitData) {
        try {
            const additions = commitData.stats?.additions || 0;
            const deletions = commitData.stats?.deletions || 0;
            const files = commitData.files || [];

            const filesChanged = files.map(file => ({
                filename: file.filename,
                additions: file.additions,
                deletions: file.deletions,
            }));

            const complexity = CommitService.calculateComplexity(
                additions,
                deletions,
                filesChanged
            );

            return {
                githubSha: commitData.sha,
                message: commitData.commit?.message || '',
                additions,
                deletions,
                totalChanges: additions + deletions,
                filesChangedCount: files.length,
                files: filesChanged,
                complexity
            };
        } catch (error) {
            console.error('[GitHubService] Parse commit response error:', error);
            throw new AppError(
                'Commit parse failed',
                500,
                'COMMIT_PARSE_FAILED'
            );
        }
    }

    _handleGithubError(error) {
        if (error.response?.status === 401) {
            throw new AppError(
                'Github token expired or invalid',
                401,
                'GITHUB_AUTH_FAILED'
            );
        }

        if (error.response?.status === 403) {
            throw new AppError(
                'Github API rate limit exceeded',
                429,
                'GITHUB_RATE_LIMITED'
            );
        }

        if (error.response?.status === 404) {
            throw new AppError(
                'Repository or commit not found',
                404,
                'REPO_NOT_FOUND'
            );
        }

        throw new AppError(
            error.message || 'Failed to fetch from GitHub',
            error.response?.status || 500,
            'GITHUB_API_ERROR'
        );
    }
}

export default GithubService;