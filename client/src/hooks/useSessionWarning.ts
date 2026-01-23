import { useEffect, useState, useCallback } from 'react';

interface DecodedToken {
    id: string;
    exp: number;
    iat: number;
}

/**
 * Decode JWT token (simple implementation)
 * In production, consider using jwt-decode library
 */
const decodeToken = (token: string): DecodedToken | null => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};

/**
 * Hook to detect when session is about to expire
 * Shows warning 2 minutes before access token expires
 */
export const useSessionWarning = (warningTimeBeforeExpiry: number = 2 * 60 * 1000) => {
    const [showWarning, setShowWarning] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    const checkExpiry = useCallback(() => {
        const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('token');

        if (!accessToken) {
            setShowWarning(false);
            setTimeLeft(null);
            return;
        }

        const decoded = decodeToken(accessToken);

        if (!decoded || !decoded.exp) {
            setShowWarning(false);
            setTimeLeft(null);
            return;
        }

        const expiresAt = decoded.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        const timeLeftMs = expiresAt - now;

        setTimeLeft(timeLeftMs);

        // Show warning if token will expire soon but hasn't expired yet
        if (timeLeftMs < warningTimeBeforeExpiry && timeLeftMs > 0) {
            setShowWarning(true);
        } else {
            setShowWarning(false);
        }
    }, [warningTimeBeforeExpiry]);

    useEffect(() => {
        // Check immediately
        checkExpiry();

        // Check every 10 seconds
        const interval = setInterval(checkExpiry, 10000);

        return () => clearInterval(interval);
    }, [checkExpiry]);

    const dismissWarning = useCallback(() => {
        setShowWarning(false);
    }, []);

    const formatTimeLeft = useCallback(() => {
        if (timeLeft === null || timeLeft <= 0) return '';

        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);

        if (minutes > 0) {
            return `${minutes} মিনিট ${seconds} সেকেন্ড`;
        }
        return `${seconds} সেকেন্ড`;
    }, [timeLeft]);

    return {
        showWarning,
        timeLeft,
        dismissWarning,
        formatTimeLeft
    };
};

/**
 * Hook to auto-refresh token before expiry
 * Refreshes token 1 minute before expiry
 */
export const useAutoRefresh = (refreshTimeBeforeExpiry: number = 1 * 60 * 1000) => {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const refreshToken = useCallback(async () => {
        const refreshTokenValue = localStorage.getItem('refreshToken');

        if (!refreshTokenValue) {
            return;
        }

        setIsRefreshing(true);

        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refreshToken: refreshTokenValue
                })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                localStorage.setItem('token', data.accessToken); // Legacy
                console.log('✅ Token refreshed successfully');
            } else {
                throw new Error('Token refresh failed');
            }
        } catch (error) {
            console.error('❌ Token refresh error:', error);
            // Don't logout here, let the API interceptor handle it
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    const checkAndRefresh = useCallback(() => {
        const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('token');

        if (!accessToken) return;

        const decoded = decodeToken(accessToken);

        if (!decoded || !decoded.exp) return;

        const expiresAt = decoded.exp * 1000;
        const now = Date.now();
        const timeLeft = expiresAt - now;

        // Refresh if token will expire soon
        if (timeLeft < refreshTimeBeforeExpiry && timeLeft > 0 && !isRefreshing) {
            refreshToken();
        }
    }, [refreshTimeBeforeExpiry, isRefreshing, refreshToken]);

    useEffect(() => {
        // Check immediately
        checkAndRefresh();

        // Check every 30 seconds
        const interval = setInterval(checkAndRefresh, 30000);

        return () => clearInterval(interval);
    }, [checkAndRefresh]);

    return {
        isRefreshing,
        refreshToken
    };
};
