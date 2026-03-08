import type { NextApiRequest, NextApiResponse } from 'next';
import { 
  getTrendingTopicsIndia, 
  analyzeTrends, 
  generateHashtagRecommendations,
  getCategoryTrends,
  type TrendingTopic,
  type TrendAnalysis,
  type HashtagRecommendation,
} from '../../../services/trendService';

interface TrendingResponse {
  trendingTopics: TrendingTopic[];
  categories: string[];
  lastUpdated: string;
}

interface HashtagResponse {
  hashtags: HashtagRecommendation[];
  analysis: TrendAnalysis;
}

interface CategoryTrendResponse {
  topics: TrendingTopic[];
  hashtags: HashtagRecommendation[];
  growingKeywords: string[];
}

type ApiResponse = TrendingResponse | HashtagResponse | CategoryTrendResponse | { error: string };

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method === 'GET') {
    // Get trending topics
    const { category, limit = '10' } = req.query;
    
    try {
      const topics = getTrendingTopicsIndia(
        category as string | undefined,
        parseInt(limit as string, 10)
      );
      
      const categories = ['Fashion', 'Business', 'Technology', 'Culture', 'Lifestyle', 'Health', 'Art'];
      
      return res.status(200).json({
        trendingTopics: topics,
        categories,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error fetching trends:', error);
      return res.status(500).json({ error: 'Failed to fetch trending topics' });
    }
  }
  
  if (req.method === 'POST') {
    const { action, prompt, platform = 'instagram', category } = req.body;
    
    try {
      switch (action) {
        case 'analyze':
          // Analyze trends for a prompt
          if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required for analysis' });
          }
          
          const analysis = analyzeTrends(prompt, platform);
          const hashtags = generateHashtagRecommendations(prompt, platform, 15);
          
          return res.status(200).json({
            hashtags,
            analysis,
          });
          
        case 'category':
          // Get category-specific trends
          if (!category) {
            return res.status(400).json({ error: 'Category is required' });
          }
          
          const categoryTrends = getCategoryTrends(category);
          return res.status(200).json(categoryTrends);
          
        case 'hashtags':
          // Generate hashtag recommendations
          if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required for hashtag generation' });
          }
          
          const recommendedHashtags = generateHashtagRecommendations(prompt, platform, 20);
          const trendAnalysis = analyzeTrends(prompt, platform);
          
          return res.status(200).json({
            hashtags: recommendedHashtags,
            analysis: trendAnalysis,
          });
          
        default:
          return res.status(400).json({ error: 'Invalid action. Use: analyze, category, or hashtags' });
      }
    } catch (error) {
      console.error('Trend analysis error:', error);
      return res.status(500).json({ error: 'Failed to analyze trends' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
