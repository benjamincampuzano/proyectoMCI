import axios from 'axios';
console.log("API URL:", import.meta.env.VITE_API_URL);

const baseURL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const api = axios.create({
    baseURL: `${baseURL}/api`,
});

// Add a request interceptor to include the token in all requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const messageFromApi = error?.response?.data?.message;
        const messageFromNetwork = error?.message;
        const userMessage = messageFromApi || messageFromNetwork || 'Error inesperado';

        error.userMessage = userMessage;

        return Promise.reject(error);
    }
);

export default api;
