import type { NextApiRequest, NextApiResponse } from 'next';
import type { GeneratedContent, Platform } from '../../../types';
import { getUserIdFromRequest } from '../../../utils/auth';
import { generateHashtagRecommendations, analyzeTrends } from '../../../services/trendService';
import { generateAIContent, isAIAvailable } from '../../../services/aiService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GeneratedContent | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, platform = 'instagram', numberOfVariants = 3 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Get trending hashtag recommendations based on prompt and platform
    const hashtagRecommendations = await generateHashtagRecommendations(
      prompt,
      platform as Platform,
      10
    );

    // Get trend analysis for the prompt
    const trendAnalysis = await analyzeTrends(prompt, platform as Platform);

    // Generate content using AI service (with fallback to templates)
    const { variants, isAIGenerated } = await generateAIContent(
      prompt,
      platform as Platform,
      Math.min(numberOfVariants, 3)
    );

    // Extract user ID from JWT token if authenticated
    const userId = getUserIdFromRequest(req);

    const generatedContent: GeneratedContent = {
      id: `content-${Date.now()}`,
      prompt,
      variants,
      timestamp: new Date().toISOString(),
      status: 'draft',
      userId: userId || undefined,
      // Include trend data in response
      trendData: {
        recommendations: hashtagRecommendations.slice(0, 5),
        analysis: trendAnalysis,
      },
      // Include generation metadata
      metadata: {
        isAIGenerated,
        aiAvailable: isAIAvailable(),
      },
    };

    // In production: Save to DynamoDB here
    // await dynamoDB.put({ TableName: 'Content', Item: generatedContent });

    res.status(200).json(generatedContent);
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: 'Failed to generate content' });
  }
}
