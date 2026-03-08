import type { NextApiRequest, NextApiResponse } from 'next';
import type { GeneratedContent } from '../../../types';
import { getUserIdFromRequest } from '../../../utils/auth';

// In-memory storage for demo (in production, use DynamoDB)
const contentHistory: GeneratedContent[] = [];

// Add to history (called internally, not exposed as API)
export function addToHistory(content: GeneratedContent) {
  contentHistory.unshift(content); // Add to beginning
  if (contentHistory.length > 100) {
    contentHistory.pop(); // Remove oldest
  }
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<GeneratedContent[] | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract user ID from JWT token if authenticated
    const userId = getUserIdFromRequest(req);

    // Filter content by user if authenticated
    // In production: Query from DynamoDB with user_id filter
    // const history = await dynamoDB.query({
    //   TableName: 'Content',
    //   IndexName: 'userId-timestamp-index',
    //   KeyConditionExpression: 'userId = :userId',
    //   ExpressionAttributeValues: { ':userId': userId },
    //   ScanIndexForward: false,
    //   Limit: 50
    // });

    const filteredHistory = userId
      ? contentHistory.filter(content => content.userId === userId)
      : contentHistory;

    res.status(200).json(filteredHistory);
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
}
