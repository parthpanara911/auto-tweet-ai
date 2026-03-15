class WebhookEventService {
    /**
     * Extract commits from github webhook payload
     */
    static extractCommits(payload) {
        try {
            if (!this._isValidPayload(payload)) {
                return [];
            }

            if (!payload.commits || payload.commits.length === 0) {
                return [];
            }

            const repoInfo = {
                repositoryId: payload.repository.id,
                fullName: payload.repository.full_name,
                owner: payload.repository.owner.login,
                name: payload.repository.name,
                branch: payload.ref?.replace("refs/heads/", "")
            };

            const normalizedCommits = payload.commits.map((commit) =>
                this._normalizeCommit(commit, repoInfo)
            );

            return normalizedCommits;
        } catch (error) {
            console.error('[WebhookEvent] Error extracting commits:', error);
            return [];
        }
    }

    /**
     * Normalize commit from github format to our format
     */
    static _normalizeCommit(commit, repoInfo) {
        try {
            return {
                repositoryId: repoInfo.repositoryId,
                repoFullName: repoInfo.fullName,
                branch: repoInfo.branch,
                githubSha: commit.id || commit.sha,
                message: commit.message || '',
                authorName: commit.author?.name || 'Unknown',
                authorEmail: commit.author?.email || 'unknown@example.com',
                url: commit.url || '',
                timestamp: commit.timestamp ? new Date(commit.timestamp) : new Date()
            };
        } catch (error) {
            console.error('[WebhookEvent] Error normalizing commit:', error);
            return null;
        }
    }

    /**
     * Validate webhook payload structure
     */
    static _isValidPayload(payload) {
        if (!payload || !payload.repository || !payload.commits) {
            return false;
        }
        if (!payload.repository.full_name || !payload.repository.owner) {
            return false;
        }
        return true;
    }
}

export default WebhookEventService;