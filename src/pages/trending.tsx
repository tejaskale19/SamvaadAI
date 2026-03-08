import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { TrendingUp, Hash, Sparkles, RefreshCw, Filter, ArrowUp, MapPin, Clock } from 'lucide-react';
import type { Platform } from '../../types';

interface TrendingTopic {
  topic: string;
  category: string;
  trendScore: number;
  relatedHashtags: string[];
  region: string;
  timeframe: string;
}

interface HashtagRecommendation {
  hashtag: string;
  score: number;
  category: 'trending' | 'relevant' | 'cultural' | 'industry';
  dailyUses?: number;
  growthRate?: number;
}

const CATEGORIES = ['All', 'Fashion', 'Business', 'Technology', 'Culture', 'Lifestyle', 'Health', 'Art'];

export default function TrendingPage() {
  const { t } = useTranslation();
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('instagram');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    fetchTrends();
  }, [selectedCategory]);

  const fetchTrends = async () => {
    setIsLoading(true);
    try {
      const categoryParam = selectedCategory === 'All' ? '' : `&category=${selectedCategory}`;
      const response = await fetch(`/api/trending?limit=10${categoryParam}`);
      const data = await response.json();
      setTrendingTopics(data.trendingTopics || []);
      setLastUpdated(data.lastUpdated);
    } catch (error) {
      console.error('Error fetching trends:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500 bg-green-100 dark:bg-green-900/30';
    if (score >= 80) return 'text-blue-500 bg-blue-100 dark:bg-blue-900/30';
    if (score >= 70) return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30';
    return 'text-slate-500 bg-slate-100 dark:bg-slate-700';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Fashion: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
      Business: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      Technology: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      Culture: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      Lifestyle: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      Health: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      Art: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    };
    return colors[category] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center space-x-3">
              <TrendingUp className="w-8 h-8 text-orange-500" />
              <span>Trending in India</span>
            </h1>
            <div className="flex items-center space-x-2 mt-2 text-slate-600 dark:text-slate-400">
              <MapPin className="w-4 h-4" />
              <span>India • Real-time trends for social media content</span>
            </div>
          </div>
          
          <button
            onClick={fetchTrends}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
            <Clock className="w-4 h-4" />
            <span>Last updated: {new Date(lastUpdated).toLocaleString()}</span>
          </div>
        )}

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center space-x-2 mr-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Filter:</span>
          </div>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Trending Topics Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            // Loading skeletons
            [...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-4"></div>
                <div className="flex flex-wrap gap-2">
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
                </div>
              </div>
            ))
          ) : trendingTopics.length > 0 ? (
            trendingTopics.map((topic, index) => (
              <div
                key={topic.topic}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-700 transition-all group"
              >
                {/* Rank Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-white group-hover:text-orange-500 transition-colors">
                        {topic.topic}
                      </h3>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-1 ${getCategoryColor(topic.category)}`}>
                        {topic.category}
                      </span>
                    </div>
                  </div>
                  
                  {/* Trend Score */}
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg ${getScoreColor(topic.trendScore)}`}>
                    <ArrowUp className="w-3 h-3" />
                    <span className="font-semibold text-sm">{Math.round(topic.trendScore)}</span>
                  </div>
                </div>

                {/* Timeframe */}
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Trending: {topic.timeframe}
                </p>

                {/* Related Hashtags */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                    <Hash className="w-4 h-4" />
                    <span>Related Hashtags</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {topic.relatedHashtags.map((hashtag) => (
                      <button
                        key={hashtag}
                        onClick={() => navigator.clipboard.writeText(hashtag)}
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                        title="Click to copy"
                      >
                        {hashtag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <TrendingUp className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">No trending topics found for this category</p>
            </div>
          )}
        </div>

        {/* Pro Tips Section */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-2xl border border-orange-200 dark:border-orange-800 p-6">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            <span>Pro Tips for Trending Content</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
              <h3 className="font-medium text-orange-600 dark:text-orange-400 mb-2">🎯 Timing is Key</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Post within 2-4 hours of a trend emerging for maximum visibility
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
              <h3 className="font-medium text-orange-600 dark:text-orange-400 mb-2">🔗 Mix Hashtags</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Combine trending, niche, and branded hashtags for best reach
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
              <h3 className="font-medium text-orange-600 dark:text-orange-400 mb-2">💡 Add Value</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Don&apos;t just jump on trends - add unique perspective or insights
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
              <h3 className="font-medium text-orange-600 dark:text-orange-400 mb-2">📊 Track Performance</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Monitor which trends work best for your audience and iterate
              </p>
            </div>
          </div>
        </div>

        {/* Hashtag Recommendations by Platform */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
            Platform-Specific Hashtag Strategy
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-2xl">📸</span>
                <span className="font-medium text-slate-800 dark:text-white">Instagram</span>
              </div>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>• Use 5-15 hashtags</li>
                <li>• Mix popular + niche</li>
                <li>• Place in comments or caption</li>
                <li>• Use location tags</li>
              </ul>
            </div>
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-2xl">🐦</span>
                <span className="font-medium text-slate-800 dark:text-white">Twitter</span>
              </div>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>• Use 1-2 hashtags max</li>
                <li>• Focus on trending topics</li>
                <li>• Join conversations</li>
                <li>• Create threads for depth</li>
              </ul>
            </div>
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-2xl">💼</span>
                <span className="font-medium text-slate-800 dark:text-white">LinkedIn</span>
              </div>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>• Use 3-5 hashtags</li>
                <li>• Professional keywords</li>
                <li>• Industry-specific tags</li>
                <li>• Follow trending topics</li>
              </ul>
            </div>
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-2xl">📘</span>
                <span className="font-medium text-slate-800 dark:text-white">Facebook</span>
              </div>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>• Use 2-3 hashtags</li>
                <li>• Branded hashtags work</li>
                <li>• Less is more</li>
                <li>• Focus on engagement</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
