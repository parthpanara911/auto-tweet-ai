import AppError from "../errors/AppError.js";

function errorHandler(err, req, res, next) {
    const isOperational = err instanceof AppError;
    const statusCode = isOperational ? err.statusCode : 500;

    const context = {
        method: req.method,
        path: req.originalUrl,
        userId: req.user?._id?.toString(),
        code: err.code || 'INTERNAL_ERROR',
        message: err.message,
    };

    if (isOperational && statusCode < 500) {
        console.warn('[Error]', context);
    } else {
        console.error('[Error]', { ...context, stack: err.stack });
    }

    if (isOperational) {
        return res.status(statusCode).json(err.toJSON());
    }

    return res.status(500).json({
        error: {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
            statusCode: 500,
        },
    });
}

export default errorHandler;