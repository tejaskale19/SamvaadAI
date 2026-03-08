import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import ContentCard from '../../components/ContentCard';
import EngagementScore from '../../components/EngagementScore';
import PromptInput from '../../components/PromptInput';
import LoadingPipeline from '../../components/LoadingPipeline';
import { generateContent, predictEngagement, translateContent, ApiError } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { showSuccessToast, showErrorToast } from '../../components/Toast';
import { Sparkles, ArrowRight, RefreshCw, TrendingUp, Hash, Zap } from 'lucide-react';
import type { GeneratedContent, ContentVariant, EngagementPrediction, Platform } from '../../types';

export default function GeneratePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { 
    state, 
    setPrompt, 
    setPipelineStage, 
    setGeneratedContent, 
    selectVariant, 
    setLocalizedContent,
    setEngagementPrediction: setGlobalEngagement,
    setError,
    resetWorkflow,
  } = useApp();

  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ContentVariant | null>(null);
  const [engagementScore, setEngagementScore] = useState<EngagementPrediction | null>(null);

  // Read query params from calendar navigation
  const queryPrompt = typeof router.query.prompt === 'string' ? router.query.prompt : '';
  const queryPlatform = typeof router.query.platform === 'string' ? (router.query.platform as Platform) : '';

  const [prompt, setLocalPrompt] = useState(queryPrompt || '');
  const [platform, setPlatform] = useState<Platform>((queryPlatform as Platform) || 'instagram');

  // Handle query params from calendar (priority over context)
  useEffect(() => {
    if (queryPrompt && state.pipelineStage === 'idle' && !content) {
      setLocalPrompt(queryPrompt);
      const plat = (queryPlatform as Platform) || 'instagram';
      setPlatform(plat);
    }
  }, [queryPrompt, queryPlatform]);

  useEffect(() => {
    // Check for prompt from context (from home page) — only if no query param
    if (!queryPrompt && state.currentPrompt && !content && state.pipelineStage === 'idle') {
      setLocalPrompt(state.currentPrompt);
      setPlatform(state.currentPlatform);
      handleGenerate(state.currentPrompt, state.currentPlatform);
    }
  }, [state.currentPrompt, state.currentPlatform]);

  const handleGenerate = async (promptText: string, selectedPlatform: Platform) => {
    setContent(null);
    setSelectedVariant(null);
    setEngagementScore(null);
    setPrompt(promptText, selectedPlatform);

    try {
      // Stage 1: Analyzing prompt
      setPipelineStage('analyzing-prompt');
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Stage 2: Generating content
      setPipelineStage('generating-content');
      const generatedContent = await generateContent({
        prompt: promptText,
        platform: selectedPlatform,
        numberOfVariants: 3,
      });

      // Stage 3: Optimizing for platform
      setPipelineStage('optimizing-platform');
      await new Promise((resolve) => setTimeout(resolve, 600));

      setContent(generatedContent);
      setGeneratedContent(generatedContent);

      // Auto-select first variant
      if (generatedContent.variants.length > 0) {
        const firstVariant = generatedContent.variants[0];
        setSelectedVariant(firstVariant);
        selectVariant(firstVariant);

        // Stage 4: Predicting engagement
        setPipelineStage('predicting-engagement');
        const prediction = await predictEngagement({
          content: firstVariant.content,
          platform: selectedPlatform,
          hashtags: firstVariant.hashtags,
        });
        setEngagementScore(prediction);
        setGlobalEngagement(prediction);

        // Stage 5: Auto-translate if enabled
        if (state.autoTranslate) {
          setPipelineStage('translating');
          try {
            const translatedContent = await translateContent({
              content: firstVariant.content,
              sourceLanguage: 'English',
              targetLanguage: 'Hindi',
              preserveCulturalContext: true,
            });
            setLocalizedContent(translatedContent);
            showSuccessToast(t('toast.contentTranslated'));
          } catch (translateError) {
            console.error('Auto-translate error:', translateError);
            // Don't fail the whole process if auto-translate fails
            showErrorToast(t('toast.errorTranslate'));
          }
        }
      }

      setPipelineStage('complete');
      showSuccessToast(t('toast.contentGenerated'));
      
      // Reset to idle after showing complete state
      setTimeout(() => {
        setPipelineStage('idle');
      }, 1500);

    } catch (error) {
      console.error('Generation error:', error);
      const errorMessage = error instanceof ApiError ? error.message : t('toast.errorGenerate');
      setError(errorMessage);
      showErrorToast(t('toast.errorGenerate'), errorMessage);
      setPipelineStage('error');
      
      setTimeout(() => {
        setPipelineStage('idle');
      }, 3000);
    }
  };

  const handleSelectVariant = async (variant: ContentVariant) => {
    setSelectedVariant(variant);
    selectVariant(variant);

    // Get engagement prediction
    try {
      const prediction = await predictEngagement({
        content: variant.content,
        platform: platform,
        hashtags: variant.hashtags,
      });
      setEngagementScore(prediction);
      setGlobalEngagement(prediction);
    } catch (error) {
      console.error('Prediction error:', error);
      showErrorToast(t('errors.serverError'));
    }
  };

  const handleProceedToLocalize = () => {
    if (selectedVariant && content) {
      // Store in context for the localize page
      selectVariant(selectedVariant);
      setGeneratedContent(content);
      router.push('/localize');
    }
  };

  const handleNewPrompt = () => {
    setContent(null);
    setSelectedVariant(null);
    setEngagementScore(null);
    setLocalPrompt('');
    resetWorkflow();
  };

  const isLoading = state.pipelineStage !== 'idle' && state.pipelineStage !== 'complete' && state.pipelineStage !== 'error';

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center space-x-3">
              <Sparkles className="w-8 h-8 text-orange-500" />
              <span>{t('generate.title')}</span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              {t('generate.subtitle')}
            </p>
          </div>
        </div>

        {/* Prompt Section */}
        {!content && !isLoading && state.pipelineStage === 'idle' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
              <PromptInput 
                onSubmit={handleGenerate} 
                isLoading={isLoading}
                defaultPrompt={prompt}
                defaultPlatform={platform}
              />
            </div>
          </div>
        )}

        {/* Loading Pipeline */}
        {isLoading && (
          <LoadingPipeline stage={state.pipelineStage} error={state.error} />
        )}

        {/* Generated Content */}
        {content && !isLoading && (
          <div className="space-y-8">
            {/* Prompt Display */}
            <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {t('generate.promptLabel').replace('?', ':')}
                </span>
                <p className="text-slate-800 dark:text-slate-200 font-medium">{content.prompt}</p>
              </div>
              <button
                onClick={handleNewPrompt}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t('generate.newPrompt')}</span>
              </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Variants */}
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
                  {t('generate.generatedVariants')} ({content.variants.length})
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t('generate.selectVariantHint')}
                </p>
                <div className="space-y-4">
                  {content.variants.map((variant, index) => (
                    <ContentCard
                      key={variant.id}
                      variant={variant}
                      index={index}
                      isSelected={selectedVariant?.id === variant.id}
                      onSelect={handleSelectVariant}
                      showActions={false}
                    />
                  ))}
                </div>
              </div>

              {/* Sidebar - Engagement Score */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
                  {t('generate.engagementAnalysis')}
                </h2>
                {engagementScore ? (
                  <EngagementScore prediction={engagementScore} />
                ) : (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 text-center text-slate-500 dark:text-slate-400">
                    {t('generate.selectVariantPrompt')}
                  </div>
                )}

                {/* Trending Hashtags Section */}
                {content.trendData && content.trendData.recommendations && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5 text-orange-500" />
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                        {t('generate.trendingHashtags')}
                      </h3>
                    </div>
                    
                    {/* Top Trending Topic */}
                    {content.trendData.analysis && content.trendData.analysis.trendingTopics && content.trendData.analysis.trendingTopics.length > 0 && (
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Zap className="w-4 h-4 text-orange-500" />
                          <span className="text-sm text-slate-700 dark:text-slate-300">Top Trend</span>
                        </div>
                        <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                          {content.trendData.analysis.trendingTopics[0].trendScore}/100
                        </span>
                      </div>
                    )}

                    {/* Trending Topics */}
                    {content.trendData.analysis?.trendingTopics && content.trendData.analysis.trendingTopics.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Trending Topics</p>
                        <div className="flex flex-wrap gap-1">
                          {content.trendData.analysis.trendingTopics.slice(0, 4).map((topic, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full"
                            >
                              {topic.topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended Hashtags */}
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Recommended Hashtags</p>
                      <div className="space-y-2">
                        {content.trendData.recommendations.slice(0, 5).map((rec, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer group"
                            onClick={() => {
                              navigator.clipboard.writeText(rec.hashtag);
                              showSuccessToast('Hashtag copied!');
                            }}
                          >
                            <div className="flex items-center space-x-2">
                              <Hash className="w-3 h-3 text-slate-400" />
                              <span className="text-sm text-slate-700 dark:text-slate-300">{rec.hashtag}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{rec.category}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                rec.score >= 80 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : rec.score >= 60
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-300'
                              }`}>
                                {rec.score}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Best Time to Post */}
                    {content.trendData.analysis?.bestTimeToPost && content.trendData.analysis.bestTimeToPost.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Best time to post: {content.trendData.analysis.bestTimeToPost[0]}</p>
                      </div>
                    )}

                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
                      Click any hashtag to copy
                    </p>
                  </div>
                )}

                {/* Action Button */}
                {selectedVariant && (
                  <button
                    onClick={handleProceedToLocalize}
                    className="w-full flex items-center justify-center space-x-2 px-6 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all"
                  >
                    <span>{t('generate.translateToHindi')}</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                )}

                {/* Auto-translate indicator */}
                {state.autoTranslate && state.localizedContent && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      ✓ {t('toast.contentTranslated')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
