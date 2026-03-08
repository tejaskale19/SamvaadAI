import React from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';

interface ThemeToggleProps {
  showLabel?: boolean;
  variant?: 'icon' | 'switch' | 'dropdown';
}

export default function ThemeToggle({ showLabel = false, variant = 'icon' }: ThemeToggleProps) {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
    );
  }

  const currentTheme = theme === 'system' ? systemTheme : theme;
  const isDark = currentTheme === 'dark';

  if (variant === 'switch') {
    return (
      <div className="flex items-center justify-between">
        {showLabel && (
          <div>
            <p className="font-medium text-slate-700 dark:text-slate-300">Dark Mode</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Switch between light and dark themes
            </p>
          </div>
        )}
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className={`relative w-14 h-8 rounded-full transition-colors ${
            isDark ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'
          }`}
          aria-label="Toggle theme"
        >
          <div
            className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform flex items-center justify-center ${
              isDark ? 'translate-x-7' : 'translate-x-1'
            }`}
          >
            {isDark ? (
              <Moon className="w-4 h-4 text-orange-500" />
            ) : (
              <Sun className="w-4 h-4 text-yellow-500" />
            )}
          </div>
        </button>
      </div>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className="relative">
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="appearance-none px-4 py-2 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 cursor-pointer"
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {theme === 'system' ? (
            <Monitor className="w-4 h-4 text-slate-400" />
          ) : isDark ? (
            <Moon className="w-4 h-4 text-slate-400" />
          ) : (
            <Sun className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>
    );
  }

  // Default: icon button
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
