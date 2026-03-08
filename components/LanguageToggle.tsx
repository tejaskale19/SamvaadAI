import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

interface LanguageToggleProps {
  variant?: 'icon' | 'dropdown' | 'buttons';
  showLabel?: boolean;
}

export default function LanguageToggle({ variant = 'dropdown', showLabel = false }: LanguageToggleProps) {
  const { i18n, t } = useTranslation();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-24 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
    );
  }

  const currentLang = i18n.language || 'en';

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  if (variant === 'buttons') {
    return (
      <div className="flex items-center space-x-2">
        {showLabel && (
          <Globe className="w-5 h-5 text-slate-400" />
        )}
        <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => changeLanguage('en')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              currentLang === 'en'
                ? 'bg-orange-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => changeLanguage('hi')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              currentLang === 'hi'
                ? 'bg-orange-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            हिं
          </button>
        </div>
      </div>
    );
  }

  // Default: dropdown
  return (
    <div className="flex items-center space-x-2">
      {showLabel && (
        <Globe className="w-5 h-5 text-slate-400" />
      )}
      <select
        value={currentLang}
        onChange={(e) => changeLanguage(e.target.value)}
        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 cursor-pointer text-sm"
      >
        <option value="en">English</option>
        <option value="hi">हिंदी (Hindi)</option>
      </select>
    </div>
  );
}
