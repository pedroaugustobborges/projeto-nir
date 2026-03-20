import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'whatsapp_sender_theme';

function getInitialTheme(): Theme {
  // Only access localStorage on client side
  if (typeof window === 'undefined') return 'light';

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }

    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch (e) {
    console.warn('Error reading theme from localStorage:', e);
  }

  return 'light';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;

  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  // Apply theme on mount and whenever it changes
  useEffect(() => {
    applyTheme(theme);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {
      console.warn('Error saving theme to localStorage:', e);
    }
  }, [theme]);

  // Also apply immediately on mount
  useEffect(() => {
    applyTheme(theme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      // Apply immediately for smoother transition
      applyTheme(newTheme);
      return newTheme;
    });
  }, []);

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
