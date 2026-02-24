class AppError extends Error {
    constructor(message, statusCode, code = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.timestamp = new Date();

        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            error: {
                message: this.message,
                code: this.code,
                statusCode: this.statusCode,
                timestamp: this.timestamp,
            },
        };
    }
}

export default AppError;