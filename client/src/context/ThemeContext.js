import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const ThemeContext = createContext(null);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

// Get system preference
const getSystemTheme = () => {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
};

export const ThemeProvider = ({ children }) => {
    const [theme, setThemeState] = useState(() => {
        // Check localStorage first
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
            return savedTheme;
        }
        return 'system';
    });

    // Resolved theme (what's actually applied)
    const resolvedTheme = useMemo(() => {
        if (theme === 'system') {
            return getSystemTheme();
        }
        return theme;
    }, [theme]);

    // Update DOM when resolved theme changes
    useEffect(() => {
        const root = window.document.documentElement;

        // Remove previous theme
        root.classList.remove('light', 'dark');

        // Add current theme
        root.classList.add(resolvedTheme);

        // Update meta theme-color for mobile browsers
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#111827' : '#ffffff');
        }
    }, [resolvedTheme]);

    // Save theme preference to localStorage
    useEffect(() => {
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Listen for system theme changes
    useEffect(() => {
        if (theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e) => {
            const root = window.document.documentElement;
            root.classList.remove('light', 'dark');
            root.classList.add(e.matches ? 'dark' : 'light');
        };

        // Modern browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
        // Older browsers
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
    }, [theme]);

    // Set theme function
    const setTheme = useCallback((newTheme) => {
        if (['light', 'dark', 'system'].includes(newTheme)) {
            setThemeState(newTheme);
        }
    }, []);

    // Toggle between light and dark (ignores system)
    const toggleTheme = useCallback(() => {
        setThemeState(prevTheme => {
            if (prevTheme === 'system') {
                // If currently system, toggle based on resolved theme
                return getSystemTheme() === 'dark' ? 'light' : 'dark';
            }
            return prevTheme === 'light' ? 'dark' : 'light';
        });
    }, []);

    // Cycle through all themes: light -> dark -> system
    const cycleTheme = useCallback(() => {
        setThemeState(prevTheme => {
            switch (prevTheme) {
                case 'light': return 'dark';
                case 'dark': return 'system';
                case 'system': return 'light';
                default: return 'light';
            }
        });
    }, []);

    const value = useMemo(() => ({
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
        cycleTheme,
        isDark: resolvedTheme === 'dark',
        isLight: resolvedTheme === 'light',
        isSystem: theme === 'system'
    }), [theme, resolvedTheme, setTheme, toggleTheme, cycleTheme]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};
