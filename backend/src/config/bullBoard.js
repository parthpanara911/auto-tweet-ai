import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import authMiddleware from '../middleware/auth.js';

export const setupBullBoard = (app, { commitQueue, tweetQueue }) => {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    createBullBoard({
        queues: [
            new BullAdapter(commitQueue),
            new BullAdapter(tweetQueue)
        ],
        serverAdapter,
    });

    app.use('/admin/queues', authMiddleware, serverAdapter.getRouter());
};