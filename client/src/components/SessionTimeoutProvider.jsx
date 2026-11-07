import { useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import useSessionTimeout from '../hooks/useSessionTimeout';
import { refreshSession, clearAccessToken } from '../utils/api';

export default function SessionTimeoutProvider({ children }) {
    const { user, logout } = useAuth();

    // El refresh se hace con la cookie HttpOnly: no hay token que leer ni guardar.
    const refreshToken = useCallback(async () => {
        const data = await refreshSession();
        return data;
    }, []);

    const handleLogout = useCallback(() => {
        clearAccessToken();
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
