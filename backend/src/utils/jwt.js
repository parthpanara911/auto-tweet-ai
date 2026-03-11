import jwt from "jsonwebtoken";
import config from "../config/environment.js";
import AppError from "../errors/AppError.js";

function generateTokens(userId) {
    const accessToken = jwt.sign(
        { userId },
        config.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
        { userId },
        config.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
}

function verifyToken(token, isRefresh = false) {
    try {
        const secret = isRefresh ? config.JWT_REFRESH_SECRET : config.JWT_ACCESS_SECRET;
        return jwt.verify(token, secret);
    } catch (error) {
        throw new AppError('Invalid or expired token', 401, 'TOKEN_INVALID');
    }
}

export { generateTokens, verifyToken };