import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../services/apiClient.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const exchanged = useRef(false);
    const { refreshSession } = useAuth();

    useEffect(() => {
        if (exchanged.current) return;
        exchanged.current = true;

        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error || !code) {
            navigate('/?error=auth_failed', { replace: true });
            return;
        }

        // Exchange the one-time code for cookies
        (async () => {
            try {
                await apiClient.get(`/api/auth/exchange?code=${code}`);

                await refreshSession();

                navigate('/dashboard', { replace: true });
            } catch {
                navigate('/?error=auth_failed', { replace: true });
            }
        })();
    }, []);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-950">
            <div className="text-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Signing you in...</p>
            </div>
        </div>
    );
}