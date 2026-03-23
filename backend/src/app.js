import express from "express";
import cors from "cors";
import passport from "passport";
import "./config/passport.js";
import authRouter from "./routes/auth.js";
import repoRouter from "./routes/repositories.js";
import webhookRouter from "./routes/webhooks.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

app.use(cors());
app.use('/api/webhooks/github/:webhookId', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(passport.initialize());

app.use('/api/auth', authRouter);
app.use('/api/repositories', repoRouter);
app.use('/api/webhooks', webhookRouter);

app.get('/', (req, res) => {
    res.json({ message: "Project running" });
});

app.use(errorHandler);

export default app;