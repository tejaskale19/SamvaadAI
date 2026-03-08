/**
 * Local Storage Persistence Service
 * 
 * Provides localStorage-based data persistence for when AWS DynamoDB is not configured.
 * This allows the app to function fully in demo/development mode.
 */

// Storage Keys
const STORAGE_KEYS = {
  CONTENT_HISTORY: 'samvaad_content_history',
  SCHEDULED_POSTS: 'samvaad_scheduled_posts',
  ANALYTICS: 'samvaad_analytics',
  USER_PREFERENCES: 'samvaad_user_preferences',
} as const;

// Check if localStorage is available
function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

// Generic storage helpers
function getFromStorage<T>(key: string, defaultValue: T): T {
  if (!isLocalStorageAvailable()) return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

// ============================================================================
// Content History
// ============================================================================

export interface ContentHistoryItem {
  id: string;
  prompt: string;
  platform: string;
  selectedContent: string;
  hashtags: string[];
  translatedContent?: string;
  language?: string;
  status: 'draft' | 'approved' | 'rejected' | 'published' | 'scheduled';
  createdAt: string;
  updatedAt: string;
  engagementScore?: number;
  userId?: string;
}

export function getContentHistory(userId?: string): ContentHistoryItem[] {
  const history = getFromStorage<ContentHistoryItem[]>(STORAGE_KEYS.CONTENT_HISTORY, []);
  if (userId) {
    return history.filter(item => item.userId === userId);
  }
  return history;
}

export function saveContentToHistory(content: ContentHistoryItem): void {
  const history = getContentHistory();
  const existingIndex = history.findIndex(item => item.id === content.id);
  
  if (existingIndex >= 0) {
    history[existingIndex] = { ...content, updatedAt: new Date().toISOString() };
  } else {
    history.unshift({ ...content, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  
  // Keep only last 100 items
  const trimmed = history.slice(0, 100);
  saveToStorage(STORAGE_KEYS.CONTENT_HISTORY, trimmed);
}

export function deleteContentFromHistory(id: string): void {
  const history = getContentHistory();
  const filtered = history.filter(item => item.id !== id);
  saveToStorage(STORAGE_KEYS.CONTENT_HISTORY, filtered);
}

export function updateContentStatus(id: string, status: ContentHistoryItem['status']): void {
  const history = getContentHistory();
  const item = history.find(h => h.id === id);
  if (item) {
    item.status = status;
    item.updatedAt = new Date().toISOString();
    saveToStorage(STORAGE_KEYS.CONTENT_HISTORY, history);
  }
}

// ============================================================================
// Scheduled Posts
// ============================================================================

export interface ScheduledPost {
  id: string;
  contentId: string;
  content: string;
  platform: string;
  scheduledTime: string;
  status: 'scheduled' | 'published' | 'failed' | 'cancelled';
  createdAt: string;
  userId?: string;
}

export function getScheduledPosts(userId?: string): ScheduledPost[] {
  const posts = getFromStorage<ScheduledPost[]>(STORAGE_KEYS.SCHEDULED_POSTS, []);
  if (userId) {
    return posts.filter(post => post.userId === userId);
  }
  return posts;
}

export function schedulePost(post: Omit<ScheduledPost, 'createdAt'>): ScheduledPost {
  const posts = getScheduledPosts();
  const newPost: ScheduledPost = {
    ...post,
    createdAt: new Date().toISOString(),
  };
  posts.push(newPost);
  saveToStorage(STORAGE_KEYS.SCHEDULED_POSTS, posts);
  return newPost;
}

export function updateScheduledPost(id: string, updates: Partial<ScheduledPost>): void {
  const posts = getScheduledPosts();
  const postIndex = posts.findIndex(p => p.id === id);
  if (postIndex >= 0) {
    posts[postIndex] = { ...posts[postIndex], ...updates };
    saveToStorage(STORAGE_KEYS.SCHEDULED_POSTS, posts);
  }
}

export function cancelScheduledPost(id: string): void {
  updateScheduledPost(id, { status: 'cancelled' });
}

// ============================================================================
// Analytics
// ============================================================================

export interface AnalyticsData {
  totalPosts: number;
  publishedPosts: number;
  avgEngagementScore: number;
  platformBreakdown: Record<string, number>;
  languageBreakdown: Record<string, number>;
  weeklyActivity: Array<{ day: string; posts: number }>;
  lastUpdated: string;
}

export function getAnalytics(userId?: string): AnalyticsData {
  const history = getContentHistory(userId);
  
  const platformBreakdown: Record<string, number> = {};
  const languageBreakdown: Record<string, number> = {};
  let totalEngagement = 0;
  let engagementCount = 0;
  
  const weeklyActivity: Record<string, number> = {};
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  days.forEach(day => weeklyActivity[day] = 0);
  
  history.forEach(item => {
    // Platform breakdown
    platformBreakdown[item.platform] = (platformBreakdown[item.platform] || 0) + 1;
    
    // Language breakdown
    if (item.language) {
      languageBreakdown[item.language] = (languageBreakdown[item.language] || 0) + 1;
    }
    
    // Engagement
    if (item.engagementScore) {
      totalEngagement += item.engagementScore;
      engagementCount++;
    }
    
    // Weekly activity
    const dayOfWeek = new Date(item.createdAt).getDay();
    weeklyActivity[days[dayOfWeek]]++;
  });
  
  return {
    totalPosts: history.length,
    publishedPosts: history.filter(h => h.status === 'published').length,
    avgEngagementScore: engagementCount > 0 ? Math.round(totalEngagement / engagementCount) : 0,
    platformBreakdown,
    languageBreakdown,
    weeklyActivity: days.map(day => ({ day, posts: weeklyActivity[day] })),
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================================================
// User Preferences
// ============================================================================

export interface UserPreferences {
  defaultPlatform: string;
  defaultLanguage: string;
  theme: 'light' | 'dark' | 'system';
  emailNotifications: boolean;
  autoTranslate: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultPlatform: 'instagram',
  defaultLanguage: 'Hindi',
  theme: 'system',
  emailNotifications: true,
  autoTranslate: false,
};

export function getUserPreferences(userId?: string): UserPreferences {
  const key = userId ? `${STORAGE_KEYS.USER_PREFERENCES}_${userId}` : STORAGE_KEYS.USER_PREFERENCES;
  return getFromStorage(key, DEFAULT_PREFERENCES);
}

export function saveUserPreferences(preferences: Partial<UserPreferences>, userId?: string): void {
  const key = userId ? `${STORAGE_KEYS.USER_PREFERENCES}_${userId}` : STORAGE_KEYS.USER_PREFERENCES;
  const current = getUserPreferences(userId);
  saveToStorage(key, { ...current, ...preferences });
}

// ============================================================================
// Export all functions
// ============================================================================

export const localPersistence = {
  // Content
  getContentHistory,
  saveContentToHistory,
  deleteContentFromHistory,
  updateContentStatus,
  
  // Scheduled Posts
  getScheduledPosts,
  schedulePost,
  updateScheduledPost,
  cancelScheduledPost,
  
  // Analytics
  getAnalytics,
  
  // Preferences
  getUserPreferences,
  saveUserPreferences,
  
  // Utils
  isLocalStorageAvailable,
};

export default localPersistence;
