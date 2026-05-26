import express from "express";

const router = express.Router();

router.get("/", async (req, res) => {
    res.status(200).json({
        status: "ok",
        service: "AutoTweetAI API",
    });
});

export default router;