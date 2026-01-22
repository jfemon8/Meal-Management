import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                const response = await api.get('/auth/me');
                setUser(response.data);
            } catch (error) {
                localStorage.removeItem('token');
                delete api.defaults.headers.common['Authorization'];
            }
        }
        setLoading(false);
    };

    const login = async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { token, ...userData } = response.data;

        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);

        return userData;
    };

    const register = async (name, email, password, phone) => {
        const response = await api.post('/auth/register', { name, email, password, phone });
        const { token, ...userData } = response.data;

        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);

        return userData;
    };

    const logout = () => {
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
    };

    const updateUser = (userData) => {
        setUser(prev => ({ ...prev, ...userData }));
    };

    // Check if user has required role
    const hasRole = (requiredRole) => {
        if (!user) return false;

        const roleHierarchy = {
            'user': 1,
            'manager': 2,
            'admin': 3,
            'superadmin': 4
        };

        return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
    };

    const value = {
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
        hasRole,
        isManager: user && ['manager', 'admin', 'superadmin'].includes(user.role),
        isAdmin: user && ['admin', 'superadmin'].includes(user.role),
        isSuperAdmin: user && user.role === 'superadmin'
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
