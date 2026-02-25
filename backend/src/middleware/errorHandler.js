import AppError from "../errors/AppError.js";

function errorHandler(err, req, res, next) {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json(err.toJSON());
    }

    console.log("Unexpected error:", err);
    return res.status(500).json({
        error: {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
            statusCode: 500,
        },
    });
}

export default errorHandler;