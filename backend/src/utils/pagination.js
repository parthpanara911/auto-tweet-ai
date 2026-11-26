import AppError from "../errors/AppError.js";

/**
 * Parse and validate pagination query parameters.
 * Missing values use defaults; invalid values return HTTP 400.
 */
export function parsePagination(query, { defaultLimit = 10, maxLimit = 50 } = {}) {
    const parsePositiveInteger = (value, field, fallback) => {
        if (value === undefined) return fallback;

        if (
            typeof value !== "string" ||
            !/^[1-9]\d*$/.test(value)
        ) {
            throw new AppError(
                `${field} must be a positive integer`,
                400,
                "INVALID_PAGINATION"
            );
        }

        const parsed = Number(value);

        if (!Number.isSafeInteger(parsed)) {
            throw new AppError(
                `${field} must be a safe integer`,
                400,
                "INVALID_PAGINATION"
            );
        }

        return parsed;
    };

    const page = parsePositiveInteger(query.page, "page", 1);
    const limit = parsePositiveInteger(query.limit, "limit", defaultLimit);

    if (limit > maxLimit) {
        throw new AppError(
            `limit cannot exceed ${maxLimit}`,
            400,
            "INVALID_PAGINATION"
        );
    }

    const skip = (page - 1) * limit;

    if (!Number.isSafeInteger(skip)) {
        throw new AppError(
            "page is too large",
            400,
            "INVALID_PAGINATION"
        );
    }

    return { page, limit };
}