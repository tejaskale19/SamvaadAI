import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import EngagementScore from '../../components/EngagementScore';
import { EngagementChart, PlatformChart, HashtagChart, PostingTimeChart } from '../../components/charts';
import { BarChart3, TrendingUp, Users, Eye, Heart, MessageCircle, Share2, Calendar, RefreshCw, Loader2, Lightbulb, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { EngagementPrediction, Platform } from '../../types';
import { getAnalytics } from '../../services/api';

function StatCard({ icon: Icon, label, value, subValue, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{value}</p>
          {subValue && (
            <p className="text-sm text-green-500 mt-1">{subValue}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<{
    summary: {
      totalContent: number;
      contentByStatus: Record<string, number>;
      avgEngagement: number;
      totalPublished: number;
    };
    platformStats: {
      platform: Platform;
      posts: number;
      avgEngagement: number;
      totalReach: number;
      totalLikes: number;
    }[];
    dailyStats: {
      date: string;
      posts: number;
      avgEngagement: number;
      reach: number;
    }[];
    topHashtags: {
      hashtag: string;
      uses: number;
      avgEngagement: number;
    }[];
    bestPostingTimes: {
      hour: number;
      posts: number;
      avgEngagement: number;
    }[];
    insights: string[];
    isDemo?: boolean;
  } | null>(null);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch from FastAPI backend (source of truth for content statuses)
      const data = await getAnalytics();
      
      // Map backend snake_case response to frontend camelCase
      setAnalyticsData({
        summary: {
          totalContent: data.summary?.total_content ?? data.summary?.totalContent ?? 0,
          contentByStatus: data.summary?.content_by_status ?? data.summary?.contentByStatus ?? {},
          avgEngagement: data.summary?.avg_engagement ?? data.summary?.avgEngagement ?? 0,
          totalPublished: data.summary?.total_published ?? data.summary?.totalPublished ?? 0,
        },
        platformStats: (data.platform_stats ?? data.platformStats ?? []).map((p: any) => ({
          platform: p.platform,
          posts: p.posts ?? 0,
          avgEngagement: p.avg_engagement ?? p.avgEngagement ?? 0,
          totalReach: p.total_reach ?? p.totalReach ?? 0,
          totalLikes: p.total_likes ?? p.totalLikes ?? 0,
        })),
        dailyStats: (data.daily_stats ?? data.dailyStats ?? []).map((d: any) => ({
          date: d.date,
          posts: d.posts ?? 0,
          avgEngagement: d.avg_engagement ?? d.avgEngagement ?? 0,
          reach: d.reach ?? 0,
        })),
        topHashtags: data.top_hashtags ?? data.topHashtags ?? [],
        bestPostingTimes: data.best_posting_times ?? data.bestPostingTimes ?? [],
        insights: data.insights ?? [],
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Unable to load analytics - please try again');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const data = analyticsData || {
    summary: { totalContent: 0, contentByStatus: {}, avgEngagement: 0, totalPublished: 0 },
    platformStats: [],
    dailyStats: [],
    topHashtags: [],
    bestPostingTimes: [],
    insights: [],
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center space-x-3">
              <BarChart3 className="w-8 h-8 text-purple-500" />
              <span>{t('analytics.title')}</span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              {t('analytics.subtitle')}
            </p>
          </div>
          <button
            onClick={fetchAnalytics}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
            <span>Refresh</span>
          </button>
        </div>

        {/* Error/Info Message */}
        {error && (
          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
            <p className="text-amber-700 dark:text-amber-300 text-sm">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={BarChart3}
            label={t('analytics.totalContent')}
            value={data.summary.totalContent}
            subValue={`+${data.summary.contentByStatus['draft'] || 0} drafts`}
            color="from-purple-500 to-pink-500"
          />
          <StatCard
            icon={TrendingUp}
            label={t('analytics.avgEngagement')}
            value={`${data.summary.avgEngagement}%`}
            subValue={data.summary.avgEngagement >= 75 ? '🔥 Great!' : 'Keep improving'}
            color="from-green-500 to-emerald-500"
          />
          <StatCard
            icon={Eye}
            label="Total Reach"
            value={data.platformStats.reduce((sum, p) => sum + p.totalReach, 0).toLocaleString()}
            subValue="All platforms"
            color="from-blue-500 to-indigo-500"
          />
          <StatCard
            icon={Users}
            label={t('analytics.approvedContent')}
            value={data.summary.contentByStatus['approved'] || 0}
            subValue={`${data.summary.totalContent > 0 ? Math.round(((data.summary.contentByStatus['approved'] || 0) / data.summary.totalContent) * 100) : 0}% approval rate`}
            color="from-orange-500 to-red-500"
          />
        </div>

        {/* Engagement Over Time Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-6 flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            <span>Engagement Over Time</span>
          </h2>
          {isLoading ? (
            <div className="h-80 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : (
            <EngagementChart data={data.dailyStats.map(d => ({
              date: d.date,
              engagement: d.avgEngagement,
              posts: d.posts,
              reach: d.reach,
            }))} />
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Platform Performance Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-6 flex items-center space-x-2">
              <Share2 className="w-5 h-5 text-blue-500" />
              <span>Platform Performance</span>
            </h2>
            {isLoading ? (
              <div className="h-80 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <PlatformChart data={data.platformStats} />
            )}
          </div>

          {/* Top Hashtags Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-6 flex items-center space-x-2">
              <MessageCircle className="w-5 h-5 text-green-500" />
              <span>Top Hashtags</span>
            </h2>
            {isLoading ? (
              <div className="h-80 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
              </div>
            ) : (
              <HashtagChart data={data.topHashtags} />
            )}
          </div>
        </div>

        {/* Best Posting Times Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-6 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-orange-500" />
            <span>Best Posting Times (IST)</span>
          </h2>
          {isLoading ? (
            <div className="h-80 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : (
            <PostingTimeChart data={data.bestPostingTimes} />
          )}
        </div>

        {/* AI Insights Section */}
        <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-6 text-white">
          <h2 className="text-xl font-semibold mb-6 flex items-center space-x-2">
            <Lightbulb className="w-6 h-6" />
            <span>AI-Powered Insights</span>
          </h2>
          
          <div className="grid gap-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : data.insights.length > 0 ? (
              data.insights.map((insight, index) => (
                <div 
                  key={index}
                  className="bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-colors"
                >
                  <p className="text-white/90 leading-relaxed">{insight}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-white/70">
                <p>Start creating content to see personalized insights about your performance.</p>
              </div>
            )}
          </div>

          {/* Quick Tips */}
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-xl p-4">
              <Calendar className="w-6 h-6 mb-2" />
              <h3 className="font-medium">Best Posting Time</h3>
              <p className="text-sm text-white/80 mt-1">7:00 PM - 9:00 PM IST for maximum engagement</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <TrendingUp className="w-6 h-6 mb-2" />
              <h3 className="font-medium">Content Trend</h3>
              <p className="text-sm text-white/80 mt-1">Sustainability content up 23% this month</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <MessageCircle className="w-6 h-6 mb-2" />
              <h3 className="font-medium">Engagement Tip</h3>
              <p className="text-sm text-white/80 mt-1">Posts with Hindi content get 35% more engagement</p>
            </div>
          </div>
        </div>

        {/* Summary & Empty State */}
        {!isLoading && data.summary.totalContent === 0 && data.platformStats.length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
            <BarChart3 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No Analytics Data Yet</h3>
            <p className="text-slate-500 dark:text-slate-400">
              Generate and publish content to see performance metrics.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
