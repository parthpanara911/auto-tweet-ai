import AppError from "../errors/AppError.js";

export function rateLimit(limiter, keyFn) {
    return async (req, res, next) => {
        const key = keyFn(req);

        try {
            const result = await limiter.consume(key);
            res.set("X-RateLimit-Remaining", String(result.remainingPoints));
            next();
        } catch (rejOrErr) {
            if (rejOrErr instanceof Error) {
                console.error(
                    `[RateLimit] Redis error on key "${key}", failing open:`, rejOrErr.message
                );
                return next();
            }

            const retryAfterSec = Math.max(1, Math.ceil(rejOrErr.msBeforeNext / 1000));
            res.set("Retry-After", String(retryAfterSec));

            next(new AppError(
                "Too many requests, please try again later",
                429,
                "RATE_LIMIT_EXCEEDED"
            ));
        }
    };
}

export const keyByIp = (req) => req.ip;
export const keyByUser = (req) => (req.user?._id ? String(req.user._id) : req.ip);