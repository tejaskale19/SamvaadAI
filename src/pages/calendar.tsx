import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import {
  Calendar,
  Sparkles,
  Instagram,
  Twitter,
  Linkedin,
  Facebook,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Loader2,
  Clock,
  Hash,
  Target,
  Users,
  Megaphone,
  BookOpen,
  PartyPopper,
  Camera,
  Sun,
  Check,
  X,
} from 'lucide-react';
import type { Platform } from '../../types';
import { saveContentToHistory, schedulePost as saveScheduledPost, ContentHistoryItem } from '../../services/localPersistence';

interface CalendarPost {
  id: string;
  date: string;
  time: string;
  topic: string;
  description: string;
  platform: Platform;
  hashtags: string[];
  category: string;
  priority: 'high' | 'medium' | 'low';
  status: string;
}

interface CalendarWeek {
  weekNumber: number;
  startDate: string;
  endDate: string;
  posts: CalendarPost[];
  theme: string;
}

interface ContentCalendar {
  id: string;
  month: string;
  year: number;
  businessType: string;
  weeks: CalendarWeek[];
  totalPosts: number;
  platformDistribution: Record<Platform, number>;
}

const platformIcons: Record<Platform, React.ReactNode> = {
  instagram: <Instagram className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
};

const platformColors: Record<Platform, string> = {
  instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
  twitter: 'bg-blue-400',
  linkedin: 'bg-blue-700',
  facebook: 'bg-blue-600',
};

const categoryIcons: Record<string, React.ReactNode> = {
  promotion: <Megaphone className="w-4 h-4" />,
  engagement: <Users className="w-4 h-4" />,
  educational: <BookOpen className="w-4 h-4" />,
  entertainment: <PartyPopper className="w-4 h-4" />,
  ugc: <Camera className="w-4 h-4" />,
  seasonal: <Sun className="w-4 h-4" />,
};

const priorityColors = {
  high: 'border-red-500 bg-red-500/10',
  medium: 'border-yellow-500 bg-yellow-500/10',
  low: 'border-green-500 bg-green-500/10',
};

export default function CalendarPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [calendar, setCalendar] = useState<ContentCalendar | null>(null);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [selectedPost, setSelectedPost] = useState<CalendarPost | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    businessType: 'Fashion & Apparel',
    targetAudience: 'Gen Z and Millennials in India',
    brandVoice: 'casual',
    goals: ['engagement', 'sales'],
    platforms: ['instagram', 'twitter'] as Platform[],
    postsPerWeek: 7,
    startDate: new Date().toISOString().split('T')[0],
  });

  // Generate content for selected post
  const handleGenerateContent = async () => {
    if (!selectedPost) return;
    
    setIsGeneratingContent(true);
    setGeneratedContent(null);
    setActionSuccess(null);
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${selectedPost.topic}: ${selectedPost.description}`,
          platform: selectedPost.platform,
          tone: formData.brandVoice,
          includeHashtags: true,
          includeEmojis: true,
          culturalContext: selectedPost.category === 'seasonal' ? 'festival' : 'general',
          targetAudience: formData.targetAudience,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate content');
      
      const data = await response.json();
      const content = data.variants?.[0]?.content || data.content;
      setGeneratedContent(content);
      
      // Save to history
      const historyItem: ContentHistoryItem = {
        id: `cal_${selectedPost.id}_${Date.now()}`,
        prompt: selectedPost.topic,
        platform: selectedPost.platform,
        selectedContent: content,
        hashtags: selectedPost.hashtags,
        engagementScore: data.variants?.[0]?.engagementScore || 75,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveContentToHistory(historyItem);
      
      setActionSuccess('Content generated and saved to history!');
    } catch (error) {
      console.error('Error generating content:', error);
      setActionSuccess('Failed to generate content. Please try again.');
    } finally {
      setIsGeneratingContent(false);
    }
  };

  // Schedule the post
  const handleSchedulePost = async () => {
    if (!selectedPost) return;
    
    setIsScheduling(true);
    setActionSuccess(null);
    
    try {
      // Create scheduled post
      const scheduledDate = new Date(`${selectedPost.date}T${selectedPost.time.replace(' ', '')}:00`);
      
      const contentToSchedule = generatedContent || `[Draft] ${selectedPost.topic}: ${selectedPost.description}\n\n${selectedPost.hashtags.join(' ')}`;
      
      // Save to localStorage
      saveScheduledPost({
        id: `sched_${selectedPost.id}_${Date.now()}`,
        contentId: selectedPost.id,
        platform: selectedPost.platform,
        scheduledTime: scheduledDate.toISOString(),
        content: contentToSchedule,
        status: 'scheduled',
      });
      
      // Also save to history as scheduled
      const historyItem: ContentHistoryItem = {
        id: `cal_${selectedPost.id}_${Date.now()}`,
        prompt: selectedPost.topic,
        platform: selectedPost.platform,
        selectedContent: contentToSchedule,
        hashtags: selectedPost.hashtags,
        engagementScore: 75,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveContentToHistory(historyItem);
      
      setActionSuccess(`Post scheduled for ${scheduledDate.toLocaleDateString('en-IN', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })} IST!`);
      
      // Update post status in calendar
      if (calendar) {
        const updatedWeeks = calendar.weeks.map(week => ({
          ...week,
          posts: week.posts.map(post => 
            post.id === selectedPost.id 
              ? { ...post, status: 'scheduled' }
              : post
          ),
        }));
        setCalendar({ ...calendar, weeks: updatedWeeks });
      }
    } catch (error) {
      console.error('Error scheduling post:', error);
      setActionSuccess('Failed to schedule post. Please try again.');
    } finally {
      setIsScheduling(false);
    }
  };

  // Navigate to generate page with pre-filled prompt
  const handleOpenInGenerator = () => {
    if (!selectedPost) return;
    router.push({
      pathname: '/generate',
      query: {
        prompt: `${selectedPost.topic}: ${selectedPost.description}`,
        platform: selectedPost.platform,
      },
    });
  };

  const handleGenerateCalendar = async () => {
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/calendar?action=generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to generate calendar');
      
      const data = await response.json();
      setCalendar(data);
      setCurrentWeekIndex(0);
    } catch (error) {
      console.error('Error generating calendar:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCalendar = async () => {
    if (!calendar) return;

    try {
      const response = await fetch('/api/calendar?action=export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calendar),
      });

      if (!response.ok) throw new Error('Failed to export calendar');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'content-calendar.ics';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting calendar:', error);
    }
  };

  const togglePlatform = (platform: Platform) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const toggleGoal = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal],
    }));
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center space-x-3">
            <Calendar className="w-8 h-8 text-indigo-500" />
            <span>AI Content Calendar</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Generate a 30-day content posting plan with AI-powered suggestions
          </p>
        </div>

        {/* Calendar Generator Form */}
        {!calendar && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
                Generate Your Content Calendar
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Business Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Business Type
                </label>
                <input
                  type="text"
                  value={formData.businessType}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessType: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  placeholder="e.g., Fashion & Apparel"
                />
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Target Audience
                </label>
                <input
                  type="text"
                  value={formData.targetAudience}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  placeholder="e.g., Gen Z and Millennials in India"
                />
              </div>

              {/* Brand Voice */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Brand Voice
                </label>
                <select
                  value={formData.brandVoice}
                  onChange={(e) => setFormData(prev => ({ ...prev, brandVoice: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                >
                  <option value="casual">Casual & Friendly</option>
                  <option value="professional">Professional</option>
                  <option value="inspiring">Inspiring & Motivational</option>
                  <option value="humorous">Fun & Humorous</option>
                </select>
              </div>

              {/* Posts Per Week */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Posts Per Week
                </label>
                <select
                  value={formData.postsPerWeek}
                  onChange={(e) => setFormData(prev => ({ ...prev, postsPerWeek: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                >
                  <option value={3}>3 posts/week</option>
                  <option value={5}>5 posts/week</option>
                  <option value={7}>7 posts/week (Daily)</option>
                  <option value={10}>10 posts/week</option>
                  <option value={14}>14 posts/week (2x Daily)</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* Platforms Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Target Platforms
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['instagram', 'twitter', 'linkedin', 'facebook'] as Platform[]).map((platform) => (
                    <button
                      key={platform}
                      onClick={() => togglePlatform(platform)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                        formData.platforms.includes(platform)
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {platformIcons[platform]}
                      <span className="capitalize">{platform}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Goals Selection */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Content Goals
              </label>
              <div className="flex flex-wrap gap-2">
                {['engagement', 'sales', 'awareness', 'traffic', 'community'].map((goal) => (
                  <button
                    key={goal}
                    onClick={() => toggleGoal(goal)}
                    className={`px-3 py-2 rounded-lg border transition-colors ${
                      formData.goals.includes(goal)
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="capitalize">{goal}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <div className="mt-8">
              <button
                onClick={handleGenerateCalendar}
                disabled={isGenerating || formData.platforms.length === 0}
                className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating your calendar...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Generate 30-Day Calendar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Generated Calendar View */}
        {calendar && (
          <>
            {/* Calendar Header */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                    {calendar.month} {calendar.year}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    {calendar.totalPosts} posts planned for {calendar.businessType}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleExportCalendar}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    <span>Export to Calendar</span>
                  </button>
                  <button
                    onClick={() => setCalendar(null)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
                  >
                    <RefreshCw className="w-5 h-5" />
                    <span>New Calendar</span>
                  </button>
                </div>
              </div>

              {/* Platform Distribution */}
              <div className="mt-6 flex flex-wrap gap-4">
                {Object.entries(calendar.platformDistribution).map(([platform, count]) => (
                  count > 0 && (
                    <div
                      key={platform}
                      className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700"
                    >
                      <div className={`p-1.5 rounded ${platformColors[platform as Platform]}`}>
                        {platformIcons[platform as Platform]}
                      </div>
                      <span className="text-slate-600 dark:text-slate-300 capitalize">{platform}</span>
                      <span className="font-semibold text-slate-800 dark:text-white">{count}</span>
                    </div>
                  )
                ))}
              </div>
            </div>

            {/* Week Navigator */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentWeekIndex(i => Math.max(0, i - 1))}
                disabled={currentWeekIndex === 0}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Previous Week</span>
              </button>
              
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                  Week {calendar.weeks[currentWeekIndex]?.weekNumber}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {calendar.weeks[currentWeekIndex]?.theme}
                </p>
              </div>
              
              <button
                onClick={() => setCurrentWeekIndex(i => Math.min(calendar.weeks.length - 1, i + 1))}
                disabled={currentWeekIndex === calendar.weeks.length - 1}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                <span>Next Week</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Posts Grid */}
            <div className="grid gap-4">
              {calendar.weeks[currentWeekIndex]?.posts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => {
                    setSelectedPost(post);
                    setGeneratedContent(null);
                    setActionSuccess(null);
                  }}
                  className={`bg-white dark:bg-slate-800 rounded-xl border-l-4 ${priorityColors[post.priority]} border border-slate-200 dark:border-slate-700 p-4 cursor-pointer hover:shadow-lg transition-shadow`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`p-1.5 rounded text-white ${platformColors[post.platform]}`}>
                          {platformIcons[post.platform]}
                        </div>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {new Date(post.date).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span className="flex items-center space-x-1 text-sm text-slate-500 dark:text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{post.time} IST</span>
                        </span>
                        <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-400">
                          {categoryIcons[post.category]}
                          <span className="capitalize">{post.category}</span>
                        </span>
                      </div>
                      
                      <h4 className="font-semibold text-slate-800 dark:text-white">
                        {post.topic}
                      </h4>
                      
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                        {post.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mt-3">
                        {post.hashtags.slice(0, 5).map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                        {post.hashtags.length > 5 && (
                          <span className="text-xs text-slate-500">
                            +{post.hashtags.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-4 text-right">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        post.priority === 'high' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                        post.priority === 'medium' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {post.priority} priority
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Post Detail Modal */}
            {selectedPost && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg text-white ${platformColors[selectedPost.platform]}`}>
                        {platformIcons[selectedPost.platform]}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-white">
                          Post Details
                        </h3>
                        <p className="text-sm text-slate-500">
                          {new Date(selectedPost.date).toLocaleDateString('en-IN', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })} at {selectedPost.time} IST
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedPost(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-1">Topic</h4>
                      <p className="text-lg font-semibold text-slate-800 dark:text-white">
                        {selectedPost.topic}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-1">Content Guidelines</h4>
                      <p className="text-slate-700 dark:text-slate-300">
                        {selectedPost.description}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-2">Hashtags</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedPost.hashtags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div>
                        <h4 className="text-sm font-medium text-slate-500 mb-1">Category</h4>
                        <span className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                          {categoryIcons[selectedPost.category]}
                          <span className="capitalize">{selectedPost.category}</span>
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-slate-500 mb-1">Priority</h4>
                        <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                          selectedPost.priority === 'high' ? 'bg-red-100 text-red-600' :
                          selectedPost.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-green-100 text-green-600'
                        }`}>
                          {selectedPost.priority}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-slate-500 mb-1">Status</h4>
                        <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                          selectedPost.status === 'scheduled' 
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                        }`}>
                          {selectedPost.status === 'scheduled' ? 'Scheduled' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Generated Content Preview */}
                  {generatedContent && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2 flex items-center space-x-2">
                        <Check className="w-4 h-4" />
                        <span>Generated Content</span>
                      </h4>
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {generatedContent}
                      </p>
                    </div>
                  )}

                  {/* Success/Error Message */}
                  {actionSuccess && (
                    <div className={`mt-4 p-3 rounded-lg text-sm ${
                      actionSuccess.includes('Failed') 
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    }`}>
                      {actionSuccess}
                    </div>
                  )}

                  <div className="mt-6 flex flex-col space-y-3">
                    <div className="flex space-x-3">
                      <button 
                        onClick={handleGenerateContent}
                        disabled={isGeneratingContent}
                        className="flex-1 px-4 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                      >
                        {isGeneratingContent ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Generate Content</span>
                          </>
                        )}
                      </button>
                      <button 
                        onClick={handleSchedulePost}
                        disabled={isScheduling || selectedPost.status === 'scheduled'}
                        className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                      >
                        {isScheduling ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Scheduling...</span>
                          </>
                        ) : selectedPost.status === 'scheduled' ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Already Scheduled</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4" />
                            <span>Schedule Post</span>
                          </>
                        )}
                      </button>
                    </div>
                    <button 
                      onClick={handleOpenInGenerator}
                      className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Target className="w-4 h-4" />
                      <span>Open in Full Generator</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
