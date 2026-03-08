/**
 * Trend Service
 * Provides trending topic analysis and hashtag recommendations
 * Integrates with Google Trends API for real-time trend data
 */

import culturalContext from '../datasets/cultural_context.json';

export interface TrendingTopic {
  topic: string;
  category: string;
  trendScore: number;
  relatedHashtags: string[];
  region: string;
  timeframe: string;
}

export interface HashtagRecommendation {
  hashtag: string;
  score: number;
  category: 'trending' | 'relevant' | 'cultural' | 'industry';
  dailyUses?: number;
  growthRate?: number;
}

export interface TrendAnalysis {
  trendingTopics: TrendingTopic[];
  recommendedHashtags: HashtagRecommendation[];
  relatedKeywords: string[];
  bestTimeToPost: string[];
  audienceInsights: {
    primaryAgeGroup: string;
    primaryRegions: string[];
    interests: string[];
  };
}

// Simulated trending topics for India (in production, use Google Trends API)
const INDIA_TRENDING_TOPICS: TrendingTopic[] = [
  {
    topic: 'Sustainable Fashion',
    category: 'Fashion',
    trendScore: 92,
    relatedHashtags: ['#SustainableFashion', '#EcoFashion', '#SlowFashion', '#ConsciousFashion'],
    region: 'India',
    timeframe: 'Last 7 days',
  },
  {
    topic: 'Make in India',
    category: 'Business',
    trendScore: 88,
    relatedHashtags: ['#MakeInIndia', '#MadeInIndia', '#VocalForLocal', '#IndianBrands'],
    region: 'India',
    timeframe: 'Last 7 days',
  },
  {
    topic: 'Handloom Weaving',
    category: 'Fashion',
    trendScore: 85,
    relatedHashtags: ['#Handloom', '#HandloomDay', '#IndianTextiles', '#WeaversOfIndia'],
    region: 'India',
    timeframe: 'Last 7 days',
  },
  {
    topic: 'Digital India',
    category: 'Technology',
    trendScore: 90,
    relatedHashtags: ['#DigitalIndia', '#TechIndia', '#IndianStartups', '#StartupIndia'],
    region: 'India',
    timeframe: 'Last 7 days',
  },
  {
    topic: 'Indian Entrepreneurs',
    category: 'Business',
    trendScore: 87,
    relatedHashtags: ['#IndianEntrepreneurs', '#StartupLife', '#FounderStories', '#BusinessIndia'],
    region: 'India',
    timeframe: 'Last 7 days',
  },
  {
    topic: 'Eco-Friendly Products',
    category: 'Lifestyle',
    trendScore: 84,
    relatedHashtags: ['#EcoFriendly', '#GoGreen', '#SustainableLiving', '#ZeroWaste'],
    region: 'India',
    timeframe: 'Last 7 days',
  },
  {
    topic: 'Festival Season',
    category: 'Culture',
    trendScore: 95,
    relatedHashtags: ['#FestivalSeason', '#IndianFestivals', '#Diwali', '#FestiveVibes'],
    region: 'India',
    timeframe: 'Last 7 days',
  },
  {
    topic: 'Traditional Art Forms',
    category: 'Art',
    trendScore: 82,
    relatedHashtags: ['#IndianArt', '#TraditionalArt', '#Artisans', '#CraftsOfIndia'],
    region: 'India',
    timeframe: 'Last 7 days',
  },
  {
    topic: 'Wellness & Ayurveda',
    category: 'Health',
    trendScore: 89,
    relatedHashtags: ['#Ayurveda', '#IndianWellness', '#HolisticHealth', '#NaturalRemedies'],
    region: 'India',
    timeframe: 'Last 7 days',
  },
  {
    topic: 'Women Entrepreneurs',
    category: 'Business',
    trendScore: 91,
    relatedHashtags: ['#WomenEntrepreneurs', '#WomenInBusiness', '#SheLeads', '#WomenPower'],
    region: 'India',
    timeframe: 'Last 7 days',
  },
];

// Industry-specific hashtag database
const INDUSTRY_HASHTAGS: Record<string, HashtagRecommendation[]> = {
  fashion: [
    { hashtag: '#IndianFashion', score: 95, category: 'industry', dailyUses: 45000, growthRate: 12 },
    { hashtag: '#DesiStyle', score: 92, category: 'industry', dailyUses: 38000, growthRate: 8 },
    { hashtag: '#EthnicWear', score: 88, category: 'industry', dailyUses: 32000, growthRate: 15 },
    { hashtag: '#FashionBlogger', score: 90, category: 'industry', dailyUses: 120000, growthRate: 5 },
    { hashtag: '#OOTD', score: 96, category: 'industry', dailyUses: 250000, growthRate: 3 },
    { hashtag: '#StyleInspo', score: 87, category: 'industry', dailyUses: 85000, growthRate: 7 },
  ],
  sustainability: [
    { hashtag: '#Sustainable', score: 94, category: 'industry', dailyUses: 95000, growthRate: 20 },
    { hashtag: '#EcoFriendly', score: 92, category: 'industry', dailyUses: 78000, growthRate: 18 },
    { hashtag: '#GreenFashion', score: 86, category: 'industry', dailyUses: 25000, growthRate: 25 },
    { hashtag: '#ConsciousConsumer', score: 83, category: 'industry', dailyUses: 18000, growthRate: 30 },
    { hashtag: '#SlowFashion', score: 89, category: 'industry', dailyUses: 42000, growthRate: 22 },
  ],
  business: [
    { hashtag: '#Entrepreneurship', score: 93, category: 'industry', dailyUses: 150000, growthRate: 8 },
    { hashtag: '#SmallBusiness', score: 95, category: 'industry', dailyUses: 200000, growthRate: 10 },
    { hashtag: '#StartupIndia', score: 88, category: 'industry', dailyUses: 55000, growthRate: 15 },
    { hashtag: '#BusinessGrowth', score: 85, category: 'industry', dailyUses: 65000, growthRate: 12 },
    { hashtag: '#ShopSmall', score: 90, category: 'industry', dailyUses: 85000, growthRate: 18 },
  ],
  culture: [
    { hashtag: '#IncredibleIndia', score: 96, category: 'cultural', dailyUses: 180000, growthRate: 5 },
    { hashtag: '#IndianCulture', score: 91, category: 'cultural', dailyUses: 95000, growthRate: 8 },
    { hashtag: '#IndianHeritage', score: 88, category: 'cultural', dailyUses: 45000, growthRate: 12 },
    { hashtag: '#MadeInIndia', score: 94, category: 'cultural', dailyUses: 120000, growthRate: 15 },
    { hashtag: '#ProudlyIndian', score: 87, category: 'cultural', dailyUses: 38000, growthRate: 10 },
  ],
};

// Keywords for topic detection
const TOPIC_KEYWORDS: Record<string, string[]> = {
  fashion: ['fashion', 'clothing', 'wear', 'style', 'outfit', 'dress', 'collection', 'designer', 'wardrobe'],
  sustainability: ['sustainable', 'eco', 'green', 'organic', 'natural', 'environment', 'conscious', 'ethical'],
  business: ['business', 'startup', 'entrepreneur', 'launch', 'brand', 'company', 'shop', 'store', 'sell'],
  culture: ['indian', 'traditional', 'heritage', 'artisan', 'handmade', 'craft', 'festival', 'cultural'],
  technology: ['tech', 'digital', 'app', 'software', 'innovation', 'ai', 'startup'],
};

/**
 * Extract keywords from user prompt
 */
function extractKeywords(prompt: string): string[] {
  const words = prompt.toLowerCase().split(/\s+/);
  const keywords: string[] = [];
  
  // Extract significant words
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'must', 'and', 'or', 'but', 'if', 'then', 'else', 'when',
    'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
    'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
    'i', 'we', 'you', 'they', 'my', 'our', 'your', 'their', 'this', 'that']);
  
  words.forEach(word => {
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (cleanWord.length > 3 && !stopWords.has(cleanWord)) {
      keywords.push(cleanWord);
    }
  });
  
  return [...new Set(keywords)];
}

/**
 * Detect topics from prompt
 */
function detectTopics(prompt: string): string[] {
  const lowerPrompt = prompt.toLowerCase();
  const detectedTopics: string[] = [];
  
  Object.entries(TOPIC_KEYWORDS).forEach(([topic, keywords]) => {
    const matches = keywords.filter(keyword => lowerPrompt.includes(keyword));
    if (matches.length > 0) {
      detectedTopics.push(topic);
    }
  });
  
  // Default to fashion and culture if no topics detected
  if (detectedTopics.length === 0) {
    detectedTopics.push('fashion', 'culture');
  }
  
  return detectedTopics;
}

/**
 * Generate hashtag recommendations based on prompt and trends
 */
export function generateHashtagRecommendations(
  prompt: string,
  platform: string = 'instagram',
  limit: number = 15
): HashtagRecommendation[] {
  const keywords = extractKeywords(prompt);
  const topics = detectTopics(prompt);
  const recommendations: HashtagRecommendation[] = [];
  const addedHashtags = new Set<string>();
  
  // Add trending hashtags
  INDIA_TRENDING_TOPICS
    .filter(topic => topics.some(t => topic.category.toLowerCase().includes(t)))
    .slice(0, 3)
    .forEach(topic => {
      topic.relatedHashtags.forEach(hashtag => {
        if (!addedHashtags.has(hashtag.toLowerCase())) {
          recommendations.push({
            hashtag,
            score: topic.trendScore,
            category: 'trending',
            dailyUses: Math.floor(Math.random() * 50000) + 10000,
            growthRate: Math.floor(Math.random() * 20) + 5,
          });
          addedHashtags.add(hashtag.toLowerCase());
        }
      });
    });
  
  // Add industry-specific hashtags
  topics.forEach(topic => {
    const industryTags = INDUSTRY_HASHTAGS[topic] || [];
    industryTags.forEach(tag => {
      if (!addedHashtags.has(tag.hashtag.toLowerCase())) {
        recommendations.push(tag);
        addedHashtags.add(tag.hashtag.toLowerCase());
      }
    });
  });
  
  // Add keyword-based hashtags
  keywords.slice(0, 5).forEach(keyword => {
    const hashtag = `#${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`;
    if (!addedHashtags.has(hashtag.toLowerCase())) {
      recommendations.push({
        hashtag,
        score: 60 + Math.floor(Math.random() * 20),
        category: 'relevant',
        dailyUses: Math.floor(Math.random() * 10000) + 1000,
      });
      addedHashtags.add(hashtag.toLowerCase());
    }
  });
  
  // Add cultural hashtags from context
  const platformTrends = culturalContext.social_media_trends[platform as keyof typeof culturalContext.social_media_trends] || 
    culturalContext.social_media_trends.instagram;
  
  platformTrends.hashtag_patterns.forEach(hashtag => {
    if (!addedHashtags.has(hashtag.toLowerCase())) {
      recommendations.push({
        hashtag,
        score: 85,
        category: 'cultural',
        dailyUses: Math.floor(Math.random() * 30000) + 5000,
      });
      addedHashtags.add(hashtag.toLowerCase());
    }
  });
  
  // Sort by score and limit
  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get trending topics for India
 */
export function getTrendingTopicsIndia(
  category?: string,
  limit: number = 10
): TrendingTopic[] {
  let topics = [...INDIA_TRENDING_TOPICS];
  
  if (category) {
    topics = topics.filter(t => t.category.toLowerCase() === category.toLowerCase());
  }
  
  // Simulate real-time updates by randomizing scores slightly
  topics = topics.map(topic => ({
    ...topic,
    trendScore: Math.min(100, Math.max(0, topic.trendScore + (Math.random() * 6 - 3))),
  }));
  
  return topics
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, limit);
}

/**
 * Analyze trends related to a prompt
 */
export function analyzeTrends(prompt: string, platform: string = 'instagram'): TrendAnalysis {
  const keywords = extractKeywords(prompt);
  const topics = detectTopics(prompt);
  const recommendedHashtags = generateHashtagRecommendations(prompt, platform);
  
  // Get related trending topics
  const trendingTopics = INDIA_TRENDING_TOPICS
    .filter(topic => {
      const topicWords = topic.topic.toLowerCase().split(' ');
      return keywords.some(kw => topicWords.some(tw => tw.includes(kw) || kw.includes(tw))) ||
        topics.includes(topic.category.toLowerCase());
    })
    .slice(0, 5);
  
  // Get platform-specific posting times
  const platformTrends = culturalContext.social_media_trends[platform as keyof typeof culturalContext.social_media_trends] || 
    culturalContext.social_media_trends.instagram;
  
  return {
    trendingTopics,
    recommendedHashtags,
    relatedKeywords: keywords,
    bestTimeToPost: platformTrends.optimal_posting_times,
    audienceInsights: {
      primaryAgeGroup: '25-34',
      primaryRegions: ['Mumbai', 'Delhi', 'Bangalore', 'Kolkata', 'Chennai'],
      interests: topics.map(t => t.charAt(0).toUpperCase() + t.slice(1)),
    },
  };
}

/**
 * Google Trends API Integration (placeholder for production)
 * In production, replace with actual Google Trends API calls
 */
export async function fetchGoogleTrends(
  keyword: string,
  region: string = 'IN'
): Promise<TrendingTopic[]> {
  // Note: In production, use google-trends-api or official Google Trends API
  // npm install google-trends-api
  // 
  // const googleTrends = require('google-trends-api');
  // const results = await googleTrends.interestOverTime({
  //   keyword: keyword,
  //   geo: region,
  //   startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  // });
  
  // For demo, return simulated data based on keyword
  const simulatedTopics = INDIA_TRENDING_TOPICS.filter(topic =>
    topic.topic.toLowerCase().includes(keyword.toLowerCase()) ||
    topic.relatedHashtags.some(h => h.toLowerCase().includes(keyword.toLowerCase()))
  );
  
  if (simulatedTopics.length === 0) {
    // Create a custom topic
    return [{
      topic: keyword,
      category: 'Custom',
      trendScore: 75 + Math.floor(Math.random() * 20),
      relatedHashtags: [`#${keyword.replace(/\s+/g, '')}`, `#${keyword.split(' ')[0]}`],
      region: 'India',
      timeframe: 'Last 7 days',
    }];
  }
  
  return simulatedTopics;
}

/**
 * Get category-specific trends
 */
export function getCategoryTrends(category: string): {
  topics: TrendingTopic[];
  hashtags: HashtagRecommendation[];
  growingKeywords: string[];
} {
  const topics = getTrendingTopicsIndia(category);
  const hashtags = INDUSTRY_HASHTAGS[category.toLowerCase()] || [];
  
  // Extract growing keywords from hashtags
  const growingKeywords = hashtags
    .filter(h => (h.growthRate || 0) > 15)
    .map(h => h.hashtag.replace('#', ''));
  
  return {
    topics,
    hashtags,
    growingKeywords,
  };
}

export default {
  generateHashtagRecommendations,
  getTrendingTopicsIndia,
  analyzeTrends,
  fetchGoogleTrends,
  getCategoryTrends,
};
