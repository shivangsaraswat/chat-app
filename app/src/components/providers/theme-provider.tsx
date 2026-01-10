'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>('dark');
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

    useEffect(() => {
        // Load saved theme
        const saved = localStorage.getItem('theme') as Theme | null;
        if (saved) {
            setTheme(saved);
        }
    }, []);

    useEffect(() => {
        const root = document.documentElement;

        const getSystemTheme = (): 'light' | 'dark' => {
            return window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light';
        };

        const applyTheme = (t: Theme) => {
            const resolved = t === 'system' ? getSystemTheme() : t;
            console.log('Applying theme:', t, '-> Resolved:', resolved);
            setResolvedTheme(resolved);

            root.classList.remove('light', 'dark');
            root.classList.add(resolved);
            console.log('HTML classes:', root.classList.toString());
        };

        applyTheme(theme);
        localStorage.setItem('theme', theme);
        console.log('Theme saved to localStorage:', theme);

        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            if (theme === 'system') {
                applyTheme('system');
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
