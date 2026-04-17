import AppError from "../errors/AppError.js";
import { verifyToken } from "../utils/jwt.js";
import User from "../db/models/User.js";

// Supports both Bearer token and cookie-based auth
function extractToken(req) {
    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length).trim()
        : null;

    if (bearerToken) return bearerToken;

    const cookieToken = req.cookies?.access_token ?? null;
    return cookieToken || null;
}

async function authMiddleware(req, res, next) {
    try {
        const token = extractToken(req);

        if (!token) {
            throw new AppError('No token provided', 401, 'TOKEN_MISSING');
        }

        const decoded = verifyToken(token);
        const user = await User.findById(decoded.userId);

        if (!user || !user.isActive) {
            throw new AppError('User not found or inactive', 401, 'USER_INVALID');
        }

        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
}

export default authMiddleware;