import Commit from "../../db/models/Commit.js";
import TweetRepository from "../../repositories/tweet.repository.js";
import BatchTweetGeneratorService from "./batch-tweet-generator.service.js";
import AppError from "../../errors/AppError.js";

class TweetService {
    async getUserTweets(userId, options = {}) {
        try {
            const result = await TweetRepository.findByUserId(userId, options);

            return {
                tweets: result.tweets.map((tweet) => this._formatTweet(tweet)),
                pagination: result.pagination,
            };
        } catch (error) {
            if (error instanceof AppError) throw error;

            console.error(`[TweetService] getUserTweets failed for ${userId}:`, error.message);
            throw new AppError('Failed to retrieve your tweets', 500, 'FETCH_USER_TWEETS_ERROR');
        }
    }

    async getTweetById(tweetId, userId) {
        try {
            const tweet = await TweetRepository.findByIdAndUser(tweetId, userId);
            if (!tweet) {
                throw new AppError('Tweet not found', 404, 'TWEET_NOT_FOUND');
            }

            return this._formatTweet(tweet);
        } catch (error) {
            if (error instanceof AppError) throw error;

            console.error(`[TweetService] getTweetById failed:`, { tweetId, userId, error: error.message });
            throw new AppError('Could not fetch the requested tweet', 400, 'TWEET_GET_FAILED');
        }
    }

    async createDraftTweet(userId, commitIds = null) {
        try {
            const result = await BatchTweetGeneratorService.
                generateOnDemandTweet(userId, commitIds);

            if (result.status !== 'success') {
                throw new AppError(
                    result.message || 'Tweet generation failed',
                    400,
                    'TWEET_GENERATION_FAILED'
                );
            }

            const tweet = await TweetRepository.findById(result.tweetId);

            if (!tweet) {
                throw new AppError(
                    'Generated tweet not found',
                    404,
                    'TWEET_NOT_FOUND'
                );
            }

            console.log('[TweetService] Draft tweet created', {
                userId,
                tweetId: result.tweetId,
            });

            return {
                success: true,
                data: this._formatTweet(tweet),
            };
        } catch (error) {
            console.error('[TweetService] createDraftTweet failed', {
                userId,
                error: error.message,
            });

            if (error instanceof AppError) throw error;

            throw new AppError(
                'Failed to create draft tweet',
                500,
                'CREATE_DRAFT_TWEET_FAILED'
            );
        }
    }

    async getDraftTweets(userId) {
        try {
            const tweets = await TweetRepository.findDrafts(userId);

            return {
                success: true,
                data: tweets.map((tweet) => this._formatTweet(tweet)),
            };
        } catch (error) {
            console.error('[TweetService] getDraftTweets failed', {
                userId,
                error: error.message,
            });

            if (error instanceof AppError) throw error;

            throw new AppError(
                'Failed to fetch draft tweets',
                500,
                'GET_DRAFT_TWEETS_FAILED'
            );
        }
    }

    async approveTweet(tweetId, userId) {
        try {
            const tweet = await TweetRepository.findByIdAndUser(tweetId, userId);

            if (!tweet) {
                throw new AppError(
                    'Tweet not found',
                    404,
                    'TWEET_NOT_FOUND'
                );
            }

            if (tweet.status !== 'draft') {
                throw new AppError(
                    'Only draft tweets can be approved',
                    400,
                    'INVALID_STATUS_FOR_APPROVAL'
                );
            }

            const updatedTweet = await TweetRepository.updateStatus(
                tweetId,
                'approved'
            );

            console.log('[TweetService] Tweet approved:', { userId, tweetId });

            return {
                success: true,
                data: this._formatTweet(updatedTweet),
            };
        } catch (error) {
            console.error('[TweetService] Error approving tweet:', {
                tweetId,
                userId,
                error: error.message,
            });

            if (error instanceof AppError) throw error;

            throw new AppError('Failed to approve tweet due to a server error', 500, 'APPROVE_TWEET_FAILED');
        }
    }

    async rejectTweet(tweetId, userId) {
        try {
            const tweet = await TweetRepository.findByIdAndUser(tweetId, userId);

            if (!tweet) {
                throw new AppError(
                    'Tweet not found',
                    404,
                    'TWEET_NOT_FOUND'
                );
            }

            if (tweet.status !== 'draft') {
                throw new AppError(
                    'Only draft tweets can be rejected',
                    400,
                    'INVALID_STATUS_FOR_REJECTION'
                );
            }

            const commitMongoIds = this._commitIdsForQuery(tweet.commitIds);
            if (commitMongoIds.length) {
                await Commit.updateMany(
                    { _id: { $in: commitMongoIds } },
                    {
                        tweeted: false,
                        tweetId: null,
                    }
                );
            }

            await TweetRepository.updateStatus(tweetId, 'rejected');

            console.log('[TweetService] Tweet rejected:', {
                userId, tweetId, commitCount: tweet.commitIds?.length || 0,
            });

            return {
                status: true,
                message: 'Tweet rejected and commits reset',
            };
        } catch (error) {
            console.error('[TweetService] Error rejecting tweet:', {
                tweetId,
                userId,
                error: error.message,
            });

            if (error instanceof AppError) throw error;

            throw new AppError('Failed to reject tweet due to a server error', 500, 'REJECT_TWEET_FAILED');
        }
    }

    async editTweet(tweetId, userId, newContent) {
        try {
            const tweet = await TweetRepository.findByIdAndUser(tweetId, userId);

            if (!tweet) {
                throw new AppError(
                    'Tweet not found',
                    404,
                    'TWEET_NOT_FOUND'
                );
            }

            const updatedTweet = await TweetRepository.updateContent(
                tweetId,
                newContent
            );

            console.log('[TweetService] Tweet edited:', {
                userId, tweetId, newLength: newContent.length,
            });

            return {
                success: true,
                data: this._formatTweet(updatedTweet),
            };
        } catch (error) {
            console.error('[TweetService] Error editing tweet:', {
                tweetId,
                userId,
                error: error.message,
            });

            if (error instanceof AppError) throw error;

            throw new AppError('Failed to edit tweet due to a server error', 500, 'EDIT_TWEET_FAILED');
        }
    }

    async deleteTweet(tweetId, userId) {
        try {
            const tweet = await TweetRepository.findByIdAndUser(tweetId, userId);

            if (!tweet) {
                throw new AppError(
                    'Tweet not found',
                    404,
                    'TWEET_NOT_FOUND'
                );
            }

            if (tweet.status === 'posted') {
                throw new AppError(
                    'Cannot delete posted tweets',
                    400,
                    'TWEET_ALREADY_POSTED'
                );
            }

            const commitMongoIds = this._commitIdsForQuery(tweet.commitIds);
            if (commitMongoIds.length) {
                await Commit.updateMany(
                    { _id: { $in: commitMongoIds } },
                    {
                        tweeted: false,
                        tweetId: null,
                    }
                );
            }

            await TweetRepository.delete(tweetId);

            console.log('[TweetService] Tweet deleted', {
                userId,
                tweetId,
            });

            return {
                success: true,
                message: 'Tweet deleted successfully',
            };
        } catch (error) {
            console.error('[TweetService] Error deleting tweet', {
                tweetId,
                userId,
                error: error.message,
            });

            if (error instanceof AppError) throw error;

            throw new AppError('Failed to delete tweet due to a server error', 500, 'DELETE_TWEET_FAILED');
        }
    }

    async getStats(userId) {
        try {
            const stats = await TweetRepository.getStats(userId);

            return {
                draft: stats.draft,
                approved: stats.approved,
                posted: stats.posted,
                rejected: stats.rejected,
                total: stats.draft + stats.approved + stats.posted + stats.rejected,
            };
        } catch (error) {
            console.error('[TweetService] Error getting stats', {
                userId,
                error: error.message,
            });

            if (error instanceof AppError) throw error;

            throw new AppError(
                'Failed to fetch tweet stats',
                500,
                'GET_STATS_FAILED'
            );
        }
    }

    /** Normalize commit id array when commitIds are populated Mongoose subdocuments. */
    _commitIdsForQuery(commitIds) {
        if (!Array.isArray(commitIds)) return [];
        return commitIds.map((c) => (c && typeof c === 'object' && c._id != null ? c._id : c));
    }

    _formatTweet(tweet) {
        const t = tweet?.toObject ? tweet.toObject() : tweet;
        const rawId = t._id ?? t.id;
        const id = rawId?.toString?.() ?? String(rawId);

        const commitsPayload = [];
        let repositoryFullName = null;

        for (const c of t.commitIds || []) {
            if (c == null) continue;
            const cid =
                typeof c === 'object' && c._id != null
                    ? String(c._id)
                    : String(c);

            const message = typeof c === 'object' && 'message' in c ? (c.message ?? '') : '';
            const sha = typeof c === 'object' && c.githubSha ? String(c.githubSha) : '';
            commitsPayload.push({
                id: cid,
                message,
                shortSha: sha.length >= 7 ? sha.slice(0, 7) : sha || null,
            });

            const repo = typeof c === 'object' ? c.repositoryId : null;
            if (!repositoryFullName && repo && typeof repo === 'object' && repo.fullName) {
                repositoryFullName = repo.fullName;
            }
        }

        return {
            id,
            content: t.content,
            status: t.status,
            metadata: {
                commitCount: t.metadata?.commitCount,
                mainLanguages: t.metadata?.mainLanguages,
            },
            ...(t.isEdited && {
                isEdited: t.isEdited,
                editedAt: t.editedAt,
            }),
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            generatedAt: t.generatedAt,
            postedAt: t.postedAt,
            isAutoGenerated: Boolean(t.isAutoGenerated),
            autoGenerationSource: t.autoGenerationSource || 'manual',
            ...(repositoryFullName && { repositoryFullName }),
            commits: commitsPayload,
        };
    }
}

export default new TweetService();