import CommitRepository from "../repositories/commit.repository.js";
import AppError from "../errors/AppError.js";

class CommitService {
    /**
     * Get commits for specific repository
     */
    async getRepositoryCommits(repositoryId, options = {}) {
        try {
            const result = await CommitRepository.findByRepositoryId(repositoryId, options);

            return {
                commits: result.commits.map((c) => this._formatCommit(c)),
                pagination: result.pagination
            };
        } catch (error) {
            throw new AppError(
                'Failed to fetch repository commits',
                500,
                'FETCH_COMMITS_ERROR'
            );
        }
    }

    /**
     * Get commits for user
     */
    async getUserCommits(userId, options = {}) {
        try {
            const result = await CommitRepository.findByUserId(userId, options);

            return {
                commits: result.commits.map((c) => this._formatCommit(c)),
                pagination: result.pagination
            };
        } catch (error) {
            throw new AppError(
                'Failed to fetch user commits',
                500,
                'FETCH_COMMITS_ERROR'
            );
        }
    }

    /**
     * Get unprocessed commits for AI processing
     */
    async getUnprocessedCommits(limit = 100) {
        try {
            const commits = await CommitRepository.findUnprocessed(limit);
            return commits.map((c) => this._formatCommit(c));
        } catch (error) {
            throw new AppError(
                'Failed to fetch unprocessed commits',
                500,
                'FETCH_UNPROCESSED_ERROR'
            );
        }
    }

    /**
     * Mark commit as processed
     */
    async markCommitAsProcessed(commitId) {
        try {
            const commit = await CommitRepository.updateProcessingStatus(
                commitId,
                'completed'
            );

            if (!commit) return null;

            if (commit.processingStatus === 'completed') {
                return this._formatCommit(commit);
            }

            return this._formatCommit(commit);
        } catch (error) {
            throw new AppError(
                'Failed to mark commit as processed',
                500,
                'UPDATE_COMMIT_ERROR'
            );
        }
    }

    /**
     * Get statistics for repository
     */
    async getRepositoryStats(repositoryId) {
        try {
            return await CommitRepository.getRepositoryStats(repositoryId);
        } catch (error) {
            throw new AppError(
                'Failed to get repository statistics',
                500,
                'STATS_ERROR'
            );
        }
    }

    /**
     * Get commits for date range
     */
    async getCommitsInRange(userId, startDate, endDate) {
        try {
            if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
                throw new AppError(
                    'Invalid date format',
                    400,
                    'INVALID_DATE'
                );
            }

            if (startDate > endDate) {
                throw new AppError(
                    'Start date must be before end date',
                    400,
                    'INVALID_DATE_RANGE'
                );
            }

            const commits = await CommitRepository.getCommitsInRange(
                userId, startDate, endDate);
            return commits.map((c) => this._formatCommit(c));
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                'Failed to get commits in range',
                500,
                'FETCH_RANGE_ERROR'
            );
        }
    }

    /**
     * Get commit details with formatting
     */
    async getCommitDetails(commitId) {
        try {
            const commit = await CommitRepository.findById(commitId);
            return commit ? this._formatCommit(commit) : null;
        } catch (error) {
            throw new AppError(
                'Failed to get commit details',
                500,
                'FETCH_COMMIT_ERROR'
            );
        }
    }

    /**
     * Calculate commit complexity
     */
    calculateComplexity(additions, deletions, filesChanged) {
        const fileCount = filesChanged?.length || 1;

        // Total churn
        const churn = additions + deletions;

        // Normalize churn per file
        const avgChangePerFile = churn / fileCount;

        // Log scale to avoid huge commits dominating
        const normalizedChurn = Math.log10(churn + 1) * 100;

        // File spread impact
        const fileImpact = Math.log2(fileCount + 1) * 40;

        // Detect wide vs concentrated changes
        const spreadFactor = avgChangePerFile < 50 ? 30 : 0;

        // Final score
        const score = normalizedChurn + fileImpact + spreadFactor;

        if (score < 120) return 'low';
        if (score < 300) return 'medium';
        return 'high';
    }

    /**
     * Format commit for API response
     */
    _formatCommit(commit) {
        return {
            id: commit._id,
            githubSha: commit.githubSha,
            message: commit.message,
            author: {
                name: commit.authorName,
                email: commit.authorEmail
            },
            url: commit.url,
            statistics: {
                additions: commit.additions,
                deletions: commit.deletions,
                filesChanged: commit.filesChanged
            },
            timestamp: commit.timestamp,
            processingStatus: commit.processingStatus,
            isProcessed: commit.isProcessed,
            metadata: commit.metadata,
            webhookReceivedAt: commit.webhookReceivedAt,
            createdAt: commit.createdAt
        };
    }
}

export default new CommitService();