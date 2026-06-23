import DashboardService from "../services/dashboard.service.js";

class DashboardController {
    async getSummary(req, res, next) {
        try {
            const summary = await DashboardService.getSummary(req.user._id);

            return res.json({
                status: "success",
                data: summary,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new DashboardController();