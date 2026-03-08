import React, { useState } from 'react';
import { Languages, Copy, Check, ArrowRight, Sparkles, Hash, Link2, Smile } from 'lucide-react';
import type { LocalizedContent } from '../types';

// Language code to native name mapping
const LANGUAGE_CONFIG: Record<string, { code: string; nativeName: string; bgClass: string; textClass: string }> = {
  'Hindi': { code: 'HI', nativeName: 'हिन्दी', bgClass: 'bg-orange-100 dark:bg-orange-900/30', textClass: 'text-orange-600 dark:text-orange-400' },
  'Marathi': { code: 'MR', nativeName: 'मराठी', bgClass: 'bg-green-100 dark:bg-green-900/30', textClass: 'text-green-600 dark:text-green-400' },
  'Tamil': { code: 'TA', nativeName: 'தமிழ்', bgClass: 'bg-red-100 dark:bg-red-900/30', textClass: 'text-red-600 dark:text-red-400' },
  'Telugu': { code: 'TE', nativeName: 'తెలుగు', bgClass: 'bg-purple-100 dark:bg-purple-900/30', textClass: 'text-purple-600 dark:text-purple-400' },
  'Bengali': { code: 'BN', nativeName: 'বাংলা', bgClass: 'bg-teal-100 dark:bg-teal-900/30', textClass: 'text-teal-600 dark:text-teal-400' },
  'Gujarati': { code: 'GU', nativeName: 'ગુજરાતી', bgClass: 'bg-amber-100 dark:bg-amber-900/30', textClass: 'text-amber-600 dark:text-amber-400' },
  'Kannada': { code: 'KN', nativeName: 'ಕನ್ನಡ', bgClass: 'bg-indigo-100 dark:bg-indigo-900/30', textClass: 'text-indigo-600 dark:text-indigo-400' },
  'Malayalam': { code: 'ML', nativeName: 'മലയാളം', bgClass: 'bg-cyan-100 dark:bg-cyan-900/30', textClass: 'text-cyan-600 dark:text-cyan-400' },
  'Punjabi': { code: 'PA', nativeName: 'ਪੰਜਾਬੀ', bgClass: 'bg-rose-100 dark:bg-rose-900/30', textClass: 'text-rose-600 dark:text-rose-400' },
};

interface LocalizationViewerProps {
  original: string;
  localized: LocalizedContent | null;
  isLoading?: boolean;
  onTranslate?: () => void;
  targetLanguage?: string;
}

export default function LocalizationViewer({
  original,
  localized,
  isLoading = false,
  onTranslate,
  targetLanguage = 'Hindi',
}: LocalizationViewerProps) {
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedTranslated, setCopiedTranslated] = useState(false);

  const langConfig = LANGUAGE_CONFIG[localized?.language || targetLanguage] || LANGUAGE_CONFIG['Hindi'];

  const handleCopy = async (text: string, type: 'original' | 'translated') => {
    await navigator.clipboard.writeText(text);
    if (type === 'original') {
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 2000);
    } else {
      setCopiedTranslated(true);
      setTimeout(() => setCopiedTranslated(false), 2000);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
        <div className="flex items-center space-x-2">
          <Languages className="w-5 h-5" />
          <h3 className="font-semibold">Content Localization</h3>
        </div>
        <p className="text-sm text-blue-100 mt-1">
          {localized?.language || targetLanguage} translation with cultural adaptations
        </p>
      </div>

      <div className="p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Original Content */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                <span className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs">EN</span>
                <span>Original (English)</span>
              </h4>
              <button
                onClick={() => handleCopy(original, 'original')}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {copiedOriginal ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
              {original}
            </div>
          </div>

          {/* Arrow */}
          <div className="hidden md:flex items-center justify-center absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <ArrowRight className="w-6 h-6 text-slate-400" />
          </div>

          {/* Translated Content */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                <span className={`w-6 h-6 rounded ${langConfig.bgClass} ${langConfig.textClass} flex items-center justify-center text-xs font-semibold`}>{langConfig.code}</span>
                <span>Translated ({localized?.language || targetLanguage})</span>
              </h4>
              {localized && (
                <button
                  onClick={() => handleCopy(localized.translated, 'translated')}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  {copiedTranslated ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
            
            {isLoading ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center h-64">
                <div className="flex items-center space-x-2 text-slate-500">
                  <Sparkles className="w-5 h-5 animate-spin" />
                  <span>Translating to {targetLanguage}...</span>
                </div>
              </div>
            ) : localized ? (
              <div className={`p-4 rounded-xl ${langConfig.bgClass.replace('100', '50').replace('/30', '/10')} text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto`}>
                {localized.translated}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center h-64 space-y-4">
                <Languages className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                <p className="text-slate-500 dark:text-slate-400 text-center">
                  Click translate to convert your content to {targetLanguage}
                </p>
                {onTranslate && (
                  <button
                    onClick={onTranslate}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                  >
                    <Languages className="w-4 h-4" />
                    <span>Translate to {targetLanguage}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Preserved Elements */}
        {localized?.preservedElements && (
          (localized.preservedElements.emojis.length > 0 || 
           localized.preservedElements.hashtags.length > 0 || 
           localized.preservedElements.urls.length > 0) && (
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-500" />
                <span>Preserved Elements</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {localized.preservedElements.emojis.length > 0 && (
                  <div className="flex items-start space-x-2">
                    <Smile className="w-4 h-4 text-yellow-500 mt-0.5" />
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Emojis</span>
                      <span className="text-lg">{localized.preservedElements.emojis.join(' ')}</span>
                    </div>
                  </div>
                )}
                {localized.preservedElements.hashtags.length > 0 && (
                  <div className="flex items-start space-x-2">
                    <Hash className="w-4 h-4 text-blue-500 mt-0.5" />
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Hashtags</span>
                      <div className="flex flex-wrap gap-1">
                        {localized.preservedElements.hashtags.slice(0, 5).map((tag, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            {tag}
                          </span>
                        ))}
                        {localized.preservedElements.hashtags.length > 5 && (
                          <span className="text-xs text-slate-500">+{localized.preservedElements.hashtags.length - 5} more</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {localized.preservedElements.urls.length > 0 && (
                  <div className="flex items-start space-x-2">
                    <Link2 className="w-4 h-4 text-green-500 mt-0.5" />
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">URLs</span>
                      <span className="text-xs text-green-600 dark:text-green-400">{localized.preservedElements.urls.length} link(s) preserved</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {/* Cultural Adaptations */}
        {localized && localized.culturalAdaptations.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>Cultural Adaptations Applied</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {localized.culturalAdaptations.map((adaptation, index) => (
                <span
                  key={index}
                  className="px-3 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-sm"
                >
                  {adaptation}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
