import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

export const setupBullBoard = (app, queue) => {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    createBullBoard({
        queues: [new BullAdapter(queue)],
        serverAdapter,
    });

    app.use('/admin/queues', serverAdapter.getRouter());
};