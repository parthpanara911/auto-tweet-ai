import express from "express";
import passport from "passport";
import { generateTokens, verifyToken } from "../utils/jwt.js";
import AppError from "../errors/AppError.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback',
    passport.authenticate('github', { session: false }),
    (req, res) => {
        const { accessToken, refreshToken } = generateTokens(req.user._id);

        res.json({
            message: 'Login successful',
            accessToken,
            refreshToken,
            user: req.user
        });
    }
);

router.post('/refresh', (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            throw new AppError('Refresh token required', 400, 'REFRESH_TOKEN_MISSING');
        }

        const decoded = verifyToken(refreshToken, true);
        const { accessToken } = generateTokens(decoded.userId);

        res.json({ accessToken });
    } catch (error) {
        next(error);
    }
});

router.get('/me', authMiddleware, (req, res) => {
    res.json({
        user: {
            id: req.user._id,
            username: req.user.username,
            email: req.user.email,
            avatar: req.user.avatar,
        },
    });
});

router.post('/logout', authMiddleware, async (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

export default router;