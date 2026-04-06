export const setupTestRoutes = (app, queue) => {
    app.get('/test-commit', async (req, res) => {
        const { sha, repoId, userId } = req.query;
        if (!sha || !repoId || !userId) {
            return res.status(400).send('Missing parameters');
        }

        await queue.add('commit-processing', {
            commitSha: sha,
            repositoryId: repoId,
            userId,
            payload: { timestamp: new Date().toISOString() }
        });

        res.send('Test job added');
    });
};