import React, { useState, useEffect } from 'react';
import { Send, Sparkles, Instagram, Twitter, Linkedin, Facebook } from 'lucide-react';
import type { Platform } from '../types';

interface PromptInputProps {
  onSubmit: (prompt: string, platform: Platform) => void;
  isLoading?: boolean;
  defaultPrompt?: string;
  defaultPlatform?: Platform;
}

const platforms: { id: Platform; name: string; icon: React.ReactNode }[] = [
  { id: 'instagram', name: 'Instagram', icon: <Instagram className="w-5 h-5" /> },
  { id: 'twitter', name: 'Twitter/X', icon: <Twitter className="w-5 h-5" /> },
  { id: 'linkedin', name: 'LinkedIn', icon: <Linkedin className="w-5 h-5" /> },
  { id: 'facebook', name: 'Facebook', icon: <Facebook className="w-5 h-5" /> },
];

export default function PromptInput({ onSubmit, isLoading = false, defaultPrompt = '', defaultPlatform }: PromptInputProps) {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(defaultPlatform || 'instagram');

  // Sync prompt when defaultPrompt changes (e.g., calendar navigation)
  useEffect(() => {
    if (defaultPrompt) setPrompt(defaultPrompt);
  }, [defaultPrompt]);

  // Sync platform when defaultPlatform changes
  useEffect(() => {
    if (defaultPlatform) setSelectedPlatform(defaultPlatform);
  }, [defaultPlatform]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim(), selectedPlatform);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      {/* Platform Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Select Platform
        </label>
        <div className="flex flex-wrap gap-3">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              type="button"
              onClick={() => setSelectedPlatform(platform.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border-2 transition-all ${
                selectedPlatform === platform.id
                  ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {platform.icon}
              <span className="font-medium">{platform.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Prompt Input */}
      <div className="space-y-3">
        <label htmlFor="prompt" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          What do you want to create?
        </label>
        <div className="relative">
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Launching a sustainable clothing brand in India..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 resize-none transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            disabled={isLoading}
          />
          <div className="absolute bottom-3 right-3 text-sm text-slate-400">
            {prompt.length}/500
          </div>
        </div>
      </div>

      {/* Quick Suggestions */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Quick Suggestions
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            'Launching a sustainable clothing brand in India',
            'Diwali sale announcement',
            'New product launch for Gen Z',
            'Festival greeting post',
          ].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setPrompt(suggestion)}
              className="px-3 py-1.5 rounded-lg text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!prompt.trim() || isLoading}
        className="w-full flex items-center justify-center space-x-2 px-6 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold text-lg shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isLoading ? (
          <>
            <Sparkles className="w-5 h-5 animate-spin" />
            <span>Generating content...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            <span>Generate Content</span>
            <Send className="w-5 h-5" />
          </>
        )}
      </button>
    </form>
  );
}
