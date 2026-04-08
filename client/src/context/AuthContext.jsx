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
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const checkInit = async () => {
            try {
                const res = await api.get('/auth/init-status');
                setIsInitialized(res.data.isInitialized);
                // Store the initialization status for fallback
                localStorage.setItem('systemInitialized', res.data.isInitialized.toString());
            } catch (error) {
                // Silently handle network errors (server not available)
                if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
                    // Check if we have stored the initialization status
                    const storedInitStatus = localStorage.getItem('systemInitialized');
                    if (storedInitStatus !== null) {
                        const isStoredInitialized = storedInitStatus === 'true';
                        setIsInitialized(isStoredInitialized);
                    } else {
                        setIsInitialized(false); // Default to false when server is unavailable
                    }
                } else {
                    console.error('Error checking init status:', error);
                    toast.error('Error al verificar inicialización del sistema.');
                    setIsInitialized(false); // Default to false on error
                }
            }
        };

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
                    // Silently handle network errors (server not available)
                    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
                        // console.log('Server not available - using stored user data');
                        // Fallback to stored user if server fails
                        const storedUser = JSON.parse(localStorage.getItem('user'));
                        if (storedUser) setUser(normalizeUserRoles(storedUser));
                    } else {
                        console.error('Auth check error:', error);
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
            }
            setLoading(false);
        };

        checkInit();
        checkAuth();
    }, []);

    const login = async (email, password) => {
        try {
            const res = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('refreshToken', res.data.refreshToken);
            const normalizedUser = normalizeUserRoles(res.data.user);
            localStorage.setItem('user', JSON.stringify(normalizedUser));
            setUser(normalizedUser);
            return { success: true, mustChangePassword: res.data.user?.mustChangePassword || false };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Error al iniciar sesión' };
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
            localStorage.setItem('refreshToken', res.data.refreshToken);
            const normalizedUser = normalizeUserRoles(res.data.user);
            localStorage.setItem('user', JSON.stringify(normalizedUser));
            setUser(normalizedUser);
            return { success: true, mustChangePassword: res.data.user?.mustChangePassword || false };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Registration failed' };
        }
    };

    const setup = async (userData) => {
        try {
            const res = await api.post('/auth/setup', userData);
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('refreshToken', res.data.refreshToken);
            const normalizedUser = normalizeUserRoles(res.data.user);
            localStorage.setItem('user', JSON.stringify(normalizedUser));
            setUser(normalizedUser);
            setIsInitialized(true);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Setup failed' };
        }
    };

    const logout = async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        
        try {
            if (refreshToken) {
                await api.post('/auth/logout', { refreshToken });
            }
        } catch (error) {
            console.error('Logout API error:', error);
        }

        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setUser(null);
        
        const checkInitAfterLogout = async () => {
            try {
                const res = await api.get('/auth/init-status');
                setIsInitialized(res.data.isInitialized);
            } catch (error) {
                if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
                    // console.log('Server not available - skipping init status check after logout');
                    setIsInitialized(false);
                } else {
                    console.error('Error checking init status after logout:', error);
                }
            }
        };
        checkInitAfterLogout();
    };

    const getSessions = async () => {
        try {
            const res = await api.get('/auth/sessions');
            return res.data;
        } catch (error) {
            console.error('Get sessions error:', error);
            return [];
        }
    };

    const logoutAll = async () => {
        try {
            await api.post('/auth/logout-all');
            logout();
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Error al cerrar sesiones' };
        }
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

    const isCoordinator = (moduleName) => {
        if (!user) return false;
        if (user.isCoordinator) return true;
        if (!moduleName) return user.isCoordinator || (user.moduleCoordinations && user.moduleCoordinations.length > 0);
        return user.moduleCoordinations?.some(m => m.toLowerCase() === moduleName.toLowerCase());
    };

    const isTreasurer = (moduleName) => {
        if (!user) return false;
        if (!moduleName) return user.isModuleTreasurer;
        return user.moduleTreasurers?.some(m => m.toLowerCase() === moduleName.toLowerCase());
    };

    return (
        <AuthContext.Provider value={{
            user, login, register, setup, logout, updateProfile,
            loading, isInitialized,
            hasRole, hasAnyRole, isAdmin, isSuperAdmin, isCoordinator, isTreasurer,
            changePassword, getSessions, logoutAll
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
