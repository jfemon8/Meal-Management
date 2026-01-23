import { ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
    theme: Theme;
    resolvedTheme: ResolvedTheme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
    cycleTheme: () => void;
    isDark: boolean;
    isLight: boolean;
    isSystem: boolean;
}

export function useTheme(): ThemeContextValue;

export interface ThemeProviderProps {
    children: ReactNode;
}

export function ThemeProvider(props: ThemeProviderProps): JSX.Element;
