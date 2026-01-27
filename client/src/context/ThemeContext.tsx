import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';

// ============================================
// Types
// ============================================

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextType {
  /** Current theme setting (can be 'system') */
  theme: Theme;
  /** Actual applied theme (always 'light' or 'dark') */
  resolvedTheme: ResolvedTheme;
  /** Set theme to specific value */
  setTheme: (theme: Theme) => void;
  /** Toggle between light and dark (ignores system) */
  toggleTheme: () => void;
  /** Cycle through all themes: light -> dark -> system */
  cycleTheme: () => void;
  /** Is dark mode currently active */
  isDark: boolean;
  /** Is light mode currently active */
  isLight: boolean;
  /** Is theme set to follow system preference */
  isSystem: boolean;
}

export interface ThemeProviderProps {
  children: ReactNode;
  /** Default theme to use if no preference is saved */
  defaultTheme?: Theme;
  /** Storage key for persisting theme preference */
  storageKey?: string;
}

// ============================================
// Context
// ============================================

const ThemeContext = createContext<ThemeContextType | null>(null);

// ============================================
// Hook
// ============================================

/**
 * Custom hook to access theme context
 * @throws Error if used outside of ThemeProvider
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// ============================================
// Utilities
// ============================================

/**
 * Get the current system color scheme preference
 */
const getSystemTheme = (): ResolvedTheme => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return 'light';
};

/**
 * Validate if a string is a valid theme value
 */
const isValidTheme = (value: unknown): value is Theme => {
  return value === 'light' || value === 'dark' || value === 'system';
};

/**
 * Get initial theme from storage or default
 */
const getInitialTheme = (
  storageKey: string,
  defaultTheme: Theme
): Theme => {
  if (typeof window === 'undefined') {
    return defaultTheme;
  }

  try {
    const savedTheme = localStorage.getItem(storageKey);
    if (savedTheme && isValidTheme(savedTheme)) {
      return savedTheme;
    }
  } catch {
    // localStorage might be unavailable (e.g., private browsing)
    console.warn('Unable to access localStorage for theme preference');
  }

  return defaultTheme;
};

// ============================================
// Provider Component
// ============================================

/**
 * ThemeProvider component that manages theme state and persistence
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'system',
  storageKey = 'theme',
}) => {
  const [theme, setThemeState] = useState<Theme>(() =>
    getInitialTheme(storageKey, defaultTheme)
  );

  // Resolved theme (what's actually applied)
  const resolvedTheme = useMemo<ResolvedTheme>(() => {
    if (theme === 'system') {
      return getSystemTheme();
    }
    return theme;
  }, [theme]);

  // Update DOM when resolved theme changes
  useEffect(() => {
    const root = window.document.documentElement;

    // Remove previous theme classes
    root.classList.remove('light', 'dark');

    // Add current theme class
    root.classList.add(resolvedTheme);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]'
    );
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        resolvedTheme === 'dark' ? '#111827' : '#ffffff'
      );
    }
  }, [resolvedTheme]);

  // Save theme preference to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, theme);
    } catch {
      console.warn('Unable to save theme preference to localStorage');
    }
  }, [theme, storageKey]);

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(e.matches ? 'dark' : 'light');
    };

    // Modern browsers
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Set theme function with validation
  const setTheme = useCallback((newTheme: Theme) => {
    if (isValidTheme(newTheme)) {
      setThemeState(newTheme);
    }
  }, []);

  // Toggle between light and dark (ignores system)
  const toggleTheme = useCallback(() => {
    setThemeState((prevTheme) => {
      if (prevTheme === 'system') {
        // If currently system, toggle based on resolved theme
        return getSystemTheme() === 'dark' ? 'light' : 'dark';
      }
      return prevTheme === 'light' ? 'dark' : 'light';
    });
  }, []);

  // Cycle through all themes: light -> dark -> system
  const cycleTheme = useCallback(() => {
    setThemeState((prevTheme) => {
      switch (prevTheme) {
        case 'light':
          return 'dark';
        case 'dark':
          return 'system';
        case 'system':
          return 'light';
        default:
          return 'light';
      }
    });
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
      cycleTheme,
      isDark: resolvedTheme === 'dark',
      isLight: resolvedTheme === 'light',
      isSystem: theme === 'system',
    }),
    [theme, resolvedTheme, setTheme, toggleTheme, cycleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

// ============================================
// Exports
// ============================================

export { ThemeContext };
export default ThemeProvider;
