import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { commitProcessingQueue, tweetGenerationQueue } from "../queue/bull.js";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
    queues: [
        new BullAdapter(commitProcessingQueue),
        new BullAdapter(tweetGenerationQueue),
    ],
    serverAdapter,
    options: {
        uiConfig: {
            boardTitle: "AutoTweetAI Jobs",
            pollingInterval: {
                forceInterval: 5
            }
        }
    }
});

export { serverAdapter };