import AIProviderService from "./ai-provider.service.js";
import Commit from "../../db/models/Commit.js";
import Tweet from "../../db/models/Tweet.js";
import AppError from "../../errors/AppError.js";

class BatchTweetGeneratorService {
    constructor() {
        this.aiProvider = new AIProviderService();
        this.commitBatchSize = 3;
        this.minCommitsForTweet = 1;
        this.maxCommitLimit = 5;
    }

    async generateDailyTweets(userId) {
        try {
            console.log('Starting daily tweet generation', { userId });

            const unprocessedCommits = await this._fetchUnprocessedCommits(userId);
            if (unprocessedCommits.length < this.minCommitsForTweet) {
                console.log('Not enough commits to generate tweet', {
                    userId,
                    commitCount: unprocessedCommits.length,
                    minRequired: this.minCommitsForTweet,
                });

                return {
                    status: 'no_commits',
                    message: 'Not enough commits to generate a tweet',
                    commitCount: 0,
                };
            }

            const commitBatch = unprocessedCommits.slice(0, this.commitBatchSize);

            const commitContext = this._buildCommitContext(commitBatch);

            const aiResult = await this.aiProvider.generateTweet(commitContext);

            if (!aiResult) {
                console.warn('Failed to generate tweet from Gemini', {
                    userId,
                    commitCount: commitBatch.length,
                });

                return {
                    status: 'generation_failed',
                    message: 'AI failed to generate a valid tweet',
                    commitCount: commitBatch.length,
                };
            }

            const tweet = await this._saveTweet(userId, commitBatch, aiResult, commitContext);

            console.log('Daily tweet generated successfully', {
                userId,
                tweetId: tweet._id,
                commitCount: commitBatch.length,
                tweetLength: tweet.content.length,
            });

            return {
                status: 'success',
                tweetId: tweet._id.toString(),
                content: tweet.content,
                commitCount: commitBatch.length,
                message: 'Tweet generated successfully',
            };
        } catch (error) {
            console.error('Error in daily tweet generation', {
                userId,
                message: error.message,
            });

            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                'Failed to generate daily tweet',
                500,
                'DAILY_TWEET_GENERATION_FAILED'
            );
        }
    }

    async generateOnDemandTweet(userId, commitIds = null) {
        try {
            console.log('Generating on-demand tweet', { userId, commitIds });

            if (commitIds && Array.isArray(commitIds)) {
                if (commitIds.length > this.maxCommitLimit) {
                    throw new AppError(
                        'Maximum 5 commits allowed per tweet',
                        400,
                        'COMMIT_LIMIT_EXCEEDED'
                    );
                }
            }

            let commits;
            if (commitIds && Array.isArray(commitIds) && commitIds.length > 0) {
                commits = await Commit.find({
                    _id: { $in: commitIds },
                    userId,
                })
                    .select('message additions deletions filesChanged timestamp url files')
                    .lean();

                if (commits.length !== commitIds.length) {
                    throw new AppError(
                        'Some commits not found or unauthorized',
                        404,
                        'BATCH_COMMITS_NOT_FOUND'
                    );
                }
            } else {
                commits = await this._fetchUnprocessedCommits(userId, 3);

                if (commits.length < this.minCommitsForTweet) {
                    return {
                        status: 'no_commits',
                        message: 'Not enough commits to generate a tweet',
                        commitCount: 0,
                    };
                }
            }

            const commitContext = this._buildCommitContext(commits);

            const aiResult = await this.aiProvider.generateTweet(commitContext);
            if (!aiResult) {
                return {
                    status: 'generation_failed',
                    message: 'AI failed to generate a valid tweet',
                    commitCount: commits.length,
                };
            }

            const tweet = await this._saveTweet(userId, commits, aiResult, commitContext);

            console.log('On-demand tweet generated successfully', {
                userId,
                tweetId: tweet._id,
                commitCount: commits.length,
            });

            return {
                status: 'success',
                tweetId: tweet._id.toString(),
                content: tweet.content,
                commitCount: commits.length,
                message: 'Tweet generated successfully',
            };
        } catch (error) {
            console.error('Error in on-demand tweet generation', {
                userId,
                error: error.message,
            });
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                'Failed to generate on-demand tweet',
                500,
                'ON_DEMAND_TWEET_GENERATION_FAILED'
            );
        }
    }

    async _fetchUnprocessedCommits(userId, limit = null) {
        const finalLimit = limit || this.commitBatchSize;

        const commits = await Commit.find({
            userId,
            isProcessed: true,
            tweeted: { $ne: true },
        })
            .select('message additions deletions filesChanged timestamp url files')
            .sort({ timestamp: -1 })
            .limit(finalLimit)
            .lean();

        return commits;
    }

    _buildCommitContext(commits) {
        let totalAdditions = 0;
        let totalDeletions = 0;
        let totalFilesChanged = 0;

        const languageMap = {
            '.js': 'JavaScript',
            '.jsx': 'JavaScript',
            '.ts': 'TypeScript',
            '.tsx': 'TypeScript',
            '.py': 'Python',
            '.java': 'Java',
            '.cpp': 'C++',
            '.cs': 'C#',
            '.rb': 'Ruby',
            '.go': 'Go',
            '.rs': 'Rust',
            '.php': 'PHP',
            '.swift': 'Swift',
            '.kt': 'Kotlin',
            '.sql': 'SQL',
            '.html': 'HTML',
            '.css': 'CSS',
            '.json': 'JSON',
            '.md': 'Documentation',
            '.yml': 'Config',
        };

        const languages = new Set();
        const frameworks = new Set();

        const normalizedCommits = commits.map((commit) => {
            const additions = commit.additions || 0;
            const deletions = commit.deletions || 0;
            const filesChanged = commit.filesChanged || 0;

            totalAdditions += additions;
            totalDeletions += deletions;
            totalFilesChanged += filesChanged;

            const files = commit.files || [];

            files.forEach((file) => {
                const ext = file.substring(file.lastIndexOf('.')).toLowerCase();
                if (languageMap[ext]) {
                    languages.add(languageMap[ext]);
                }

                if (file.includes('react') || ext === '.jsx' || ext === '.tsx') {
                    frameworks.add('React');
                }

                if (file.includes('node') || file.includes('server') || file.includes('api')) {
                    frameworks.add('Node.js');
                }
            });

            return {
                message: commit.message,
                additions,
                deletions,
                filesChanged,
                files,
                timestamp: commit.timestamp,
                url: commit.url,
            };
        });

        const context = {
            commits: normalizedCommits,
            metadata: {
                totalAdditions,
                totalDeletions,
                totalFilesChanged,
                commitCount: commits.length,
            },
            tech: {
                languages: Array.from(languages),
                frameworks: Array.from(frameworks),
            },
            userStyle: 'professional',
        };

        return context;
    }

    async _saveTweet(userId, commits, aiResult, commitContext) {
        const metadata = {
            commitCount: commitContext.metadata.commitCount,
            mainLanguages: commitContext.tech.languages,
        };

        const tweet = new Tweet({
            userId,
            commitIds: commits.map((c) => c._id),
            content: aiResult.content,
            status: 'draft',
            metadata,
            generatedAt: new Date(),
        });

        await tweet.save();
        return tweet;
    }
}

export default new BatchTweetGeneratorService();