import axios from 'axios';

// Forzar localhost en desarrollo para evitar problemas con producción
const baseURL = import.meta.env.DEV
    ? 'http://localhost:5000'  // Siempre localhost en desarrollo
    : (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// Solo mostrar configuración en desarrollo si se necesita
if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_API) {
    console.log('🔗 API Configuration:', {
        mode: import.meta.env.MODE,
        isDev: import.meta.env.DEV,
        baseURL: baseURL,
        envURL: import.meta.env.VITE_API_URL
    });
}

const api = axios.create({
    baseURL: `${baseURL}/api`,
    timeout: 300000, // Timeout de 5 minutos para operaciones largas
    // Imprescindible para que el navegador envíe la cookie HttpOnly del refresh token.
    withCredentials: true,
});

/* ================================================================
 * ACCESS TOKEN: SOLO EN MEMORIA
 * ------------------------------------------------------------
 * El access token (JWT de 30 min) no se persiste en localStorage ni
 * sessionStorage: un XSS no puede leerlo de la memoria del navegador
 * de forma persistente. El refresh token viaja en una cookie HttpOnly
 * y se usa para obtener un access token nuevo de forma silenciosa.
 * ================================================================ */

let accessToken = null;

export const setAccessToken = (token) => {
    accessToken = token || null;
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:token-changed', { detail: { token: accessToken } }));
    }
};

export const getAccessToken = () => accessToken;

export const clearAccessToken = () => setAccessToken(null);

/* ================================================================
 * SOPORTE PARA LA SUITE E2E (sólo desarrollo)
 * ------------------------------------------------------------
 * La suite E2E necesita reutilizar un access token ya emitido en
 * muchos contextos de navegador. Como la cookie del refresh token es
 * de un solo uso (rota en cada refresco) y el login está limitado por
 * tasa, la suite inyecta el token por esta vía en lugar de repetir
 * el login en cada test.
 *
 * `import.meta.env.DEV` es false en producción: Vite elimina este
 * bloque del bundle final, así que no existe en el código desplegado.
 * ================================================================ */
if (import.meta.env.DEV && typeof window !== 'undefined' && window.__E2E_ACCESS_TOKEN__) {
    accessToken = window.__E2E_ACCESS_TOKEN__;
}

/* ================================================================
 * TOKEN CSRF (patrón "double submit")
 * ------------------------------------------------------------
 * La cookie `csrfToken` es legible por JS a propósito; el servidor
 * valida su firma HMAC y que coincida con la cabecera X-CSRF-Token.
 * ================================================================ */

const CSRF_COOKIE_NAME = 'csrfToken';

export const getCsrfToken = () => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]*)`));
    if (!match) return null;
    try {
        return decodeURIComponent(match[1]);
    } catch {
        return match[1];
    }
};

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

// Flag para evitar múltiples refresh simultáneos
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, data = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(data);
        }
    });
    failedQueue = [];
};

/**
 * Serializa los refrescos entre pestañas del mismo origen.
 * La cookie del refresh token se comparte entre pestañas, así que sin este
 * bloqueo dos pestañas que recargan a la vez consumption el mismo token y la
 * segunda invalidaría la sesión (detección de reutilización).
 */
const withRefreshLock = async (fn) => {
    if (typeof navigator !== 'undefined' && navigator.locks?.request) {
        return navigator.locks.request('auth-refresh', fn);
    }
    return fn();
};

/**
 * Refresco silencioso: pide un access token nuevo usando la cookie HttpOnly.
 * @returns {Promise<{token: string, csrfToken?: string}>}
 */
export const refreshSession = async () => {
    if (isRefreshing) {
        // Ya hay un refresco en curso: se espera al resultado.
        return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
        });
    }

    isRefreshing = true;

    try {
        const data = await withRefreshLock(async () => {
            const csrfToken = getCsrfToken();
            const { data: payload } = await axios.post(
                `${baseURL}/api/auth/refresh-token`,
                {},
                {
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'application/json',
                        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
                    },
                }
            );
            return payload;
        });

        setAccessToken(data.token);
        processQueue(null, data);
        return data;
    } catch (error) {
        processQueue(error, null);
        throw error;
    } finally {
        isRefreshing = false;
    }
};

// Add a request interceptor to include the token in all requests
api.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Token CSRF en las peticiones que modifican estado.
        const method = (config.method || 'get').toUpperCase();
        if (!SAFE_METHODS.includes(method)) {
            const csrfToken = getCsrfToken();
            if (csrfToken) {
                config.headers['X-CSRF-Token'] = csrfToken;
            }
        }

        // Debug en desarrollo solo si está habilitado
        if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_API) {
            console.log(`🌐 ${config.method?.toUpperCase()} ${config.url}`, {
                baseURL: config.baseURL,
                fullURL: `${config.baseURL}${config.url}`,
                hasToken: !!token
            });
        }

        return config;
    },
    (error) => {
        console.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        // Debug en desarrollo solo si está habilitado
        if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_API) {
            console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, {
                status: response.status,
                data: response.data
            });
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        const messageFromApi = error?.response?.data?.message;
        const messageFromNetwork = error?.message;
        const userMessage = messageFromApi || messageFromNetwork || 'Error inesperado';

        // Debug mejorado en desarrollo solo si está habilitado
        if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_API) {
            console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
                status: error.response?.status,
                statusText: error.response?.statusText,
                message: messageFromApi,
                baseURL: error.config?.baseURL,
                fullURL: `${error.config?.baseURL}${error.config?.url}`
            });
        }

        // Rutas de autenticación: un 401 aquí es un fallo de credenciales,
        // no una sesión caducada. No se intenta refrescar (evita bucles).
        const authUrl = originalRequest?.url || '';
        const isAuthEndpoint = /\/auth\/(login|register|setup|refresh-token|init-status)/.test(authUrl);

        // Manejar token expirado (401) - intentar refresh con la cookie
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
            originalRequest._retry = true;

            try {
                const data = await refreshSession();
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers.Authorization = `Bearer ${data.token}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Sin sesión válida: se limpia el estado y se vuelve al login.
                clearAccessToken();
                localStorage.removeItem('user');

                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }

                return Promise.reject(refreshError);
            }
        }

        // Si el servidor indica que se requiere cambio obligatorio de contraseña (403 mustChangePassword)
        if (error.response?.status === 403 && error.response?.data?.mustChangePassword) {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('auth:must-change-password'));
            }
        }

        error.userMessage = userMessage;
        return Promise.reject(error);
    }
);

export default api;

// Origen del servidor (solo API) para construir URLs absolutas de medios subidos
export const mediaOrigin = baseURL;

// Convierte una URL de medio (relativa tipo /media/archivo o externa) en una URL absoluta
export const resolveMediaUrl = (url) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/media/')) return `${baseURL}${url}`;
    return url;
};
