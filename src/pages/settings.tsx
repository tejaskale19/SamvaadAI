import React, { useState } from 'react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { useApp } from '../../context/AppContext';
import { showSuccessToast } from '../../components/Toast';
import { Settings, Save, Moon, Sun, Bell, Globe, Key, Database, Cloud, Check } from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme, systemTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const { state, setAutoTranslate, setInterfaceLanguage } = useApp();
  
  const [notifications, setNotifications] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [mounted, setMounted] = React.useState(false);

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = theme === 'system' ? systemTheme : theme;
  const isDark = currentTheme === 'dark';

  const handleSave = () => {
    setSaveSuccess(true);
    showSuccessToast(t('settings.saveSuccess'));
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setInterfaceLanguage(lang as 'en' | 'hi');
  };

  if (!mounted) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-4" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-64 mb-8" />
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center space-x-3">
            <Settings className="w-8 h-8 text-slate-500" />
            <span>{t('settings.title')}</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {t('settings.subtitle')}
          </p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Appearance */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center space-x-2">
              <Moon className="w-5 h-5 text-purple-500" />
              <span>{t('settings.appearance.title')}</span>
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{t('settings.appearance.darkMode')}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.appearance.darkModeDescription')}</p>
                </div>
                <button
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    isDark ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform flex items-center justify-center ${
                    isDark ? 'translate-x-7' : 'translate-x-1'
                  }`}>
                    {isDark ? <Moon className="w-4 h-4 text-orange-500" /> : <Sun className="w-4 h-4 text-yellow-500" />}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center space-x-2">
              <Bell className="w-5 h-5 text-blue-500" />
              <span>{t('settings.notifications.title')}</span>
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{t('settings.notifications.push')}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.notifications.pushDescription')}</p>
                </div>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    notifications ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                    notifications ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Language & Localization */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center space-x-2">
              <Globe className="w-5 h-5 text-green-500" />
              <span>{t('settings.language.title')}</span>
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{t('settings.language.interface')}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.language.interfaceDescription')}</p>
                </div>
                <select
                  value={i18n.language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{t('settings.language.autoTranslate')}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.language.autoTranslateDescription')}</p>
                </div>
                <button
                  onClick={() => setAutoTranslate(!state.autoTranslate)}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    state.autoTranslate ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                    state.autoTranslate ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* AI Configuration */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center space-x-2">
              <Key className="w-5 h-5 text-yellow-500" />
              <span>{t('settings.ai.title')}</span>
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('settings.ai.model')}
                </label>
                <select className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  <option value="claude">Claude (AWS Bedrock)</option>
                  <option value="gpt4">GPT-4 (OpenAI)</option>
                  <option value="titan">Amazon Titan</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('settings.ai.variants')}
                </label>
                <select className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  <option value="3">{t('settings.ai.variantsRecommended')}</option>
                  <option value="5">5 variants</option>
                  <option value="1">1 variant</option>
                </select>
              </div>
            </div>
          </div>

          {/* Infrastructure (Info Only) */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center space-x-2">
              <Cloud className="w-5 h-5 text-indigo-500" />
              <span>{t('settings.infrastructure.title')}</span>
            </h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
                <Database className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{t('settings.infrastructure.database')}</p>
                  <p className="text-slate-500 dark:text-slate-400">DynamoDB</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
                <Cloud className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{t('settings.infrastructure.storage')}</p>
                  <p className="text-slate-500 dark:text-slate-400">Amazon S3</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
                <Database className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{t('settings.infrastructure.cache')}</p>
                  <p className="text-slate-500 dark:text-slate-400">ElastiCache</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
                <Cloud className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{t('settings.infrastructure.aiService')}</p>
                  <p className="text-slate-500 dark:text-slate-400">AWS Bedrock</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end space-x-4">
          {saveSuccess && (
            <div className="flex items-center space-x-2 text-green-500">
              <Check className="w-5 h-5" />
              <span>{t('settings.saveSuccess')}</span>
            </div>
          )}
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 transition-all"
          >
            <Save className="w-5 h-5" />
            <span>{t('common.save')}</span>
          </button>
        </div>
      </div>
    </Layout>
  );
}
