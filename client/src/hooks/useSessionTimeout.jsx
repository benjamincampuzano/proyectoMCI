import { useEffect, useRef, useCallback } from 'react';
import { getMillisecondsUntilExpiration } from '../utils/tokenUtils';
import toast from 'react-hot-toast';
import { getAccessToken } from '../utils/api';

const TOKEN_EXPIRY_WARNING_MINUTES = 5;
const INACTIVITY_TIMEOUT_MINUTES = 30;

const ACTIVITY_EVENTS = [
    'mousemove',
    'keydown',
    'click',
    'scroll',
    'touchstart',
];

export default function useSessionTimeout({ onLogout, onRefreshToken }) {
    const expiryTimerRef = useRef(null);
    const warningTimerRef = useRef(null);
    const inactivityTimerRef = useRef(null);
    const warningShownRef = useRef(false);
    const refreshCallbackRef = useRef(null);

    const clearAllTimers = useCallback(() => {
        if (expiryTimerRef.current) {
            clearTimeout(expiryTimerRef.current);
            expiryTimerRef.current = null;
        }
        if (warningTimerRef.current) {
            clearTimeout(warningTimerRef.current);
            warningTimerRef.current = null;
        }
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
            inactivityTimerRef.current = null;
        }
    }, []);

    const handleLogout = useCallback(() => {
        clearAllTimers();
        toast.error('Tu sesion ha expirado. Por favor, inicia sesion de nuevo.', {
            duration: 5000,
            icon: '🔒',
        });
        onLogout();
    }, [clearAllTimers, onLogout]);

    const resetInactivityTimer = useCallback(() => {
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }

        // El access token vive sólo en memoria: se lee del módulo de API.
        const token = getAccessToken();
        if (!token) return;

        inactivityTimerRef.current = setTimeout(() => {
            toast.error('Sesion cerrada por inactividad.', {
                duration: 5000,
                icon: '💤',
            });
            onLogout();
        }, INACTIVITY_TIMEOUT_MINUTES * 60 * 1000);
    }, [onLogout]);

    const setupExpiryTimer = useCallback(() => {
        clearAllTimers();
        warningShownRef.current = false;

        const token = getAccessToken();
        if (!token) return;

        const msUntilExpiry = getMillisecondsUntilExpiration(token);
        if (msUntilExpiry === null || msUntilExpiry === 0) {
            handleLogout();
            return;
        }

        const msUntilWarning = msUntilExpiry - TOKEN_EXPIRY_WARNING_MINUTES * 60 * 1000;

        if (msUntilWarning > 0) {
            warningTimerRef.current = setTimeout(() => {
                if (warningShownRef.current) return;
                warningShownRef.current = true;

                const minutesLeft = TOKEN_EXPIRY_WARNING_MINUTES;
                toast(
                    (t) => (
                        <div className="flex flex-col gap-2">
                            <span className="font-medium text-yellow-200">
                                Tu sesion expirara en {minutesLeft} minutos.
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        toast.dismiss(t.id);
                                        if (refreshCallbackRef.current) {
                                            refreshCallbackRef.current();
                                        }
                                    }}
                                    className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-500 transition-colors"
                                >
                                    Extender sesion
                                </button>
                                <button
                                    onClick={() => {
                                        toast.dismiss(t.id);
                                        handleLogout();
                                    }}
                                    className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-500 transition-colors"
                                >
                                    Cerrar sesion
                                </button>
                            </div>
                        </div>
                    ),
                    {
                        duration: TOKEN_EXPIRY_WARNING_MINUTES * 60 * 1000,
                        icon: '⚠️',
                        style: {
                            background: '#1a1a2e',
                            color: '#e2e8f0',
                            border: '1px solid #f59e0b',
                            minWidth: '320px',
                        },
                        position: 'top-center',
                    }
                );
            }, msUntilWarning);
        }

        expiryTimerRef.current = setTimeout(() => {
            handleLogout();
        }, msUntilExpiry);
    }, [clearAllTimers, handleLogout]);

    const extendSession = useCallback(async () => {
        try {
            await onRefreshToken();
            warningShownRef.current = false;
            setupExpiryTimer();
            resetInactivityTimer();
            toast.success('Sesion extendida exitosamente.', { duration: 3000 });
        } catch {
            handleLogout();
        }
    }, [onRefreshToken, setupExpiryTimer, resetInactivityTimer, handleLogout]);

    useEffect(() => {
        refreshCallbackRef.current = extendSession;
    }, [extendSession]);

    const handleActivity = useCallback(() => {
        resetInactivityTimer();
    }, [resetInactivityTimer]);

    useEffect(() => {
        // Cuando llega un access token nuevo (login, refresh silencioso o
        // extensión de sesión) se recalculan los temporizadores de caducidad.
        const handleTokenChanged = () => {
            if (!getAccessToken()) {
                clearAllTimers();
                return;
            }
            setupExpiryTimer();
            resetInactivityTimer();
        };

        handleTokenChanged();

        ACTIVITY_EVENTS.forEach((event) => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        window.addEventListener('auth:token-changed', handleTokenChanged);
        window.addEventListener('auth:logout', handleTokenChanged);

        return () => {
            clearAllTimers();
            ACTIVITY_EVENTS.forEach((event) => {
                window.removeEventListener(event, handleActivity);
            });
            window.removeEventListener('auth:token-changed', handleTokenChanged);
            window.removeEventListener('auth:logout', handleTokenChanged);
        };
    }, [setupExpiryTimer, resetInactivityTimer, handleActivity, clearAllTimers]);

    return {
        extendSession,
    };
}
