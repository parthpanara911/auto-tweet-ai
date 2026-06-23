import { useState, useEffect } from "react";
import { apiClient } from "../services/apiClient.js";

export function useDashboardSummary() {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                setLoading(true);
                const response = await apiClient.get("/api/dashboard/summary");
                setSummary(response.data);
            } catch (error) {
                setError(error);
            } finally {
                setLoading(false);
            }
        };

        fetchSummary();
    }, []);

    return {
        summary,
        loading,
        error,
    };
}