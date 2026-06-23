import express from "express";
import authMiddleware from "../middleware/auth.js";
import DashboardController from "../controllers/dashboard.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.get('/summary', (req, res, next) =>
    DashboardController.getSummary(req, res, next)
);

export default router;