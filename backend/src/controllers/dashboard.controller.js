import DashboardService from "../services/dashboard.service.js";

class DashboardController {
    async getSummary(req, res) {
        const summary = await DashboardService.getSummary(req.user._id);

        return res.json({
            status: "success",
            data: summary,
        });
    }
}

export default new DashboardController();