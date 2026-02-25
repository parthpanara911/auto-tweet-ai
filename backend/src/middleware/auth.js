import { User } from "../db/models/User";
import AppError from "../errors/AppError.js";
import { verifyToken } from "../utils/jwt.js";
import User from "../db/models/User.js";

async function authMiddleware(req, res, next) {
    try {
        const token = req.headers.authorization?.split(' ')?.[1] ?? null;

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