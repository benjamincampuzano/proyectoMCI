import { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

const normalizeRoleName = (role) => {
    return String(role || '').toUpperCase().replace(/-/g, '_');
};

const normalizeUserRoles = (u) => {
    if (!u) return u;
    if (!Array.isArray(u.roles)) return u;
    return {
        ...u,
        roles: u.roles.map(normalizeRoleName)
    };
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(true);

    useEffect(() => {
        const checkInit = async () => {
            try {
                const res = await api.get('/auth/init-status');
                setIsInitialized(res.data.isInitialized);
            } catch (error) {
                toast.error('Error al verificar inicialización del sistema.');
            }
        };

        checkInit();

        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const res = await api.get('/users/profile');
                    if (res.data.user) {
                        const normalizedUser = normalizeUserRoles(res.data.user);
                        setUser(normalizedUser);
                        localStorage.setItem('user', JSON.stringify(normalizedUser));
                    }
                } catch (error) {
                    toast.error('Error al cargar perfil de usuario.');
                    // If error is 401 or 404 (user not found/stale token), logout
                    if (error.response?.status === 401 || error.response?.status === 404) {
                        logout();
                    } else {
                        // Fallback to stored user if server fails but not 401/404
                        const storedUser = JSON.parse(localStorage.getItem('user'));
                        if (storedUser) setUser(normalizeUserRoles(storedUser));
                    }
                }
            }
            setLoading(false);
        };

        checkAuth();
    }, []);

    const login = async (email, password) => {
        try {
            const res = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', res.data.token);
            const normalizedUser = normalizeUserRoles(res.data.user);
            localStorage.setItem('user', JSON.stringify(normalizedUser));
            setUser(normalizedUser);
            return { success: true, mustChangePassword: res.data.user?.mustChangePassword || false };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Login failed' };
        }
    };

    const changePassword = async (currentPassword, newPassword) => {
        try {
            await api.post('/auth/change-password', { currentPassword, newPassword });
            // Update user state to reflect password change
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const updatedUser = { ...storedUser, mustChangePassword: false };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Error al cambiar contraseña' };
        }
    };

    const register = async (userData) => {
        try {
            const res = await api.post('/auth/register', userData);
            localStorage.setItem('token', res.data.token);
            const normalizedUser = normalizeUserRoles(res.data.user);
            localStorage.setItem('user', JSON.stringify(normalizedUser));
            setUser(normalizedUser);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Registration failed' };
        }
    };

    const setup = async (userData) => {
        try {
            const res = await api.post('/auth/setup', userData);
            localStorage.setItem('token', res.data.token);
            const normalizedUser = normalizeUserRoles(res.data.user);
            localStorage.setItem('user', JSON.stringify(normalizedUser));
            setUser(normalizedUser);
            setIsInitialized(true);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Setup failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const updateProfile = (updatedUser) => {
        const normalizedUser = normalizeUserRoles(updatedUser);
        setUser(normalizedUser);
        localStorage.setItem('user', JSON.stringify(normalizedUser));
    };

    const hasRole = (roleName) => {
        if (!user || !user.roles) return false;
        const normalized = normalizeRoleName(roleName);
        const roles = Array.isArray(user.roles) ? user.roles.map(normalizeRoleName) : [];
        return roles.includes(normalized);
    };

    const hasAnyRole = (roleNames = []) => {
        if (!user || !user.roles) return false;
        const roles = Array.isArray(user.roles) ? user.roles.map(normalizeRoleName) : [];
        return (roleNames || []).some(role => roles.includes(normalizeRoleName(role)));
    };

    const isAdmin = () => {
        return hasRole('ADMIN');
    };

    const isSuperAdmin = () => {
        return isAdmin();
    };

    return (
        <AuthContext.Provider value={{
            user, login, register, setup, logout, updateProfile,
            loading, isInitialized,
            hasRole, hasAnyRole, isAdmin, isSuperAdmin,
            changePassword
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
