import Repository from "../db/models/Repository.js";
import TweetRepository from "../repositories/tweet.repository.js";


class DashboardService {
    async getSummary(userId) {
        const [totalRepositories, trackedRepositoriesCount, trackedRepositories, tweetStats] =
            await Promise.all([
                Repository.countDocuments({
                    userId,
                    isPrivate: false
                }),

                Repository.countDocuments({
                    userId,
                    isTracking: true
                }),

                Repository.find({
                    userId,
                    isTracking: true
                })
                    .select('_id name fullName')
                    .sort({ name: 1 })
                    .lean(),

                TweetRepository.getStats(userId)
            ]);

        return {
            system: {
                trackingStatus:
                    trackedRepositoriesCount > 0
                        ? "Active"
                        : "Inactive",
                autoTweetEnabled: true,
            },

            repositories: {
                total: totalRepositories,
                tracked: trackedRepositoriesCount,
                trackedRepositories: trackedRepositories.map(repo => ({
                    id: repo._id.toString(),
                    name: repo.name,
                    fullName: repo.fullName
                }))
            },

            tweets: {
                total:
                    tweetStats.draft +
                    tweetStats.approved +
                    tweetStats.posted +
                    tweetStats.rejected,

                draft: tweetStats.draft,
                approved: tweetStats.approved,
                rejected: tweetStats.rejected,
                posted: tweetStats.posted,
            }
        };
    }
}

export default new DashboardService();