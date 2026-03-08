import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type {
  GenerateContentRequest,
  TranslateContentRequest,
  PredictEngagementRequest,
  ApproveContentRequest,
  GeneratedContent,
  LocalizedContent,
  EngagementPrediction,
  ApprovalAction,
} from '../types';

// FastAPI Backend URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

// Create axios instance with auth interceptor
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to get auth token (will be set by AuthContext)
let getAuthToken: (() => string | null) | null = null;

// Set the auth token getter function
export function setAuthTokenGetter(getter: () => string | null): void {
  getAuthToken = getter;
}

// Add auth interceptor to include JWT token in requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (getAuthToken) {
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Error response type
interface ApiErrorResponse {
  error?: string;
  message?: string;
  detail?: string;
}

// Custom error class for API errors
export class ApiError extends Error {
  public statusCode: number;
  public originalError?: Error;

  constructor(message: string, statusCode: number = 500, originalError?: Error) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}

// Error handler helper
function handleApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const statusCode = axiosError.response?.status || 500;
    const message = 
      axiosError.response?.data?.error || 
      axiosError.response?.data?.message || 
      axiosError.response?.data?.detail ||
      axiosError.message ||
      'An unexpected error occurred';
    
    // Log details for debugging
    console.error('[API Error]', {
      url: axiosError.response?.config?.url,
      status: statusCode,
      data: axiosError.response?.data,
    });
    
    // Network errors
    if (!axiosError.response) {
      throw new ApiError('Network error. Please check your connection.', 0, error);
    }
    
    // Server errors
    throw new ApiError(message, statusCode, error);
  }
  
  // Generic error
  if (error instanceof Error) {
    throw new ApiError(error.message, 500, error);
  }
  
  throw new ApiError('An unexpected error occurred', 500);
}

// Generate AI Content with 3 variants
export async function generateContent(
  request: GenerateContentRequest
): Promise<GeneratedContent> {
  try {
    const response = await apiClient.post('/generate', {
      prompt: request.prompt,
      platform: request.platform,
      max_variants: request.numberOfVariants,
    });
    const data = response.data;
    // Map backend snake_case fields to frontend interface
    return {
      ...data,
      id: data.content_id ?? data.id,
      timestamp: data.created_at ?? data.timestamp ?? new Date().toISOString(),
    };
  } catch (error) {
    handleApiError(error);
  }
}

// Language name to code mapping for AWS Translate
const LANGUAGE_CODE_MAP: Record<string, string> = {
  english: 'en',
  hindi: 'hi',
  marathi: 'mr',
  tamil: 'ta',
  telugu: 'te',
  bengali: 'bn',
  gujarati: 'gu',
  kannada: 'kn',
  malayalam: 'ml',
  punjabi: 'pa',
};

function toLanguageCode(lang: string): string {
  // If already a code (2 letters), return as-is
  if (lang.length <= 3) return lang.toLowerCase();
  return LANGUAGE_CODE_MAP[lang.toLowerCase()] || lang.toLowerCase();
}

// Translate content to target Indic language (Hindi, Marathi, etc.)
export async function translateContent(
  request: TranslateContentRequest
): Promise<LocalizedContent> {
  try {
    const response = await apiClient.post('/translate', {
      content: request.content,
      source_language: toLanguageCode(request.sourceLanguage),
      target_language: toLanguageCode(request.targetLanguage),
      preserve_emojis: true,
      preserve_hashtags: true,
    });
    const data = response.data;
    // Map backend snake_case response to frontend LocalizedContent interface
    return {
      original: data.original_content ?? data.original ?? '',
      translated: data.translated_content ?? data.translated ?? '',
      language: request.targetLanguage,
      culturalAdaptations: data.cultural_adaptations ?? data.culturalAdaptations ?? [],
      preservedElements: {
        emojis: data.preserved_elements?.emojis ?? data.preservedElements?.emojis ?? [],
        hashtags: data.preserved_elements?.hashtags ?? data.preservedElements?.hashtags ?? [],
        urls: data.preserved_elements?.urls ?? data.preservedElements?.urls ?? [],
      },
    };
  } catch (error) {
    handleApiError(error);
  }
}

// Predict engagement score for content
export async function predictEngagement(
  request: PredictEngagementRequest
): Promise<EngagementPrediction> {
  try {
    const response = await apiClient.post('/predict', {
      content: request.content,
      platform: request.platform,
      hashtags: request.hashtags ?? [],
      posting_time: request.postingTime ?? null,
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

// Approve, reject, or edit content
export async function approveContent(
  request: ApproveContentRequest
): Promise<ApprovalAction> {
  try {
    const response = await apiClient.post('/approve', {
      content_id: request.contentId,
      variant_id: request.variantId,
      action: request.action === 'edit' ? 'approve' : request.action,
      feedback: request.feedback ?? null,
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

// Get all approved content (pending approvals from FastAPI)
export async function getApprovedContent(): Promise<ApprovalAction[]> {
  try {
    const response = await apiClient.get('/approve/pending');
    return response.data.items || response.data;
  } catch (error) {
    handleApiError(error);
  }
}

// Get content history
export async function getContentHistory(): Promise<GeneratedContent[]> {
  try {
    const response = await apiClient.get('/history');
    return response.data.items || response.data;
  } catch (error) {
    handleApiError(error);
  }
}

// Get cultural context data (fallback to local data if not available)
export async function getCulturalContext() {
  try {
    // FastAPI doesn't have this endpoint, use trends instead
    const response = await apiClient.get('/trends/topics');
    return response.data;
  } catch (error) {
    // Return empty object if not available
    console.warn('Cultural context not available from API');
    return {};
  }
}

// Get trending topics
export async function getTrendingTopics(category?: string) {
  try {
    const params = category ? { category } : {};
    const response = await apiClient.get('/trends/topics', { params });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

// Get trending hashtags
export async function getTrendingHashtags(platform: string = 'instagram') {
  try {
    const response = await apiClient.get('/trends/hashtags', { params: { platform } });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

// Get analytics data
export async function getAnalytics(startDate?: string, endDate?: string) {
  try {
    const params: Record<string, string> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await apiClient.get('/analytics', { params });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

// Auth endpoints
export async function login(email: string, password: string) {
  try {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function signup(data: { email: string; password: string; name: string; phone?: string }) {
  try {
    const response = await apiClient.post('/auth/signup', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function getCurrentUser() {
  try {
    const response = await apiClient.get('/auth/me');
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

// ── Publish / Scheduling ──────────────────────────────────────────────────

export interface PublishRequest {
  content_id: string;
  variant_id: string;
  platform: string;
  content: string;
  hashtags?: string[];
  /** ISO-8601 timestamp – omit to publish immediately */
  scheduled_time?: string;
}

export interface PublishResponse {
  publish_id: string;
  status: 'scheduled' | 'publishing' | 'published' | 'failed';
  scheduled_time?: string;
  execution_arn?: string;
  message: string;
}

export interface ScheduledPost {
  schedule_id: string;
  content_id: string;
  platform: string;
  content?: string;
  hashtags?: string[];
  scheduled_time?: string;
  status: string;
  created_at: string;
}

export interface PublishingHistoryEntry {
  history_id?: string;
  publish_id?: string;
  content_id: string;
  platform: string;
  status: string;
  published_at?: string;
  metrics?: Record<string, unknown>;
  created_at: string;
}

/** Schedule content for future publishing or publish immediately */
export async function publishContent(
  request: PublishRequest
): Promise<PublishResponse> {
  try {
    const response = await apiClient.post('/publish', request);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

/** Retrieve the publishing status of a specific job */
export async function getPublishStatus(publishId: string): Promise<PublishResponse> {
  try {
    const response = await apiClient.get(`/publish/${publishId}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

/** Get all scheduled posts for the current user */
export async function getScheduledPosts(
  status: 'pending' | 'published' | 'failed' | 'all' = 'pending'
): Promise<ScheduledPost[]> {
  try {
    const response = await apiClient.get('/calendar/scheduled', {
      params: status !== 'all' ? { status } : undefined,
    });
    return response.data?.posts ?? response.data?.items ?? response.data ?? [];
  } catch (error) {
    handleApiError(error);
  }
}

/** Get publishing history with optional date range */
export async function getPublishingHistory(
  startDate?: string,
  endDate?: string,
  limit = 50
): Promise<PublishingHistoryEntry[]> {
  try {
    const params: Record<string, string | number> = { limit };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await apiClient.get('/history/publishing', { params });
    return response.data?.items ?? response.data ?? [];
  } catch (error) {
    handleApiError(error);
  }
}

/** Get content history with optional filters */
export async function getFilteredContentHistory(options?: {
  platform?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: GeneratedContent[]; total: number; has_more: boolean }> {
  try {
    const response = await apiClient.get('/history', { params: options });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

// Export all functions for easy importing
export const api = {
  // Content
  generateContent,
  translateContent,
  predictEngagement,
  // Approval
  approveContent,
  getApprovedContent,
  // History & Analytics
  getContentHistory,
  getFilteredContentHistory,
  getAnalytics,
  // Publishing & Scheduling
  publishContent,
  getPublishStatus,
  getScheduledPosts,
  getPublishingHistory,
  // Trends & Culture
  getCulturalContext,
  getTrendingTopics,
  getTrendingHashtags,
  // Auth
  login,
  signup,
  getCurrentUser,
};

export default api;
