import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import DashboardController from "../controllers/dashboard.controller.js";
import asyncHandler from "../utils/asyncHandler.js";
import { rateLimit, keyByUser } from "../middleware/rate-limit.js";
import { generalApiLimiter } from "../config/rate-limiters.js";

const router = Router();

router.use(authMiddleware);

router.get('/summary', rateLimit(generalApiLimiter, keyByUser), asyncHandler((req, res) =>
    DashboardController.getSummary(req, res))
);

export default router;