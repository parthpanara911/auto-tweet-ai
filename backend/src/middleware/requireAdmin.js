import AppError from "../errors/AppError.js";

export default function requireAdmin(req, res, next) {
    if (req.user?.role !== "admin") {
        return next(new AppError("Forbidden", 403, "ADMIN_ONLY"));
    }
    next();
}