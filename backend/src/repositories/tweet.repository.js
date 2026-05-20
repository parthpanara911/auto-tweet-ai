import mongoose from 'mongoose';
import Tweet from "../db/models/Tweet.js";
import Commit from "../db/models/Commit.js";
import AppError from "../errors/AppError.js";

/** Deep populate for tweet listings and detail responses (repository name + commit lines for UI). */
export const TWEET_COMMIT_POPULATE = {
    path: 'commitIds',
    select: 'message githubSha url repositoryId',
    populate: { path: 'repositoryId', select: 'fullName' },
};

class TweetRepository {
    async create(tweetData) {
        try {
            const tweet = new Tweet(tweetData);
            await tweet.save();
            return tweet;
        } catch (error) {
            console.error('[TweetRepo] Create failed:', error.message);
            throw new AppError('Failed to create tweet in database', 500, 'TWEET_CREATE_FAILED');
        }
    }

    async findById(tweetId) {
        try {
            const tweet = await Tweet.findById(tweetId).populate(TWEET_COMMIT_POPULATE);
            return tweet;
        } catch (error) {
            console.error(`[TweetRepo] FindById failed for ${tweetId}:`, error.message);
            throw new AppError('Error retrieving tweet data', 400, 'TWEET_QUERY_ERROR');
        }
    }

    async findByIdAndUser(tweetId, userId) {
        try {
            const tweet = await Tweet.findOne({
                _id: tweetId,
                userId,
            }).populate(TWEET_COMMIT_POPULATE);

            return tweet;
        } catch (error) {
            console.error(`[TweetRepo] FindByIdAndUser failed:`, { tweetId, userId, error: error.message });
            throw new AppError('Error fetching user tweet', 400, 'TWEET_FETCH_ERROR');
        }
    }

    async findByUserId(userId, options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                status = null,
                search = '',
                sortBy = 'createdAt',
                sortOrder = -1
            } = options;

            const pageNum = Math.max(1, Number(page) || 1);
            const limitNum = Math.min(50, Math.max(1, Number(limit) || 10));
            const skip = (pageNum - 1) * limitNum;
            const searchTerm = String(search || '').trim();

            const query = { userId: new mongoose.Types.ObjectId(userId) };
            if (status) query.status = status;

            const latestWindowLimit = 50;
            const windowPipeline = [
                { $match: query },
                { $sort: { [sortBy]: sortOrder } },
                { $limit: latestWindowLimit },
            ];

            if (searchTerm) {
                const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escaped, 'i');
                windowPipeline.push(
                    {
                        $lookup: {
                            from: 'commits',
                            localField: 'commitIds',
                            foreignField: '_id',
                            as: 'commitDocs',
                        },
                    },
                    {
                        $lookup: {
                            from: 'repositories',
                            localField: 'commitDocs.repositoryId',
                            foreignField: '_id',
                            as: 'repoDocs',
                        },
                    },
                    {
                        $match: {
                            $or: [
                                { content: regex },
                                { status: regex },
                                { 'repoDocs.fullName': regex },
                            ],
                        },
                    }
                );
            }

            const [result] = await Tweet.aggregate([
                ...windowPipeline,
                {
                    $facet: {
                        items: [
                            { $skip: skip },
                            { $limit: limitNum },
                            { $project: { commitDocs: 0, repoDocs: 0 } },
                        ],
                        totalCount: [{ $count: 'count' }],
                    },
                },
            ]);

            const rawTweets = Array.isArray(result?.items) ? result.items : [];
            const tweetIds = rawTweets.map((t) => t._id);

            const populatedTweets = await Tweet.find({ _id: { $in: tweetIds } })
                .populate(TWEET_COMMIT_POPULATE)
                .lean();

            const tweetsById = new Map(populatedTweets.map((t) => [String(t._id), t]));
            const tweets = rawTweets
                .map((row) => tweetsById.get(String(row._id)))
                .filter(Boolean);

            const total = result.totalCount?.[0]?.count || 0;

            return {
                tweets,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.max(1, Math.ceil(total / limitNum)),
                },
            };
        } catch (error) {
            console.error(`[TweetRepo] FindByUser failed for ${userId}:`, error.message);
            throw new AppError('Could not retrieve user tweets', 500, 'USER_TWEETS_FETCH_ERROR');
        }
    }

    async findDrafts(userId) {
        try {
            const tweets = await Tweet.find({
                userId,
                status: 'draft',
            })
                .populate(TWEET_COMMIT_POPULATE)
                .sort({ createdAt: -1 })
                .lean();

            return tweets;
        } catch (error) {
            console.error(`[TweetRepo] FindDrafts failed for user ${userId}:`, error.message);
            throw new AppError('Error loading draft tweets', 500, 'DRAFTS_FETCH_FAILED');
        }
    }

    async findByStatus(status) {
        try {
            const tweets = await Tweet.find({ status }).sort({ createdAt: -1 });
            return tweets;
        } catch (error) {
            console.error(`[TweetRepo] FindByStatus failed for ${status}:`, error.message);
            throw new AppError('Error filtering tweets by status', 400, 'STATUS_QUERY_ERROR');
        }
    }

    async updateStatus(tweetId, newStatus) {
        try {
            const validStatuses = ['draft', 'approved', 'posted', 'rejected'];

            if (!validStatuses.includes(newStatus)) {
                throw new AppError(
                    `Invalid status: ${newStatus}`,
                    400,
                    'INVALID_TWEET_STATUS'
                );
            }

            const updateData = {
                status: newStatus,
                ...(newStatus === 'posted' && { postedAt: new Date() }),
            };

            const updated = await Tweet.findByIdAndUpdate(
                { _id: tweetId, status: 'draft' },
                updateData,
                { returnDocument: 'after' }
            ).lean();

            if (!updated) {
                throw new AppError(
                    'Tweet not found',
                    404,
                    'TWEET_NOT_FOUND'
                );
            }

            return Tweet.findById(tweetId)
                .populate(TWEET_COMMIT_POPULATE)
                .lean();
        } catch (error) {
            console.error('[TweetRepo] updateStatus failed', {
                tweetId,
                newStatus,
                error: error.message,
            });

            if (error instanceof AppError) throw error;

            throw new AppError(
                'Failed to update tweet status',
                500,
                'TWEET_STATUS_UPDATE_FAILED'
            );
        }
    }

    async updateContent(tweetId, newContent) {
        try {
            if (!newContent || !newContent.trim()) {
                throw new AppError(
                    'Tweet content cannot be empty',
                    400,
                    'EMPTY_TWEET_CONTENT'
                );
            }

            if (newContent.length > 280) {
                throw new AppError(
                    'Tweet content exceeds 280 characters',
                    400,
                    'TWEET_TOO_LONG'
                );
            }

            const updated = await Tweet.findOneAndUpdate(
                { _id: tweetId, status: 'draft' },
                {
                    content: newContent,
                    isEdited: true,
                    editedAt: new Date(),
                },
                { returnDocument: 'after' }
            ).lean();

            if (!updated) {
                throw new AppError(
                    'Tweet not found or not in draft status',
                    404,
                    'TWEET_CONTENT_UPDATE_NOT_FOUND'
                );
            }

            return Tweet.findById(tweetId).populate(TWEET_COMMIT_POPULATE).lean();
        } catch (error) {
            console.error('[TweetRepo] updateContent failed', {
                tweetId,
                contentLength: newContent?.length,
                error: error.message,
            });

            if (error instanceof AppError) throw error;

            throw new AppError(
                'Failed to update tweet content',
                500,
                'TWEET_CONTENT_UPDATE_FAILED'
            );
        }
    }

    async delete(tweetId) {
        try {
            const result = await Tweet.findByIdAndDelete(tweetId);
            return result;
        } catch (error) {
            console.error(`[TweetRepo] Delete failed for ${tweetId}:`, error.message);
            throw new AppError('Could not delete tweet', 500, 'TWEET_DELETE_FAILED');
        }
    }

    async updateTwitterMetadata(tweetId, twitterData) {
        try {
            const tweet = await Tweet.findByIdAndUpdate(
                tweetId,
                {
                    'twitterMetadata.tweetId': twitterData.tweetId,
                    'twitterMetadata.url': twitterData.url,
                    status: 'posted',
                    postedAt: new Date(),
                },
                { returnDocument: 'after' }
            ).populate(TWEET_COMMIT_POPULATE).lean();

            if (tweet?.commitIds?.length) {
                const commitIds = tweet.commitIds.map((c) => c._id);
                await Commit.updateMany(
                    { _id: { $in: commitIds } },
                    { tweeted: true, tweetId: tweet._id }
                );
            }

            return tweet;
        } catch (error) {
            console.error(`[TweetRepo] Metadata update failed for ${tweetId}:`, error.message);
            throw new AppError('Failed to save Twitter post details', 500, 'TWEET_METADATA_UPDATE_FAILED');
        }
    }

    async getStats(userId) {
        try {
            const stats = await Tweet.aggregate([
                {
                    $match: {
                        userId: new mongoose.Types.ObjectId(userId)
                    },
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                    },
                },
            ]);

            const formattedStats = {
                draft: 0,
                approved: 0,
                posted: 0,
                rejected: 0,
            };

            stats.forEach((stat) => {
                if (formattedStats.hasOwnProperty(stat._id)) {
                    formattedStats[stat._id] = stat.count;
                }
            });

            return formattedStats;
        } catch (error) {
            console.error('[TweetRepo] getStats failed', {
                userId,
                error: error.message,
            });
            throw new AppError(
                'Failed to fetch tweet stats',
                500,
                'TWEET_STATS_FETCH_FAILED'
            );
        }
    }
}

export default new TweetRepository();