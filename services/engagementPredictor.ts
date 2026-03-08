import culturalContext from '../datasets/cultural_context.json';
import type { Platform } from '../types';

/**
 * Engagement Prediction Engine
 * Uses a RandomForest-like approach with multiple decision trees
 * Features: post length, emoji count, hashtag count, sentiment score, cultural keyword matches
 */

export interface EngagementFeatures {
  postLength: number;
  emojiCount: number;
  hashtagCount: number;
  sentimentScore: number;
  culturalKeywordMatches: number;
  hasCallToAction: boolean;
  hasQuestion: boolean;
  hasNewlines: boolean;
  wordCount: number;
  avgWordLength: number;
  hasUrl: boolean;
  mentionCount: number;
  capsRatio: number;
  punctuationDensity: number;
}

export interface EngagementPredictionResult {
  score: number;
  confidence: number;
  factors: {
    timing: number;
    hashtags: number;
    contentQuality: number;
    culturalRelevance: number;
    sentiment: number;
    readability: number;
  };
  recommendations: string[];
  bestPostingTime: string;
  estimatedReach: {
    low: number;
    mid: number;
    high: number;
  };
  improvementSuggestions: Array<{
    factor: string;
    currentScore: number;
    suggestion: string;
    potentialImprovement: number;
  }>;
}

type SocialMediaPlatform = keyof typeof culturalContext.social_media_trends;

// Regex patterns
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu;
const HASHTAG_REGEX = /#[\w\u0900-\u097F]+/g;
const MENTION_REGEX = /@[\w]+/g;
const URL_REGEX = /https?:\/\/[^\s]+/g;
const CTA_PATTERNS = /\b(shop|buy|click|order|subscribe|follow|like|share|comment|save|dm|link in bio|swipe up|tap|check out|discover|explore|get|grab|hurry|limited|exclusive|now available)\b/gi;
const QUESTION_REGEX = /\?|कैसे|क्या|कौन|कहाँ|कब|क्यों/g;

// Sentiment lexicon for basic sentiment analysis
const POSITIVE_WORDS = [
  'amazing', 'awesome', 'beautiful', 'best', 'brilliant', 'celebrate', 'creative',
  'delightful', 'elegant', 'excellent', 'exclusive', 'fantastic', 'gorgeous', 'great',
  'happy', 'incredible', 'innovative', 'inspiring', 'love', 'lovely', 'magical',
  'magnificent', 'outstanding', 'perfect', 'premium', 'proud', 'remarkable', 'stunning',
  'superb', 'unique', 'wonderful', 'सुंदर', 'अद्भुत', 'शानदार', 'प्यारा', 'खुश',
];

const NEGATIVE_WORDS = [
  'bad', 'boring', 'cheap', 'disappointing', 'dull', 'expensive', 'failed', 'hate',
  'horrible', 'mediocre', 'poor', 'sad', 'terrible', 'ugly', 'worst', 'बुरा', 'खराब',
];

// Cultural keywords from the context
const CULTURAL_KEYWORDS = [
  ...culturalContext.festivals,
  ...culturalContext.sustainability_keywords.english,
  ...culturalContext.sustainability_keywords.hindi,
  ...culturalContext.fashion_themes.traditional,
  ...culturalContext.fashion_themes.sustainable,
  ...Object.values(culturalContext.cultural_themes).flat(),
];

/**
 * Extract features from content
 */
export function extractFeatures(content: string): EngagementFeatures {
  const text = content.toLowerCase();
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const emojiMatches = content.match(EMOJI_REGEX) || [];
  const hashtagMatches = content.match(HASHTAG_REGEX) || [];
  const mentionMatches = content.match(MENTION_REGEX) || [];
  const ctaMatches = content.match(CTA_PATTERNS) || [];
  const questionMatches = content.match(QUESTION_REGEX) || [];
  const urlMatches = content.match(URL_REGEX) || [];
  
  // Calculate sentiment score
  let positiveCount = 0;
  let negativeCount = 0;
  
  POSITIVE_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = content.match(regex);
    if (matches) positiveCount += matches.length;
  });
  
  NEGATIVE_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = content.match(regex);
    if (matches) negativeCount += matches.length;
  });
  
  const total = positiveCount + negativeCount;
  const sentimentScore = total > 0 ? (positiveCount - negativeCount) / total : 0;
  
  // Cultural keyword matches
  let culturalMatches = 0;
  CULTURAL_KEYWORDS.forEach(keyword => {
    if (text.includes(keyword.toLowerCase())) {
      culturalMatches++;
    }
  });
  
  // Caps ratio (excluding emojis and hashtags)
  const alphaChars = content.replace(/[^a-zA-Z]/g, '');
  const upperChars = content.replace(/[^A-Z]/g, '');
  const capsRatio = alphaChars.length > 0 ? upperChars.length / alphaChars.length : 0;
  
  // Punctuation density
  const punctuation = content.match(/[!.,;:?'"]/g) || [];
  const punctuationDensity = words.length > 0 ? punctuation.length / words.length : 0;
  
  return {
    postLength: content.length,
    emojiCount: emojiMatches.length,
    hashtagCount: hashtagMatches.length,
    sentimentScore: (sentimentScore + 1) / 2, // Normalize to 0-1
    culturalKeywordMatches: culturalMatches,
    hasCallToAction: ctaMatches.length > 0,
    hasQuestion: questionMatches.length > 0,
    hasNewlines: content.includes('\n'),
    wordCount: words.length,
    avgWordLength: words.length > 0 ? words.reduce((sum, w) => sum + w.length, 0) / words.length : 0,
    hasUrl: urlMatches.length > 0,
    mentionCount: mentionMatches.length,
    capsRatio,
    punctuationDensity,
  };
}

/**
 * Decision Tree implementation for the Random Forest
 */
interface DecisionNode {
  feature?: keyof EngagementFeatures;
  threshold?: number;
  left?: DecisionNode;
  right?: DecisionNode;
  value?: number;
}

/**
 * Create a decision tree for engagement prediction
 */
function createDecisionTree(treeId: number): DecisionNode {
  // Different trees focus on different aspects
  const trees: DecisionNode[] = [
    // Tree 1: Content Quality Focus
    {
      feature: 'postLength',
      threshold: 100,
      left: { value: 0.4 },
      right: {
        feature: 'emojiCount',
        threshold: 2,
        left: { value: 0.55 },
        right: {
          feature: 'hasNewlines',
          threshold: 0.5,
          left: { value: 0.65 },
          right: { value: 0.8 },
        },
      },
    },
    // Tree 2: Engagement Signals Focus
    {
      feature: 'hasCallToAction',
      threshold: 0.5,
      left: {
        feature: 'hashtagCount',
        threshold: 3,
        left: { value: 0.5 },
        right: { value: 0.6 },
      },
      right: {
        feature: 'sentimentScore',
        threshold: 0.6,
        left: { value: 0.65 },
        right: { value: 0.85 },
      },
    },
    // Tree 3: Cultural Relevance Focus
    {
      feature: 'culturalKeywordMatches',
      threshold: 2,
      left: {
        feature: 'wordCount',
        threshold: 30,
        left: { value: 0.45 },
        right: { value: 0.55 },
      },
      right: {
        feature: 'sentimentScore',
        threshold: 0.5,
        left: { value: 0.7 },
        right: { value: 0.9 },
      },
    },
    // Tree 4: Formatting Focus
    {
      feature: 'emojiCount',
      threshold: 1,
      left: { 
        feature: 'postLength',
        threshold: 200,
        left: { value: 0.4 },
        right: { value: 0.55 },
      },
      right: {
        feature: 'hashtagCount',
        threshold: 5,
        left: { value: 0.7 },
        right: { 
          feature: 'hashtagCount',
          threshold: 10,
          left: { value: 0.65 },
          right: { value: 0.5 }, // Too many hashtags
        },
      },
    },
    // Tree 5: Readability Focus
    {
      feature: 'avgWordLength',
      threshold: 6,
      left: {
        feature: 'capsRatio',
        threshold: 0.2,
        left: { value: 0.75 },
        right: { value: 0.5 }, // Too many caps
      },
      right: {
        feature: 'punctuationDensity',
        threshold: 0.3,
        left: { value: 0.6 },
        right: { value: 0.45 },
      },
    },
  ];
  
  return trees[treeId % trees.length];
}

/**
 * Predict using a single decision tree
 */
function predictTree(node: DecisionNode, features: EngagementFeatures): number {
  if (node.value !== undefined) {
    return node.value;
  }
  
  if (!node.feature || node.threshold === undefined) {
    return 0.5; // Default
  }
  
  const featureValue = features[node.feature];
  const numericValue = typeof featureValue === 'boolean' ? (featureValue ? 1 : 0) : featureValue;
  
  if (numericValue <= node.threshold) {
    return node.left ? predictTree(node.left, features) : 0.5;
  } else {
    return node.right ? predictTree(node.right, features) : 0.5;
  }
}

/**
 * Random Forest prediction with confidence estimation
 */
function randomForestPredict(features: EngagementFeatures, numTrees: number = 5): { score: number; confidence: number } {
  const predictions: number[] = [];
  
  for (let i = 0; i < numTrees; i++) {
    const tree = createDecisionTree(i);
    predictions.push(predictTree(tree, features));
  }
  
  // Average prediction
  const score = predictions.reduce((sum, p) => sum + p, 0) / predictions.length;
  
  // Confidence based on variance
  const variance = predictions.reduce((sum, p) => sum + Math.pow(p - score, 2), 0) / predictions.length;
  const confidence = Math.max(0.5, 1 - Math.sqrt(variance));
  
  return { score, confidence };
}

/**
 * Calculate individual factor scores
 */
function calculateFactorScores(features: EngagementFeatures, platform: Platform): {
  timing: number;
  hashtags: number;
  contentQuality: number;
  culturalRelevance: number;
  sentiment: number;
  readability: number;
} {
  // Timing score (based on current time vs optimal times)
  const now = new Date();
  const hour = now.getHours();
  const platformKey = platform as SocialMediaPlatform;
  const platformTrends = culturalContext.social_media_trends[platformKey] || culturalContext.social_media_trends.instagram;
  
  // Parse optimal posting times
  const optimalHours = platformTrends.optimal_posting_times.map(t => {
    const match = t.match(/(\d+)/);
    return match ? parseInt(match[1]) : 12;
  });
  
  const minTimeDiff = Math.min(...optimalHours.map(h => Math.abs(hour - h)));
  const timingScore = Math.max(50, 100 - minTimeDiff * 5);
  
  // Hashtag score
  let hashtagScore: number;
  if (features.hashtagCount === 0) {
    hashtagScore = 40;
  } else if (features.hashtagCount <= 5) {
    hashtagScore = 60 + features.hashtagCount * 8;
  } else if (features.hashtagCount <= 10) {
    hashtagScore = 95 - (features.hashtagCount - 5) * 5;
  } else {
    hashtagScore = 60 - (features.hashtagCount - 10) * 3;
  }
  hashtagScore = Math.max(30, Math.min(100, hashtagScore));
  
  // Content quality score
  let contentQualityScore = 50;
  if (features.postLength > 100 && features.postLength < 2000) contentQualityScore += 15;
  if (features.emojiCount > 0 && features.emojiCount <= 5) contentQualityScore += 10;
  if (features.hasNewlines) contentQualityScore += 10;
  if (features.hasCallToAction) contentQualityScore += 10;
  if (features.hasQuestion) contentQualityScore += 5;
  contentQualityScore = Math.min(100, contentQualityScore);
  
  // Cultural relevance score
  const culturalRelevanceScore = Math.min(100, 50 + features.culturalKeywordMatches * 10);
  
  // Sentiment score
  const sentimentScoreNormalized = Math.round(features.sentimentScore * 100);
  
  // Readability score
  let readabilityScore = 70;
  if (features.avgWordLength > 3 && features.avgWordLength < 8) readabilityScore += 15;
  if (features.capsRatio < 0.2) readabilityScore += 10;
  if (features.punctuationDensity < 0.3) readabilityScore += 5;
  readabilityScore = Math.min(100, readabilityScore);
  
  return {
    timing: Math.round(timingScore),
    hashtags: Math.round(hashtagScore),
    contentQuality: Math.round(contentQualityScore),
    culturalRelevance: Math.round(culturalRelevanceScore),
    sentiment: sentimentScoreNormalized,
    readability: Math.round(readabilityScore),
  };
}

/**
 * Get best posting time based on platform
 */
function getBestPostingTime(platform: Platform): string {
  const platformKey = platform as SocialMediaPlatform;
  const platformTrends = culturalContext.social_media_trends[platformKey] || culturalContext.social_media_trends.instagram;
  
  const now = new Date();
  const hour = now.getHours();
  
  const optimalTimes = platformTrends.optimal_posting_times;
  const optimalHours = optimalTimes.map(t => {
    const match = t.match(/(\d+)/);
    return match ? parseInt(match[1]) : 12;
  });
  
  // Find next optimal time
  const futureHours = optimalHours.filter(h => h > hour);
  if (futureHours.length > 0) {
    const nextBestHour = Math.min(...futureHours);
    return `${nextBestHour}:00 IST (Today)`;
  } else {
    // Next day
    const nextBestHour = Math.min(...optimalHours);
    return `${nextBestHour}:00 IST (Tomorrow)`;
  }
}

/**
 * Generate improvement suggestions
 */
function generateImprovementSuggestions(
  features: EngagementFeatures,
  factors: ReturnType<typeof calculateFactorScores>,
  platform: Platform
): Array<{
  factor: string;
  currentScore: number;
  suggestion: string;
  potentialImprovement: number;
}> {
  const suggestions: Array<{
    factor: string;
    currentScore: number;
    suggestion: string;
    potentialImprovement: number;
  }> = [];
  
  // Hashtag suggestions
  if (factors.hashtags < 70) {
    if (features.hashtagCount === 0) {
      suggestions.push({
        factor: 'Hashtags',
        currentScore: factors.hashtags,
        suggestion: 'Add 3-5 relevant hashtags to increase discoverability',
        potentialImprovement: 25,
      });
    } else if (features.hashtagCount > 10) {
      suggestions.push({
        factor: 'Hashtags',
        currentScore: factors.hashtags,
        suggestion: 'Reduce hashtags to 5-7 for optimal engagement',
        potentialImprovement: 15,
      });
    }
  }
  
  // Emoji suggestions
  if (features.emojiCount === 0) {
    suggestions.push({
      factor: 'Visual Appeal',
      currentScore: factors.contentQuality,
      suggestion: 'Add 2-3 relevant emojis to make content more engaging',
      potentialImprovement: 10,
    });
  }
  
  // Content length suggestions
  if (features.postLength < 100) {
    suggestions.push({
      factor: 'Content Depth',
      currentScore: factors.contentQuality,
      suggestion: 'Expand content with more details - aim for 150-300 characters',
      potentialImprovement: 20,
    });
  } else if (features.postLength > 2000) {
    suggestions.push({
      factor: 'Readability',
      currentScore: factors.readability,
      suggestion: 'Consider shortening the post for better engagement',
      potentialImprovement: 15,
    });
  }
  
  // CTA suggestions
  if (!features.hasCallToAction) {
    suggestions.push({
      factor: 'Engagement Driver',
      currentScore: factors.contentQuality,
      suggestion: 'Add a clear call-to-action (e.g., "Shop now", "Link in bio")',
      potentialImprovement: 15,
    });
  }
  
  // Cultural relevance suggestions
  if (factors.culturalRelevance < 70) {
    suggestions.push({
      factor: 'Cultural Relevance',
      currentScore: factors.culturalRelevance,
      suggestion: 'Include cultural references (festivals, traditions, Indian themes)',
      potentialImprovement: 20,
    });
  }
  
  // Formatting suggestions
  if (!features.hasNewlines && features.postLength > 200) {
    suggestions.push({
      factor: 'Formatting',
      currentScore: factors.readability,
      suggestion: 'Break content into paragraphs for better readability',
      potentialImprovement: 10,
    });
  }
  
  // Platform-specific suggestions
  const platformKey = platform as SocialMediaPlatform;
  const contentTypes = culturalContext.social_media_trends[platformKey]?.content_types || [];
  
  if (platform === 'instagram' && !features.hasUrl) {
    suggestions.push({
      factor: 'Platform Optimization',
      currentScore: 70,
      suggestion: 'Consider creating a Reel version for higher reach on Instagram',
      potentialImprovement: 25,
    });
  }
  
  if (platform === 'twitter' && features.postLength > 280) {
    suggestions.push({
      factor: 'Platform Compliance',
      currentScore: 50,
      suggestion: 'Shorten to fit Twitter character limit or create a thread',
      potentialImprovement: 30,
    });
  }
  
  // Sort by potential improvement
  suggestions.sort((a, b) => b.potentialImprovement - a.potentialImprovement);
  
  return suggestions.slice(0, 5); // Return top 5 suggestions
}

/**
 * Generate traditional recommendations
 */
function generateRecommendations(
  features: EngagementFeatures,
  factors: ReturnType<typeof calculateFactorScores>,
  platform: Platform
): string[] {
  const recommendations: string[] = [];
  const platformKey = platform as SocialMediaPlatform;
  const platformTrends = culturalContext.social_media_trends[platformKey] || culturalContext.social_media_trends.instagram;
  
  if (factors.hashtags < 70 && features.hashtagCount < 3) {
    recommendations.push(`Add trending hashtags like ${platformTrends.hashtag_patterns.slice(0, 2).join(', ')}`);
  }
  
  if (features.emojiCount === 0) {
    recommendations.push('Add relevant emojis to increase engagement 🎯');
  }
  
  if (features.postLength < 100) {
    recommendations.push('Expand content with more details for better engagement');
  }
  
  if (factors.culturalRelevance < 70) {
    recommendations.push('Include cultural references (festivals, traditions) for Indian audience');
  }
  
  if (!features.hasCallToAction) {
    recommendations.push('Add a call-to-action to drive engagement');
  }
  
  if (!features.hasNewlines && features.postLength > 200) {
    recommendations.push('Break content into paragraphs for better readability');
  }
  
  // Add best posting time
  recommendations.push(`Best posting time: ${getBestPostingTime(platform)}`);
  
  return recommendations;
}

/**
 * Estimate reach based on score and platform
 */
function estimateReach(score: number, platform: Platform): { low: number; mid: number; high: number } {
  // Base reach multipliers per platform
  const platformMultipliers: Record<Platform, number> = {
    instagram: 1.0,
    twitter: 0.8,
    linkedin: 0.6,
    facebook: 0.9,
  };
  
  const multiplier = platformMultipliers[platform] || 1.0;
  const baseReach = 1000; // Assume 1000 followers baseline
  
  const scoreMultiplier = score / 100;
  const estimatedReachMid = Math.round(baseReach * scoreMultiplier * multiplier);
  
  return {
    low: Math.round(estimatedReachMid * 0.7),
    mid: estimatedReachMid,
    high: Math.round(estimatedReachMid * 1.5),
  };
}

/**
 * Main prediction function
 */
export function predictEngagement(
  content: string,
  platform: Platform,
  hashtags: string[] = []
): EngagementPredictionResult {
  // Extract features
  const features = extractFeatures(content);
  
  // Override hashtag count if provided separately
  if (hashtags.length > 0) {
    features.hashtagCount = hashtags.length;
  }
  
  // Get Random Forest prediction
  const { score: rfScore, confidence: rfConfidence } = randomForestPredict(features);
  
  // Calculate factor scores
  const factors = calculateFactorScores(features, platform);
  
  // Combine RF score with factor-based score
  const factorAvg = (
    factors.timing * 0.15 +
    factors.hashtags * 0.20 +
    factors.contentQuality * 0.25 +
    factors.culturalRelevance * 0.20 +
    factors.sentiment * 0.10 +
    factors.readability * 0.10
  );
  
  // Weighted combination
  const finalScore = Math.round(rfScore * 100 * 0.4 + factorAvg * 0.6);
  const finalConfidence = Math.round(rfConfidence * 100) / 100;
  
  // Get recommendations and suggestions
  const recommendations = generateRecommendations(features, factors, platform);
  const improvementSuggestions = generateImprovementSuggestions(features, factors, platform);
  
  // Get best posting time
  const bestPostingTime = getBestPostingTime(platform);
  
  // Estimate reach
  const estimatedReach = estimateReach(finalScore, platform);
  
  return {
    score: Math.min(100, Math.max(0, finalScore)),
    confidence: finalConfidence,
    factors: {
      timing: factors.timing,
      hashtags: factors.hashtags,
      contentQuality: factors.contentQuality,
      culturalRelevance: factors.culturalRelevance,
      sentiment: factors.sentiment,
      readability: factors.readability,
    },
    recommendations,
    bestPostingTime,
    estimatedReach,
    improvementSuggestions,
  };
}

export default {
  predictEngagement,
  extractFeatures,
};
