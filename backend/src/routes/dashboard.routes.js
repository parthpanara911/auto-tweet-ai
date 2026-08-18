import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import DashboardController from "../controllers/dashboard.controller.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

router.use(authMiddleware);

router.get('/summary', asyncHandler((req, res) =>
    DashboardController.getSummary(req, res))
);

export default router;