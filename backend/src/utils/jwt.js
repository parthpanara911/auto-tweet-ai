import jwt from "jsonwebtoken";
import AppError from "../errors/AppError.js";

function generateTokens(userId) {
    const accessToken = jwt.sign(
        { userId },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
        { userId },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
}

function verifyToken(token, isRefresh = false) {
    try {
        const secret = isRefresh ? process.env.REFRESH_TOKEN_SECRET : process.env.ACCESS_TOKEN_SECRET;
        return jwt.verify(token, secret);
    } catch (error) {
        throw new AppError('Invalid or expired token', 401, 'TOKEN_INVALID');
    }
}

export { generateTokens, verifyToken };