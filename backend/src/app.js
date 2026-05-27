import express from "express";
import cors from "cors";
import passport from "passport";
import cookieParser from "cookie-parser";
import "./config/passport.js";
import authRouter from "./routes/auth.js";
import repoRouter from "./routes/repositories.js";
import webhookRouter from "./routes/webhooks.js";
import commitRouter from "./routes/commits.js";
import tweetRouter from "./routes/tweets.js";
import healthRouter from "./routes/health.js"
import errorHandler from "./middleware/errorHandler.js";

const app = express();

const allowedOrigins = [
    'http://localhost:5173',
    'https://autotweetai.vercel.app',
];

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
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