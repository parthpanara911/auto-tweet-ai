import Commit from "../db/models/Commit.js";

class CommitRepository {
    /**
     * Create and save new commit
     */
    async create(commitData) {
        try {
            const commit = new Commit(commitData);
            return await commit.save();
        } catch (error) {
            if (error.code === 11000) {
                // Duplicate key error
                throw new Error(`Commit already exists: ${commitData.githubSha}`);
            }
            throw error;
        }
    }

    /**
     * Find commit by GitHub SHA
     */
    async findByGithubSha(githubSha) {
        return Commit.findOne({ githubSha })
            .lean()
            .exec();
    }

    /**
    * Retrieves a single commit by its unique identifier
    */
    async findById(commitId) {
        return Commit.findById(commitId).lean().exec();
    }

    /**
     * Find commits by repository
     */
    async findByRepositoryId(repositoryId, options = {}) {
        const {
            page = 1,
            limit = 20,
            status = null
        } = options;

        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(100, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;

        const query = { repositoryId };
        if (status) query.processingStatus = status;

        const [commits, total] = await Promise.all([
            Commit.find(query)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean()
                .exec(),
            Commit.countDocuments(query).exec()
        ]);

        return {
            commits,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum)
            }
        };
    }

    /**
     * Find commits by user
     */
    async findByUserId(userId, options = {}) {
        const { page = 1, limit = 20 } = options;

        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(100, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [commits, total] = await Promise.all([
            Commit.find({ userId })
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean()
                .exec(),
            Commit.countDocuments({ userId }).exec()
        ]);

        return {
            commits,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum)
            }
        };
    }

    /**
     * Find unprocessed commits
     * Used by AI layer for processing
     */
    async findUnprocessed(limit = 100) {
        return Commit.find({ processingStatus: 'pending' })
            .sort({ timestamp: 1 })
            .limit(limit)
            .select({
                githubSha: 1,
                message: 1,
                repositoryId: 1
            })
            .lean()
            .exec();
    }

    /**
     * Update commit processing status
     */
    async updateProcessingStatus(commitId, status) {
        return Commit.findByIdAndUpdate(
            commitId,
            {
                processingStatus: status,
                isProcessed: status === 'completed'
            },
            { returnDocument: 'after', lean: true }
        ).exec();
    }

    /**
     * Get statistics for repository
     */
    async getRepositoryStats(repositoryId) {
        const [stats] = await Commit.aggregate([
            { $match: { repositoryId } },

            // Aggregate all required metrics in one pass
            {
                $group: {
                    _id: null,
                    totalCommits: { $sum: 1 },
                    totalAdditions: {
                        $sum: { $ifNull: ['$additions', 0] }
                    },
                    totalDeletions: {
                        $sum: { $ifNull: ['$deletions', 0] }
                    },
                    latestCommit: { $max: '$timestamp' },

                    // Complexity distribution counters
                    // Count how many commits fall into each category
                    low: {
                        $sum: {
                            $cond: [{ $eq: ['$metadata.complexity', 'low'] }, 1, 0]
                        }
                    },
                    medium: {
                        $sum: {
                            $cond: [{ $eq: ['$metadata.complexity', 'medium'] }, 1, 0]
                        }
                    },
                    high: {
                        $sum: {
                            $cond: [{ $eq: ['$metadata.complexity', 'high'] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        // Normalize result (handle empty repository case)
        const complexityDistribution = {
            low: stats?.low || 0,
            medium: stats?.medium || 0,
            high: stats?.high || 0
        };

        return {
            totalCommits: stats?.totalCommits || 0,
            totalAdditions: stats?.totalAdditions || 0,
            totalDeletions: stats?.totalDeletions || 0,
            latestCommit: stats?.latestCommit || null,
            complexityDistribution,
            averageComplexity: this._calculateAverageComplexity(complexityDistribution)
        };
    }

    /**
     * Delete commits older than specified days
     */
    async deleteOldCommits(daysOld) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await Commit.deleteMany({
            timestamp: { $lt: cutoffDate },
            // processingStatus: { $in: ['completed', 'failed'] } 
        });

        return result.deletedCount || 0;
    }

    /**
     * Count commits for repository
     */
    async countByRepository(repositoryId) {
        return Commit.countDocuments({ repositoryId });
    }

    /**
     *  Count commits for user
     */
    async countByUser(userId) {
        return Commit.countDocuments({ userId });
    }

    /**
     * Get commits in time range
     */
    async getCommitsInRange(userId, startDate, endDate, limit = 100) {
        return Commit.find({
            userId,
            timestamp: {
                $gte: startDate,
                $lte: endDate
            }
        })
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean()
            .exec();
    }

    /**
     * Internal: Calculate average complexity
     */
    _calculateAverageComplexity(distribution) {
        if (!distribution) return 'none';

        const { low = 0, medium = 0, high = 0 } = distribution;
        const total = low + medium + high;
        if (total === 0) return 'none';

        const score = (low * 1 + medium * 2 + high * 3) / total;

        if (score < 1.5) return 'low';
        if (score < 2.5) return 'medium';
        return 'high';
    }
}

export default new CommitRepository();