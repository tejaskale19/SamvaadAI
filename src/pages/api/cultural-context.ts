import type { NextApiRequest, NextApiResponse } from 'next';
import culturalContext from '../../../datasets/cultural_context.json';
import type { CulturalContext } from '../../../types';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<CulturalContext | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Return the cultural context data
    // In production: This could be fetched from S3 or DynamoDB
    res.status(200).json(culturalContext as CulturalContext);
  } catch (error) {
    console.error('Cultural context error:', error);
    res.status(500).json({ error: 'Failed to fetch cultural context' });
  }
}
