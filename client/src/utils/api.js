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
    timeout: 10000, // Timeout de 10 segundos
});

// Add a request interceptor to include the token in all requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
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
    (error) => {
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

        error.userMessage = userMessage;
        return Promise.reject(error);
    }
);

export default api;
