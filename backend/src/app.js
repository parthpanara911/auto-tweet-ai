import express from "express";
import cors from "cors";
import passport from "passport";
import cookieParser from "cookie-parser";
import "./config/passport.js";
import config from "./config/environment.js";
import authRouter from "./routes/auth.js";
import repoRouter from "./routes/repositories.js";
import webhookRouter from "./routes/webhooks.js";
import commitRouter from "./routes/commits.js";
import tweetRouter from "./routes/tweets.js";
import healthRouter from "./routes/health.js"
import errorHandler from "./middleware/errorHandler.js";

const app = express();

app.set('trust proxy', 1);

app.use(cors({
    origin: 'https://autotweetai.vercel.app',
    credentials: true,
}));

// Required for GitHub webhook signature verification
app.use('/api/webhooks/github', express.raw({
    type: '*/*',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(cookieParser());
app.use(express.json());
app.use(passport.initialize());

app.use('/api/auth', authRouter);
app.use('/api/repositories', repoRouter);
app.use('/api/webhooks', webhookRouter);
app.use('/api/commits', commitRouter);
app.use('/api/tweets', tweetRouter);
app.use('/health', healthRouter);

app.use(errorHandler);

export default app;