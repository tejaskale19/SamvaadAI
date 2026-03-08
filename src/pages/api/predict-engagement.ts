import type { NextApiRequest, NextApiResponse } from 'next';
import type { EngagementPrediction, Platform } from '../../../types';
import { predictEngagement } from '../../../services/engagementPredictor';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<EngagementPrediction | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { content, platform = 'instagram', hashtags = [] } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Extract hashtags from content if not provided
    const extractedHashtags = hashtags.length > 0 
      ? hashtags 
      : (content.match(/#[\w\u0900-\u097F]+/g) || []);

    // Use the ML-based engagement predictor service
    const prediction = predictEngagement(
      content,
      platform as Platform,
      extractedHashtags
    );

    // In production: Cache prediction in ElastiCache
    // await elasticache.set(`prediction:${hashContent(content)}`, prediction, 'EX', 3600);

    res.status(200).json(prediction);
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: 'Failed to predict engagement' });
  }
}
