import React from 'react';
import { useTheme, Theme } from '../../context/ThemeContext';

/**
 * Theme Toggle Button Component
 * Provides a button to switch between light and dark mode
 */

// Icons for theme toggle
const SunIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
    >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
);

const MoonIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
    >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
);

const SystemIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
    >
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
);

// Simple toggle button
export const ThemeToggleButton = ({
    className = '',
    showLabel = false
}: {
    className?: string;
    showLabel?: boolean;
}) => {
    const { theme, toggleTheme, isDark } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={`
                inline-flex items-center justify-center gap-2 p-2 rounded-lg
                text-gray-600 hover:text-gray-900 hover:bg-gray-100
                dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700
                transition-colors duration-200
                ${className}
            `}
            title={isDark ? 'লাইট মোড' : 'ডার্ক মোড'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {isDark ? <SunIcon /> : <MoonIcon />}
            {showLabel && (
                <span className="text-sm">{isDark ? 'লাইট মোড' : 'ডার্ক মোড'}</span>
            )}
        </button>
    );
};

// Dropdown with three options: light, dark, system
export const ThemeDropdown = ({
    className = ''
}: {
    className?: string;
}) => {
    const { theme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = React.useState(false);

    const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
        { value: 'light', label: 'লাইট', icon: <SunIcon /> },
        { value: 'dark', label: 'ডার্ক', icon: <MoonIcon /> },
        { value: 'system', label: 'সিস্টেম', icon: <SystemIcon /> }
    ];

    const currentOption = options.find(o => o.value === theme) || options[0];

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                    text-gray-600 hover:text-gray-900 hover:bg-gray-100
                    dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700
                    border border-gray-200 dark:border-gray-700
                    transition-colors duration-200
                `}
            >
                {currentOption.icon}
                <span className="text-sm">{currentOption.label}</span>
                <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    setTheme(option.value);
                                    setIsOpen(false);
                                }}
                                className={`
                                    w-full flex items-center gap-2 px-3 py-2
                                    text-sm text-gray-700 dark:text-gray-300
                                    hover:bg-gray-100 dark:hover:bg-gray-700
                                    first:rounded-t-lg last:rounded-b-lg
                                    ${theme === option.value ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : ''}
                                `}
                            >
                                {option.icon}
                                <span>{option.label}</span>
                                {theme === option.value && (
                                    <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

// Switch style toggle
export const ThemeSwitch = ({
    className = ''
}: {
    className?: string;
}) => {
    const { isDark, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={`
                relative inline-flex h-8 w-14 items-center rounded-full
                transition-colors duration-300
                ${isDark ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}
                ${className}
            `}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            <span className="sr-only">{isDark ? 'ডার্ক মোড সক্রিয়' : 'লাইট মোড সক্রিয়'}</span>
            <span
                className={`
                    inline-flex h-6 w-6 items-center justify-center rounded-full
                    bg-white shadow-md transform transition-transform duration-300
                    ${isDark ? 'translate-x-7' : 'translate-x-1'}
                `}
            >
                {isDark ? (
                    <MoonIcon />
                ) : (
                    <SunIcon />
                )}
            </span>
        </button>
    );
};

export default ThemeToggleButton;
