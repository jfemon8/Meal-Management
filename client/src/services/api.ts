import axios, { AxiosInstance } from 'axios';

const api: AxiosInstance = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests if available
const token = localStorage.getItem('token');
if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Function to set authorization token
export const setAuthToken = (token: string | null) => {
    if (token) {
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
    }
};

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            setAuthToken(null);
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
