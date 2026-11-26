import CommitService from "../services/commit.service.js";
import { parsePagination } from "../utils/pagination.js";

class CommitController {
    async getUserCommits(req, res) {
        const userId = req.user._id;
        const { tweeted, isProcessed, repositoryId } = req.query;

        const { page, limit } = parsePagination(req.query, {
            defaultLimit: 10,
            maxLimit: 100
        });

        const { commits, pagination } = await CommitService.listUserCommits(userId, {
            page,
            limit,
            tweeted,
            isProcessed,
            repositoryId,
        });

        res.json({
            status: 'success',
            data: commits,
            pagination
        });
    }

    async getCommitById(req, res) {
        const commit = await CommitService.getCommitById(req.params.commitId, req.user._id);

        res.json({
            status: 'success',
            data: commit
        });
    }
}

export default new CommitController();