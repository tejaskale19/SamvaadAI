import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { History, Calendar, Instagram, Twitter, Linkedin, Facebook, CheckCircle, XCircle, Clock, Search, Filter, RefreshCw, Loader2, FileEdit, Send } from 'lucide-react';
import type { Platform } from '../../types';
import { getContentHistory, ContentHistoryItem } from '../../services/localPersistence';
import { getContentHistory as getContentHistoryFromApi } from '../../services/api';

interface HistoryItem {
  id: string;
  prompt: string;
  platform: Platform;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'published';
  createdAt: string;
  engagementScore: number;
  variants: number;
}

// Fallback mock data for when DynamoDB is not configured
const fallbackHistory: HistoryItem[] = [];

const platformIcons: Record<Platform, React.ReactNode> = {
  instagram: <Instagram className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
};

const statusConfig = {
  draft: {
    icon: FileEdit,
    color: 'text-slate-500',
    bg: 'bg-slate-100 dark:bg-slate-900/30',
    label: 'Draft',
  },
  approved: {
    icon: CheckCircle,
    color: 'text-green-500',
    bg: 'bg-green-100 dark:bg-green-900/30',
    label: 'Approved',
  },
  rejected: {
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-100 dark:bg-red-900/30',
    label: 'Rejected',
  },
  pending: {
    icon: Clock,
    color: 'text-yellow-500',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    label: 'Pending',
  },
  published: {
    icon: Send,
    color: 'text-blue-500',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Published',
  },
};

export default function HistoryPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<Platform | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch history data from FastAPI backend, then localStorage
  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First try FastAPI backend (DynamoDB - source of truth for approved status)
      const apiItems = await getContentHistoryFromApi();
      if (apiItems && apiItems.length > 0) {
        const transformedHistory: HistoryItem[] = apiItems.map((item: any) => ({
          id: item.content_id || item.contentId || item.id,
          prompt: item.prompt || '',
          platform: (item.platform || 'instagram') as Platform,
          status: item.status || 'draft',
          createdAt: item.created_at || item.createdAt || new Date().toISOString(),
          engagementScore: item.engagement_score || item.engagementScore || 0,
          variants: item.variants?.length || (typeof item.variants === 'number' ? item.variants : 1),
        }));
        
        // Also merge with localStorage for items not yet in DynamoDB
        const localHistory = getContentHistory();
        const apiIds = new Set(transformedHistory.map(h => h.id));
        const localOnly = localHistory
          .filter(item => !apiIds.has(item.id))
          .map(item => ({
            id: item.id,
            prompt: item.prompt,
            platform: item.platform as Platform,
            status: item.status === 'scheduled' ? 'pending' : item.status as HistoryItem['status'],
            createdAt: item.createdAt,
            engagementScore: item.engagementScore || 0,
            variants: 1,
          }));
        
        setHistoryData([...transformedHistory, ...localOnly]);
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn('FastAPI history unavailable, falling back to localStorage:', err);
    }
    
    try {
      // Fallback to localStorage
      const localHistory = getContentHistory();
      
      if (localHistory.length > 0) {
        const transformedHistory: HistoryItem[] = localHistory.map((item) => ({
          id: item.id,
          prompt: item.prompt,
          platform: item.platform as Platform,
          status: item.status === 'scheduled' ? 'pending' : item.status as HistoryItem['status'],
          createdAt: item.createdAt,
          engagementScore: item.engagementScore || 0,
          variants: 1,
        }));
        
        setHistoryData(transformedHistory);
      } else {
        setHistoryData([]);
        setError('No content history found - create some content first!');
      }
    } catch (err) {
      console.error('Error fetching history:', err);
      setHistoryData([]);
      setError('No content history found - create some content first!');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredHistory = historyData.filter((item) => {
    const matchesSearch = item.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = filterPlatform === 'all' || item.platform === filterPlatform;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesPlatform && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center space-x-3">
              <History className="w-8 h-8 text-indigo-500" />
              <span>{t('history.title')}</span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              {t('history.subtitle')}
            </p>
          </div>
          <button
            onClick={fetchHistory}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors"
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

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder={t('history.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>

            {/* Platform Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-slate-400" />
              <select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value as Platform | 'all')}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                <option value="all">{t('history.filterPlatform')}</option>
                <option value="instagram">Instagram</option>
                <option value="twitter">Twitter</option>
                <option value="linkedin">LinkedIn</option>
                <option value="facebook">Facebook</option>
              </select>
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'approved' | 'pending' | 'rejected')}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="all">{t('history.filterStatus')}</option>
              <option value="approved">{t('history.status.approved')}</option>
              <option value="pending">{t('history.status.pending')}</option>
              <option value="rejected">{t('history.status.rejected')}</option>
            </select>
          </div>
        </div>

        {/* History List */}
        <div className="space-y-4">
          {filteredHistory.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
              <History className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-600 dark:text-slate-400">{t('history.noContent')}</p>
            </div>
          ) : (
            filteredHistory.map((item) => {
              const StatusIcon = statusConfig[item.status as keyof typeof statusConfig].icon;
              const statusInfo = statusConfig[item.status as keyof typeof statusConfig];

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                          {platformIcons[item.platform]}
                        </div>
                        <h3 className="font-semibold text-slate-800 dark:text-white">
                          {item.prompt}
                        </h3>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-slate-500 dark:text-slate-400">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(item.createdAt)}</span>
                        </span>
                        <span>{item.variants} {t('history.variants')}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {/* Engagement Score */}
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${
                          item.engagementScore >= 80 ? 'text-green-500' :
                          item.engagementScore >= 60 ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {item.engagementScore}%
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Engagement</div>
                      </div>

                      {/* Status */}
                      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${statusInfo.bg}`}>
                        <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                        <span className={`font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
            <div className="text-2xl font-bold text-slate-800 dark:text-white">{historyData.length}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Total Content</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
            <div className="text-2xl font-bold text-green-500">
              {historyData.filter(h => h.status === 'approved').length}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Approved</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">
              {historyData.filter(h => h.status === 'pending').length}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Pending</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
            <div className="text-2xl font-bold text-orange-500">
              {historyData.length > 0 ? Math.round(historyData.reduce((acc, h) => acc + h.engagementScore, 0) / historyData.length) : 0}%
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Avg. Score</div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
