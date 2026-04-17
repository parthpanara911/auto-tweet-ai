export const setupTestRoutes = (app, { commitQueue, tweetQueue }) => {
    app.get('/test-commit', async (req, res) => {
        const { sha, repoId, userId } = req.query;
        if (!sha || !repoId || !userId) {
            return res.status(400).send('Missing parameters');
        }

        await commitQueue.add('commit-processing', {
            commitSha: sha,
            repositoryId: repoId,
            userId,
            payload: { timestamp: new Date().toISOString() }
        });

        res.send('Commit test job added');
    });

    app.get('/test-tweet', async (req, res) => {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).send('Missing userId');
        }

        await tweetQueue.add('tweet-generation', {
            userId,
            triggerType: 'manual'
        });

        res.send('Tweet generation job added');
    });
};