import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { 
  Sparkles, 
  FileText, 
  BarChart3, 
  Clock, 
  CheckCircle, 
  Languages,
  TrendingUp,
  Calendar,
  User,
  LogOut
} from 'lucide-react';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, signOut, isAuthenticated, isLoading } = useAuth();
  const { state } = useApp();

  // Handle sign out
  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  // Redirect if not authenticated (after loading completes)
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Quick stats data
  const stats = [
    {
      label: 'Content Generated',
      value: state.contentHistory.length.toString(),
      icon: FileText,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Approved Content',
      value: state.approvedContent.length.toString(),
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Avg Engagement',
      value: state.contentHistory.length > 0 
        ? `${Math.round(state.contentHistory.reduce((acc, c) => acc + (c.variants[0]?.engagementScore || 0), 0) / state.contentHistory.length)}%`
        : '—',
      icon: TrendingUp,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
    {
      label: 'This Month',
      value: state.contentHistory.filter(c => {
        const date = new Date(c.timestamp);
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }).length.toString(),
      icon: Calendar,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
  ];

  // Quick actions
  const quickActions = [
    {
      label: 'Generate Content',
      description: 'Create new social media content',
      href: '/generate',
      icon: Sparkles,
      gradient: 'from-orange-500 to-pink-500',
    },
    {
      label: 'Localize Content',
      description: 'Translate and adapt content',
      href: '/localize',
      icon: Languages,
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'View Analytics',
      description: 'Check engagement metrics',
      href: '/analytics',
      icon: BarChart3,
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      label: 'Content History',
      description: 'Browse past content',
      href: '/history',
      icon: Clock,
      gradient: 'from-purple-500 to-violet-500',
    },
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Welcome back, {user?.name || user?.email?.split('@')[0] || 'User'}!
            </h1>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              Here&apos;s what&apos;s happening with your content
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm text-slate-700 dark:text-slate-300">{user?.email}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Sign out</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{action.label}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{action.description}</p>
              </Link>
            );
          })}
        </div>

        {/* Recent Content */}
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Recent Content</h2>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          {state.contentHistory.length > 0 ? (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {state.contentHistory.slice(0, 5).map((content) => (
                <div key={content.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {content.prompt}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {new Date(content.timestamp).toLocaleDateString()} • {content.variants.length} variants
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      content.status === 'approved' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : content.status === 'rejected'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {content.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">No content generated yet</p>
              <Link
                href="/generate"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-medium rounded-lg hover:from-orange-600 hover:to-pink-600 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Create your first content
              </Link>
            </div>
          )}
          {state.contentHistory.length > 5 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <Link
                href="/history"
                className="text-sm text-orange-600 hover:text-orange-500 dark:text-orange-400 dark:hover:text-orange-300 font-medium"
              >
                View all content →
              </Link>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
