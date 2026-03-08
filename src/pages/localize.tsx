import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import LocalizationViewer from '../../components/LocalizationViewer';
import { translateContent, ApiError } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { showSuccessToast, showErrorToast } from '../../components/Toast';
import { Languages, ArrowRight, ArrowLeft, Loader2, ChevronDown, Check } from 'lucide-react';
import type { LocalizedContent, TargetLanguage, SupportedLanguage } from '../../types';

// Supported Indic languages for translation
const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
];

export default function LocalizePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { 
    state, 
    setLocalizedContent: setGlobalLocalizedContent,
    setPipelineStage,
  } = useApp();

  const [isLoading, setIsLoading] = useState(false);
  const [originalContent, setOriginalContent] = useState('');
  const [localizedContent, setLocalizedContent] = useState<LocalizedContent | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(SUPPORTED_LANGUAGES[0]);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);

  useEffect(() => {
    // Get content from context
    if (state.selectedVariant) {
      setOriginalContent(state.selectedVariant.content);
      
      // If auto-translated content exists in context, use it
      if (state.localizedContent) {
        setLocalizedContent(state.localizedContent);
      }
    } else {
      // Redirect to generate if no content
      router.push('/generate');
    }
  }, [state.selectedVariant, state.localizedContent, router]);

  const handleTranslate = async () => {
    if (!originalContent) return;

    setIsLoading(true);
    setPipelineStage('translating');
    
    try {
      const result = await translateContent({
        content: originalContent,
        sourceLanguage: 'English',
        targetLanguage: selectedLanguage.name as TargetLanguage,
        preserveCulturalContext: true,
      });
      setLocalizedContent(result);
      setGlobalLocalizedContent(result);
      showSuccessToast(`${t('toast.contentTranslated')} (${selectedLanguage.nativeName})`);
      setPipelineStage('idle');
    } catch (error) {
      console.error('Translation error:', error);
      const errorMessage = error instanceof ApiError ? error.message : t('toast.errorTranslate');
      showErrorToast(t('toast.errorTranslate'), errorMessage);
      setPipelineStage('error');
      setTimeout(() => setPipelineStage('idle'), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageSelect = (language: SupportedLanguage) => {
    setSelectedLanguage(language);
    setIsLanguageDropdownOpen(false);
    // Clear previous translation when language changes
    if (localizedContent && localizedContent.language !== language.name) {
      setLocalizedContent(null);
    }
  };

  const handleProceedToApprove = () => {
    if (localizedContent) {
      setGlobalLocalizedContent(localizedContent);
      router.push('/approve');
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center space-x-3">
              <Languages className="w-8 h-8 text-blue-500" />
              <span>{t('localize.title')}</span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              {t('localize.subtitle')}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                <span className="font-medium">{selectedLanguage.nativeName}</span>
                <span className="text-sm text-blue-500">({selectedLanguage.name})</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isLanguageDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isLanguageDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 max-h-80 overflow-y-auto">
                  <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Select Target Language
                    </p>
                  </div>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageSelect(lang)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                        selectedLanguage.code === lang.code ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{lang.nativeName}</span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{lang.name}</span>
                      </div>
                      {selectedLanguage.code === lang.code && (
                        <Check className="w-5 h-5 text-blue-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => router.push('/generate')}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('localize.backToGenerate')}</span>
            </button>
          </div>
        </div>

        {/* Translation Section */}
        {originalContent && (
          <div className="space-y-6">
            <LocalizationViewer
              original={originalContent}
              localized={localizedContent}
              isLoading={isLoading}
              onTranslate={handleTranslate}
              targetLanguage={selectedLanguage.name}
            />

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleTranslate}
                disabled={isLoading}
                className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Languages className="w-5 h-5" />
                )}
                <span>
                  {localizedContent 
                    ? `${t('localize.retranslate')} to ${selectedLanguage.nativeName}` 
                    : `${t('localize.translateButton')} to ${selectedLanguage.nativeName}`
                  }
                </span>
              </button>

              {localizedContent && (
                <button
                  onClick={handleProceedToApprove}
                  className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 transition-all"
                >
                  <span>{t('localize.proceedToApproval')}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* No Content */}
        {!originalContent && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Languages className="w-16 h-16 text-slate-300 dark:text-slate-600" />
            <p className="text-lg text-slate-600 dark:text-slate-400">{t('localize.noContent')}</p>
            <button
              onClick={() => router.push('/generate')}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors"
            >
              <span>{t('localize.generateFirst')}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
