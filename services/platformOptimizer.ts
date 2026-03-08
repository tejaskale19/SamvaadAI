/**
 * Platform Optimizer Service
 * Automatically optimizes content for different social media platforms
 * Applies platform-specific rules for tone, format, and engagement elements
 */

import type { Platform } from '../types';
import { generateHashtagRecommendations } from './trendService';

export interface PlatformConfig {
  name: Platform;
  displayName: string;
  maxLength: number;
  supportsHashtags: boolean;
  maxHashtags: number;
  supportsEmojis: boolean;
  optimalEmojiCount: number;
  tone: 'professional' | 'casual' | 'mixed';
  contentFormat: 'short' | 'medium' | 'long' | 'storytelling';
  features: string[];
}

export interface OptimizedContent {
  platform: Platform;
  content: string;
  hashtags: string[];
  characterCount: number;
  emojiCount: number;
  readabilityScore: number;
  optimizations: string[];
  platformTips: string[];
}

// Platform-specific configurations
const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  instagram: {
    name: 'instagram',
    displayName: 'Instagram',
    maxLength: 2200,
    supportsHashtags: true,
    maxHashtags: 30,
    supportsEmojis: true,
    optimalEmojiCount: 5,
    tone: 'casual',
    contentFormat: 'medium',
    features: ['Stories', 'Reels', 'Carousel', 'Shop tags'],
  },
  twitter: {
    name: 'twitter',
    displayName: 'Twitter/X',
    maxLength: 280,
    supportsHashtags: true,
    maxHashtags: 3,
    supportsEmojis: true,
    optimalEmojiCount: 2,
    tone: 'casual',
    contentFormat: 'short',
    features: ['Threads', 'Polls', 'Spaces'],
  },
  linkedin: {
    name: 'linkedin',
    displayName: 'LinkedIn',
    maxLength: 3000,
    supportsHashtags: true,
    maxHashtags: 5,
    supportsEmojis: false,
    optimalEmojiCount: 0,
    tone: 'professional',
    contentFormat: 'long',
    features: ['Articles', 'Documents', 'Newsletters'],
  },
  facebook: {
    name: 'facebook',
    displayName: 'Facebook',
    maxLength: 63206,
    supportsHashtags: true,
    maxHashtags: 5,
    supportsEmojis: true,
    optimalEmojiCount: 3,
    tone: 'mixed',
    contentFormat: 'storytelling',
    features: ['Stories', 'Reels', 'Events', 'Groups'],
  },
};

// Emoji replacements for professional content
const EMOJI_TO_TEXT: Record<string, string> = {
  '🌿': '•',
  '✨': '',
  '💚': '',
  '🇮🇳': '(India)',
  '🌱': '',
  '🌍': '',
  '💫': '',
  '👋': '',
  '👨‍👩‍👧‍👦': '',
  '🎯': '•',
  '📈': '',
  '🚀': '',
  '💡': '•',
  '❤️': '',
  '🔥': '',
  '💪': '',
  '🙌': '',
  '👏': '',
  '🎉': '',
  '⭐': '•',
  '✅': '•',
  '➡️': '→',
  '👇': 'below',
  '👆': 'above',
  '💼': '',
  '📊': '',
  '📱': '',
  '💻': '',
  '🛒': '',
  '🛍️': '',
};

// Casual phrases for Instagram/Twitter
const CASUAL_INTROS = [
  'Hey there! 👋',
  'What\'s up, fam! 🙌',
  'OMG, you NEED to see this! ✨',
  'Plot twist: ',
  'Here\'s the tea ☕',
  'Real talk: ',
  'PSA: ',
  'Hot take: 🔥',
];

// Professional phrases for LinkedIn
const PROFESSIONAL_INTROS = [
  'I\'m excited to share that ',
  'We are proud to announce ',
  'Here\'s an important update: ',
  'I wanted to share some insights on ',
  'After careful consideration, ',
  'In my experience, ',
  'Industry insight: ',
  'A key observation: ',
];

// Storytelling phrases for Facebook
const STORYTELLING_INTROS = [
  'Let me tell you a story... ',
  'Picture this: ',
  'It all started when ',
  'You won\'t believe what happened... ',
  'Here\'s something close to my heart: ',
  'I have been meaning to share this with you all... ',
  'This journey has been incredible. ',
  'Remember when we thought ',
];

/**
 * Remove emojis from content
 */
function removeEmojis(content: string): string {
  // Replace known emojis with text equivalents
  let result = content;
  Object.entries(EMOJI_TO_TEXT).forEach(([emoji, text]) => {
    result = result.replace(new RegExp(emoji, 'g'), text);
  });
  
  // Remove remaining emojis
  result = result.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]/gu, '');
  
  // Clean up multiple spaces
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}

/**
 * Count emojis in content
 */
function countEmojis(content: string): number {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]/gu;
  const matches = content.match(emojiRegex);
  return matches ? matches.length : 0;
}

/**
 * Add emojis to content if missing
 */
function enhanceWithEmojis(content: string, targetCount: number): string {
  const currentCount = countEmojis(content);
  if (currentCount >= targetCount) return content;
  
  const emojisToAdd = ['✨', '🌟', '💫', '🎯', '🚀'];
  let enhanced = content;
  
  // Add emoji at the start if none
  if (currentCount === 0 && targetCount > 0) {
    enhanced = '✨ ' + enhanced;
  }
  
  // Add emoji at the end
  if (countEmojis(enhanced) < targetCount) {
    enhanced = enhanced + ' ✨';
  }
  
  return enhanced;
}

/**
 * Convert content to professional tone
 */
function toProfessionalTone(content: string): string {
  let result = content;
  
  // Remove casual expressions
  const casualReplacements: Record<string, string> = {
    'hey': 'Hello',
    'hi there': 'Greetings',
    'what\'s up': 'I hope this finds you well',
    'fam': 'community',
    'folks': 'colleagues',
    'check out': 'I invite you to explore',
    'drop a': 'please leave a',
    'super': 'exceptionally',
    'awesome': 'excellent',
    'cool': 'impressive',
    'huge': 'significant',
    'game changer': 'transformative',
    'OMG': '',
    'LOL': '',
    'YOLO': '',
    'vibes': 'atmosphere',
    'insane': 'remarkable',
    'crazy': 'extraordinary',
    'epic': 'outstanding',
    'lit': 'impressive',
    'dope': 'excellent',
    'legit': 'genuine',
    'lowkey': 'somewhat',
    'highkey': 'significantly',
    'tbh': 'to be honest',
    'ngl': 'honestly',
    'fr fr': 'genuinely',
    'no cap': 'truthfully',
  };
  
  Object.entries(casualReplacements).forEach(([casual, professional]) => {
    const regex = new RegExp(`\\b${casual}\\b`, 'gi');
    result = result.replace(regex, professional);
  });
  
  // Remove emojis
  result = removeEmojis(result);
  
  // Clean up exclamation marks (max 1)
  result = result.replace(/!+/g, '.');
  
  return result;
}

/**
 * Convert content to casual tone
 */
function toCasualTone(content: string): string {
  let result = content;
  
  const formalReplacements: Record<string, string> = {
    'we are pleased to': 'we\'re super excited to',
    'i am excited': 'I\'m SO excited',
    'exceptional': 'amazing',
    'extraordinary': 'incredible',
    'significant': 'huge',
    'commence': 'start',
    'utilize': 'use',
    'facilitate': 'help',
    'regarding': 'about',
    'subsequently': 'then',
    'however': 'but',
    'nevertheless': 'still',
    'furthermore': 'plus',
    'in addition': 'also',
    'therefore': 'so',
    'consequently': 'so',
    'purchase': 'buy',
    'inquire': 'ask',
  };
  
  Object.entries(formalReplacements).forEach(([formal, casual]) => {
    const regex = new RegExp(formal, 'gi');
    result = result.replace(regex, casual);
  });
  
  return result;
}

/**
 * Convert content to storytelling format
 */
function toStorytellingFormat(content: string): string {
  const lines = content.split('\n').filter(line => line.trim());
  
  // Check if already in storytelling format
  const hasStoryElements = STORYTELLING_INTROS.some(intro => 
    content.toLowerCase().includes(intro.toLowerCase().trim())
  );
  
  if (hasStoryElements || lines.length < 2) {
    return content;
  }
  
  // Add storytelling elements
  const intro = STORYTELLING_INTROS[Math.floor(Math.random() * STORYTELLING_INTROS.length)];
  
  // Restructure for storytelling
  let story = intro + '\n\n';
  
  // First line as the hook
  story += lines[0] + '\n\n';
  
  // Middle content
  if (lines.length > 2) {
    story += '💭 ' + lines.slice(1, -1).join('\n\n') + '\n\n';
  }
  
  // Conclusion/CTA
  story += '✨ ' + lines[lines.length - 1];
  
  return story;
}

/**
 * Shorten content for Twitter
 */
function shortenForTwitter(content: string, maxLength: number = 280): string {
  // Remove hashtags temporarily
  const hashtagRegex = /#[\w\u0900-\u097F]+/g;
  const hashtags = content.match(hashtagRegex) || [];
  let shortened = content.replace(hashtagRegex, '').trim();
  
  // If already short enough, return with hashtags
  if (shortened.length <= maxLength - 30) {
    return shortened + (hashtags.length > 0 ? '\n\n' + hashtags.slice(0, 2).join(' ') : '');
  }
  
  // Extract key message
  const sentences = shortened.split(/[.!?]+/).filter(s => s.trim());
  
  if (sentences.length === 0) {
    return shortened.slice(0, maxLength - 30) + '...' + 
      (hashtags.length > 0 ? '\n\n' + hashtags.slice(0, 2).join(' ') : '');
  }
  
  // Take first sentence and shorten if needed
  let tweet = sentences[0].trim();
  
  if (tweet.length > maxLength - 50) {
    tweet = tweet.slice(0, maxLength - 50) + '...';
  }
  
  // Add one hashtag if space
  if (hashtags.length > 0 && tweet.length < maxLength - 20) {
    tweet += '\n\n' + hashtags[0];
  }
  
  return tweet;
}

/**
 * Optimize content for a specific platform
 */
export function optimizeForPlatform(
  content: string,
  targetPlatform: Platform,
  originalHashtags: string[] = []
): OptimizedContent {
  const config = PLATFORM_CONFIGS[targetPlatform];
  const optimizations: string[] = [];
  const platformTips: string[] = [];
  let optimizedContent = content;
  let hashtags = [...originalHashtags];
  
  // Apply platform-specific transformations
  switch (targetPlatform) {
    case 'instagram':
      // Ensure casual tone with emojis
      optimizedContent = toCasualTone(optimizedContent);
      optimizedContent = enhanceWithEmojis(optimizedContent, config.optimalEmojiCount);
      optimizations.push('Applied casual, engaging tone');
      optimizations.push('Enhanced with emojis for visual appeal');
      
      // Ensure hashtags
      if (hashtags.length < 10) {
        const additionalHashtags = generateHashtagRecommendations(content, 'instagram', 15 - hashtags.length);
        hashtags = [...hashtags, ...additionalHashtags.map(h => h.hashtag)];
        optimizations.push('Added trending hashtags for discoverability');
      }
      
      platformTips.push('Consider creating a Reel for 2x more reach');
      platformTips.push('Use carousel posts for educational content');
      platformTips.push('Add a call-to-action in the first line');
      break;
      
    case 'twitter':
      // Shorten and make punchy
      optimizedContent = shortenForTwitter(optimizedContent, config.maxLength);
      optimizations.push('Shortened for Twitter character limit');
      optimizations.push('Made content punchy and shareable');
      
      // Limit hashtags
      hashtags = hashtags.slice(0, config.maxHashtags);
      if (hashtags.length > 0) {
        optimizations.push('Limited to optimal hashtag count');
      }
      
      platformTips.push('Create a thread for longer content');
      platformTips.push('Use polls to boost engagement');
      platformTips.push('Tweet during peak hours: 9 AM, 12 PM, 5 PM IST');
      break;
      
    case 'linkedin':
      // Professional tone, remove emojis
      optimizedContent = toProfessionalTone(optimizedContent);
      optimizations.push('Applied professional business tone');
      optimizations.push('Removed casual elements and excessive emojis');
      
      // Limit hashtags for LinkedIn
      hashtags = hashtags.slice(0, config.maxHashtags);
      
      // Add line breaks for readability
      if (!optimizedContent.includes('\n\n')) {
        const sentences = optimizedContent.split('. ');
        if (sentences.length > 3) {
          optimizedContent = sentences.slice(0, 2).join('. ') + '.\n\n' +
            sentences.slice(2, 4).join('. ') + '.\n\n' +
            sentences.slice(4).join('. ');
          optimizations.push('Added paragraph breaks for readability');
        }
      }
      
      platformTips.push('Start with a thought-provoking hook');
      platformTips.push('Tag relevant people and companies');
      platformTips.push('Post between 7-8 AM or 5-6 PM for best engagement');
      platformTips.push('Consider writing as a LinkedIn Article for thought leadership');
      break;
      
    case 'facebook':
      // Storytelling format
      optimizedContent = toStorytellingFormat(optimizedContent);
      optimizedContent = toCasualTone(optimizedContent);
      optimizations.push('Converted to storytelling format');
      optimizations.push('Added narrative elements for engagement');
      
      // Moderate hashtags
      hashtags = hashtags.slice(0, config.maxHashtags);
      
      platformTips.push('Use emotionally engaging opening');
      platformTips.push('Include a question to spark comments');
      platformTips.push('Add images or videos for 2.3x more engagement');
      platformTips.push('Best posting times: 1-4 PM on weekdays');
      break;
  }
  
  // Calculate metrics
  const characterCount = optimizedContent.length;
  const emojiCount = countEmojis(optimizedContent);
  
  // Simple readability score (based on sentence length)
  const sentences = optimizedContent.split(/[.!?]+/).filter(s => s.trim());
  const avgWordsPerSentence = sentences.length > 0 
    ? optimizedContent.split(/\s+/).length / sentences.length 
    : 0;
  const readabilityScore = Math.round(Math.max(0, Math.min(100, 100 - (avgWordsPerSentence - 15) * 3)));
  
  return {
    platform: targetPlatform,
    content: optimizedContent,
    hashtags: [...new Set(hashtags)], // Remove duplicates
    characterCount,
    emojiCount,
    readabilityScore,
    optimizations,
    platformTips,
  };
}

/**
 * Optimize content for all platforms at once
 */
export function optimizeForAllPlatforms(
  content: string,
  originalHashtags: string[] = []
): Record<Platform, OptimizedContent> {
  const platforms: Platform[] = ['instagram', 'twitter', 'linkedin', 'facebook'];
  const results: Record<Platform, OptimizedContent> = {} as Record<Platform, OptimizedContent>;
  
  platforms.forEach(platform => {
    results[platform] = optimizeForPlatform(content, platform, originalHashtags);
  });
  
  return results;
}

/**
 * Get platform configuration
 */
export function getPlatformConfig(platform: Platform): PlatformConfig {
  return PLATFORM_CONFIGS[platform];
}

/**
 * Get all platform configurations
 */
export function getAllPlatformConfigs(): PlatformConfig[] {
  return Object.values(PLATFORM_CONFIGS);
}

/**
 * Validate content for platform requirements
 */
export function validateForPlatform(content: string, platform: Platform): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const config = PLATFORM_CONFIGS[platform];
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Check length
  if (content.length > config.maxLength) {
    issues.push(`Content exceeds ${config.displayName} character limit (${content.length}/${config.maxLength})`);
    suggestions.push(`Shorten content by ${content.length - config.maxLength} characters`);
  }
  
  // Check hashtags
  const hashtagCount = (content.match(/#[\w]+/g) || []).length;
  if (hashtagCount > config.maxHashtags) {
    issues.push(`Too many hashtags for ${config.displayName} (${hashtagCount}/${config.maxHashtags})`);
    suggestions.push(`Remove ${hashtagCount - config.maxHashtags} hashtags`);
  }
  
  // Check emojis for LinkedIn
  if (platform === 'linkedin') {
    const emojiCount = countEmojis(content);
    if (emojiCount > 2) {
      issues.push('LinkedIn content should minimize emoji use');
      suggestions.push('Consider removing emojis for a more professional appearance');
    }
  }
  
  // Check for call-to-action
  const ctaPatterns = /\b(click|tap|shop|buy|follow|subscribe|comment|share|like|dm|link)\b/gi;
  if (!ctaPatterns.test(content)) {
    suggestions.push('Add a call-to-action to improve engagement');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
  };
}

export default {
  optimizeForPlatform,
  optimizeForAllPlatforms,
  getPlatformConfig,
  getAllPlatformConfigs,
  validateForPlatform,
};
