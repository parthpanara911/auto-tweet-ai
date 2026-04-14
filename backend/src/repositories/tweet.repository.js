import mongoose from 'mongoose';
import Tweet from "../db/models/Tweet.js";
import AppError from "../errors/AppError.js";

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
            const tweet = await Tweet.findById(tweetId).populate('commitIds');
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
            }).populate('commitIds');

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
                sortBy = 'createdAt',
                sortOrder = -1
            } = options;

            const skip = (page - 1) * limit;

            const query = { userId };

            if (status) {
                query.status = status;
            }

            const tweets = await Tweet.find(query)
                .populate('commitIds')
                .sort({ [sortBy]: sortOrder })
                .skip(skip)
                .limit(limit)
                .lean();

            const total = await Tweet.countDocuments(query);

            return {
                tweets,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
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
                .populate('commitIds')
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

            const tweet = await Tweet.findOneAndUpdate(
                { _id: tweetId, status: 'draft' },
                updateData,
                { new: true }
            ).populate('commitIds').lean();

            return tweet;
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

            const tweet = await Tweet.findOneAndUpdate(
                { _id: tweetId, status: 'draft' },
                {
                    content: newContent,
                    isEdited: true,
                    editedAt: new Date(),
                },
                { new: true }
            ).populate('commitIds').lean();

            return tweet;
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
                { new: true }
            ).populate('commitIds').lean();

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