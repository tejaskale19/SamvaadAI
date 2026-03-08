// Content Generation Types
export interface ContentVariant {
  id: string;
  content: string;
  platform: Platform;
  hashtags: string[];
  tone: 'professional' | 'casual' | 'inspirational' | 'humorous';
  engagementScore?: number;
}

export interface GeneratedContent {
  id: string;
  prompt: string;
  variants: ContentVariant[];
  timestamp: string;
  status: 'draft' | 'approved' | 'rejected' | 'scheduled' | 'published';
  userId?: string; // Associated user ID for authenticated users
  trendData?: {
    recommendations: Array<{
      hashtag: string;
      score: number;
      category: 'trending' | 'relevant' | 'cultural' | 'industry';
      dailyUses?: number;
      growthRate?: number;
    }>;
    analysis: {
      trendingTopics: Array<{
        topic: string;
        category: string;
        trendScore: number;
        relatedHashtags: string[];
        region: string;
        timeframe: string;
      }>;
      recommendedHashtags: Array<{
        hashtag: string;
        score: number;
        category: 'trending' | 'relevant' | 'cultural' | 'industry';
      }>;
      relatedKeywords: string[];
      bestTimeToPost: string[];
      audienceInsights: {
        primaryAgeGroup: string;
        primaryRegions: string[];
        interests: string[];
      };
    };
  };
  metadata?: {
    isAIGenerated?: boolean;
    aiAvailable?: boolean;
  };
}

export interface LocalizedContent {
  original: string;
  translated: string;
  language: string;
  culturalAdaptations: string[];
  preservedElements?: {
    emojis: string[];
    hashtags: string[];
    urls: string[];
  };
}

export interface ImprovementSuggestion {
  factor: string;
  currentScore: number;
  suggestion: string;
  potentialImprovement: number;
}

export interface EngagementPrediction {
  score: number;
  confidence: number;
  factors: {
    timing: number;
    hashtags: number;
    contentQuality: number;
    culturalRelevance: number;
    sentiment?: number;
    readability?: number;
  };
  recommendations: string[];
  bestPostingTime?: string;
  estimatedReach?: {
    low: number;
    mid: number;
    high: number;
  };
  improvementSuggestions?: ImprovementSuggestion[];
}

export type TargetLanguage = 'Hindi' | 'Marathi' | 'Tamil' | 'Telugu' | 'Bengali' | 'Gujarati' | 'Kannada' | 'Malayalam' | 'Punjabi';

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
}

export type Platform = 'instagram' | 'twitter' | 'linkedin' | 'facebook';

export interface ApprovalAction {
  contentId: string;
  variantId: string;
  action: 'approve' | 'reject' | 'edit';
  editedContent?: string;
  feedback?: string;
  approvedAt?: string;
  userId?: string; // Associated user ID for authenticated users
}

// API Request/Response Types
export interface GenerateContentRequest {
  prompt: string;
  platform: Platform;
  targetAudience?: string;
  culturalContext?: string;
  numberOfVariants?: number;
}

export interface TranslateContentRequest {
  content: string;
  sourceLanguage: string;
  targetLanguage: string;
  preserveCulturalContext: boolean;
}

export interface PredictEngagementRequest {
  content: string;
  platform: Platform;
  postingTime?: string;
  hashtags?: string[];
}

export interface ApproveContentRequest {
  contentId: string;
  variantId: string;
  action: 'approve' | 'reject' | 'edit';
  editedContent?: string;
  feedback?: string;
}

// App State
export interface AppState {
  currentPrompt: string;
  generatedContent: GeneratedContent | null;
  localizedContent: LocalizedContent[];
  engagementPredictions: Record<string, EngagementPrediction>;
  approvedContent: ApprovalAction[];
  isLoading: boolean;
  error: string | null;
}

// Cultural Context
export interface CulturalContext {
  festivals: string[];
  cultural_themes: {
    family: string[];
    values: string[];
    celebrations: string[];
  };
  regional_contexts: Record<string, {
    languages: string[];
    festivals: string[];
    themes: string[];
  }>;
  social_media_trends: Record<string, {
    hashtag_patterns: string[];
    content_types: string[];
    optimal_posting_times: string[];
  }>;
  sustainability_keywords: {
    hindi: string[];
    english: string[];
  };
  fashion_themes: {
    traditional: string[];
    modern: string[];
    sustainable: string[];
  };
}
