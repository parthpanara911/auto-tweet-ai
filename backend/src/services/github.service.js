import axios from "axios";
import AppError from "../errors/AppError.js";

class GithubService {
    constructor(accessToken) {
        this.accessToken = accessToken;
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

    async getRateLimitStatus() {
        try {
            const response = await this.client.get('/rate_limit');
            return response.data.rate_limit;
        } catch (error) {
            this._handleGithubError(error);
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
                'Repository not found',
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