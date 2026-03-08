import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import PromptInput from '../../components/PromptInput';
import { useApp } from '../../context/AppContext';
import { Sparkles, Zap, Globe, BarChart3, CheckCircle, ArrowRight } from 'lucide-react';
import type { Platform } from '../../types';

export default function Home() {
  const router = useRouter();
  const { t } = useTranslation();
  const { setPrompt, resetWorkflow } = useApp();
  const [isLoading, setIsLoading] = useState(false);

  const features = [
    {
      icon: Sparkles,
      title: t('home.features.aiGeneration.title'),
      description: t('home.features.aiGeneration.description'),
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Zap,
      title: t('home.features.platformOptimization.title'),
      description: t('home.features.platformOptimization.description'),
      color: 'from-yellow-500 to-orange-500',
    },
    {
      icon: Globe,
      title: t('home.features.hindiLocalization.title'),
      description: t('home.features.hindiLocalization.description'),
      color: 'from-blue-500 to-indigo-500',
    },
    {
      icon: BarChart3,
      title: t('home.features.engagement.title'),
      description: t('home.features.engagement.description'),
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: CheckCircle,
      title: t('home.features.approval.title'),
      description: t('home.features.approval.description'),
      color: 'from-red-500 to-pink-500',
    },
  ];

  const handleSubmit = async (prompt: string, platform: Platform) => {
    setIsLoading(true);
    resetWorkflow();
    setPrompt(prompt, platform);
    router.push('/generate');
  };

  const handleTryDemo = () => {
    resetWorkflow();
    setPrompt(t('home.demo.prompt'), 'instagram');
    router.push('/generate');
  };

  return (
    <Layout>
      <div className="space-y-16">
        {/* Hero Section */}
        <div className="text-center space-y-6 py-8">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            <span>{t('home.tagline')}</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white leading-tight">
            {t('home.title')}<br />
            <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
              {t('home.titleHighlight')}
            </span>
          </h1>
          
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            {t('home.subtitle')}
          </p>
        </div>

        {/* Prompt Input Section */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-700 p-8">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 text-center">
              {t('home.promptQuestion')}
            </h2>
            <PromptInput onSubmit={handleSubmit} isLoading={isLoading} />
          </div>
        </div>

        {/* Features Section */}
        <div className="space-y-8">
          <h2 className="text-3xl font-bold text-center text-slate-800 dark:text-white">
            Complete Content Workflow
          </h2>
          
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {feature.description}
                  </p>
                  {index < features.length - 1 && (
                    <ArrowRight className="hidden lg:block absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 text-slate-300 dark:text-slate-600" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Demo Scenario */}
        <div className="bg-gradient-to-br from-orange-500 to-pink-500 rounded-3xl p-8 text-white">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl font-bold">{t('home.demo.title')}</h2>
            <p className="text-lg text-orange-100">
              {t('home.demo.description')} <strong>"{t('home.demo.prompt')}"</strong>
            </p>
            <div className="grid md:grid-cols-5 gap-4 text-sm">
              <div className="bg-white/20 rounded-xl p-4">
                <div className="text-2xl mb-2">1️⃣</div>
                <p>{t('home.demo.steps.step1')}</p>
              </div>
              <div className="bg-white/20 rounded-xl p-4">
                <div className="text-2xl mb-2">2️⃣</div>
                <p>{t('home.demo.steps.step2')}</p>
              </div>
              <div className="bg-white/20 rounded-xl p-4">
                <div className="text-2xl mb-2">3️⃣</div>
                <p>{t('home.demo.steps.step3')}</p>
              </div>
              <div className="bg-white/20 rounded-xl p-4">
                <div className="text-2xl mb-2">4️⃣</div>
                <p>{t('home.demo.steps.step4')}</p>
              </div>
              <div className="bg-white/20 rounded-xl p-4">
                <div className="text-2xl mb-2">5️⃣</div>
                <p>{t('home.demo.steps.step5')}</p>
              </div>
            </div>
            <button
              onClick={handleTryDemo}
              className="inline-flex items-center space-x-2 px-8 py-4 rounded-xl bg-white text-orange-600 font-semibold hover:bg-orange-50 transition-colors"
            >
              <span>{t('home.demo.tryDemo')}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

