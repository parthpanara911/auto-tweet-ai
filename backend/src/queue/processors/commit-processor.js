import Commit from "../../db/models/Commit.js";
import Repository from "../../db/models/Repository.js";
import User from "../../db/models/User.js";
import { decrypt } from "../../utils/encryption.js";
import RateLimitService from "../../services/rate-limit.service.js";
import GitHubService from "../../services/github.service.js";
import CommitService from "../../services/commit.service.js";
import { redisClient } from "../../config/redis.js";

/**
 * Register commit processor with Bull queue
 */
class CommitProcessor {
    async processJob(job) {
        const startTime = Date.now();
        const { commitSha, repositoryId, userId, payload } = job.data;

        console.log("[CommitProcessor] Job started", {
            jobId: job.id,
            commitSha,
            repositoryId,
            userId,
            attempt: job.attemptsMade
        });

        try {
            job.progress(5);

            if (!commitSha || !repositoryId || !userId) {
                throw new Error('Invalid job data: missing required fields');
            }

            // Check for Duplicate
            const existing = await Commit.findOne({ githubSha: commitSha })
                .select('_id')
                .lean()
                .exec();
            if (existing) {
                console.log("[CommitProcessor] Duplicate skipped", {
                    jobId: job.id,
                    commitSha
                });
                return {
                    status: 'skipped',
                    reason: 'duplicate',
                    processingTime: Date.now() - startTime
                };
            }

            job.progress(10);

            // Fetch Repository & User
            const [repository, user] = await Promise.all([
                Repository.findById(repositoryId).select('fullName').lean().exec(),
                User.findById(userId).select('githubAccessToken').lean().exec()
            ]);

            if (!repository) {
                throw new Error(`Repository not found: ${repositoryId}`);
            }

            if (!user) {
                throw new Error(`User not found: ${userId}`);
            }

            if (!user.githubAccessToken) {
                throw new Error(`User has no GitHub token: ${userId}`);
            }

            // Decrypt GitHub Token 
            let githubAccessToken;
            try {
                githubAccessToken = decrypt(user.githubAccessToken);
            } catch (error) {
                throw new Error(`Failed to decrypt GitHub token: ${error.message}`);
            }

            job.progress(15);

            // Fetch commit details from github
            const [owner, repo] = repository.fullName.split('/');

            const githubService = new GitHubService({
                accessToken: githubAccessToken,
                redisClient
            });

            let commitDetails;
            try {
                const details = await githubService.fetchCommitDetails(
                    owner,
                    repo,
                    commitSha,
                    userId
                );

                if (details._fromCache) {
                    job.log("Using cached commit data");
                }

                commitDetails = details;
            } catch (error) {
                throw error;
            }

            if (!commitDetails) {
                throw new Error(`Failed to fetch commit details: ${commitSha}`);
            }

            job.progress(50);

            // Calculate Complexity
            const additions = commitDetails.additions || 0;
            const deletions = commitDetails.deletions || 0;
            const files = commitDetails.files || [];

            const complexity = CommitService.calculateComplexity(
                additions, deletions, files);

            job.progress(70);

            // Create Metadata
            const metadata = {
                complexity,
                tags: this._extractTags(commitDetails.message || '')
            };

            job.progress(75);

            // Save to MongoDB
            const commitDoc = new Commit({
                githubSha: commitDetails.githubSha,
                repositoryId,
                userId,
                message: commitDetails.message || '',
                authorName: payload.authorName || 'Unknown',
                authorEmail: payload.authorEmail || 'unknown@example.com',
                url: payload.url || '',
                branch: payload.branch || 'unknown',
                additions: commitDetails.additions || 0,
                deletions: commitDetails.deletions || 0,
                filesChanged: files.length,
                files: files.map((f) => f.filename),
                timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
                webhookReceivedAt: new Date(),
                processingStatus: 'completed',
                isProcessed: true,
                metadata
            });

            await commitDoc.save();

            job.progress(85);

            // Update Repo Stats in Redis Cache
            const cacheKey = `repo:${repositoryId}:stats`;
            const stats = {
                lastCommit: commitSha,
                lastCommitAt: new Date().toISOString(),
                totalCommit: await Commit.countDocuments({ repositoryId })
            };

            try {
                await redisClient.set(cacheKey, JSON.stringify(stats), {
                    EX: 3600,
                });
            } catch (error) {
                console.error("[CommitProcessor] Cache update failed", {
                    commitSha,
                    error: error.message
                });
            }

            job.progress(95);

            // Report Success
            const processingTime = Date.now() - startTime;
            job.progress(100);

            console.log("[CommitProcessor] Job completed", {
                jobId: job.id,
                commitId: commitDoc._id.toString(),
                commitSha,
                complexity,
                filesChanged: files.length,
                duration: processingTime
            });

            return {
                status: 'completed',
                commitId: commitDoc._id.toString(),
                commitSha,
                processingTime,
                complexity,
                filesChanged: files.length
            };
        } catch (error) {
            console.error("[CommitProcessor] Job failed", {
                jobId: job.id,
                commitSha,
                error: error.message,
                attempt: job.attemptsMade,
                duration: Date.now() - startTime
            });

            // Update rate limit on error for next attempt
            try {
                if (error.response?.headers) {
                    await RateLimitService.updateRateLimitFromHeaders(
                        userId,
                        error.response.headers
                    );
                }
            } catch (error) {
            }
            // Throw error to let Bull handle retries
            throw error;
        }
    }

    /**
     * Extract tags from commit message
     */
    _extractTags(message) {
        if (!message || typeof message !== 'string') return [];

        const tags = [];

        // Extract conventional commit type
        const typeMatch = message.match(/^(feat|fix|docs|style|refactor|test|chore|perf)/i);
        if (typeMatch && typeMatch[1]) {
            tags.push(typeMatch[1].toLowerCase());
        }

        // Extract scope if present 
        const scopeMatch = message.match(/^[a-z]+(?:\(([^)]+)\))?/i);
        if (scopeMatch && scopeMatch[1]) {
            tags.push(`scope:${scopeMatch[1].toLowerCase()}`);
        }

        // Extract #issue references
        const issueMatches = message.match(/#\d+/g);
        if (issueMatches) {
            tags.push(...issueMatches);
        }

        if (message.toLowerCase().includes('breaking change')) {
            tags.push('breaking');
        }

        return [...new Set(tags)];
    }
}

export default new CommitProcessor();