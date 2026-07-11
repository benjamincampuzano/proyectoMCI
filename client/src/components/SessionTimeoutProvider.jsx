import { useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import useSessionTimeout from '../hooks/useSessionTimeout';
import axios from 'axios';

const baseURL = import.meta.env.DEV
    ? 'http://localhost:5000'
    : (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export default function SessionTimeoutProvider({ children }) {
    const { user, logout } = useAuth();

    const refreshToken = useCallback(async () => {
        const storedRefreshToken = localStorage.getItem('refreshToken');
        if (!storedRefreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(
            `${baseURL}/api/auth/refresh-token`,
            { refreshToken: storedRefreshToken },
            { headers: { 'Content-Type': 'application/json' } }
        );

        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        return data;
    }, []);

    const handleLogout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        logout();
    }, [logout]);

    const { extendSession } = useSessionTimeout({
        onLogout: handleLogout,
        onRefreshToken: refreshToken,
    });

    useEffect(() => {
        if (!user) return;

        const handleKeyDown = (e) => {
            if (
                e.shiftKey &&
                e.key === 'S' &&
                e.ctrlKey
            ) {
                e.preventDefault();
                extendSession();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [user, extendSession]);

    if (!user) return children;

    return children;
}
