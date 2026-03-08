import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createPublishingHistory,
  getPublishingHistory,
  getUserPublishingHistory,
  updatePublishingHistory,
  generateId,
  type PublishingHistory,
} from '../../../../services/dynamodb';
import type { Platform } from '../../../../types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const userId = req.headers['x-user-id'] as string || 'demo-user';

  try {
    switch (req.method) {
      case 'GET': {
        const { historyId, platform, limit, startDate, endDate } = req.query;

        if (historyId) {
          const history = await getPublishingHistory(userId, historyId as string);
          if (!history) {
            return res.status(404).json({ error: 'History record not found' });
          }
          return res.status(200).json(history);
        }

        const result = await getUserPublishingHistory(userId, {
          platform: platform as Platform,
          limit: limit ? parseInt(limit as string) : undefined,
          startDate: startDate as string,
          endDate: endDate as string,
        });

        return res.status(200).json(result);
      }

      case 'POST': {
        const { contentId, platform, status, metrics, errorMessage } = req.body;

        if (!contentId || !platform) {
          return res.status(400).json({ error: 'Missing required fields: contentId, platform' });
        }

        const history: PublishingHistory = {
          historyId: generateId('hist'),
          contentId,
          userId,
          platform,
          publishedAt: new Date().toISOString(),
          status: status || 'success',
          metrics,
          errorMessage,
        };

        const created = await createPublishingHistory(history);
        return res.status(201).json(created);
      }

      case 'PUT': {
        const { historyId } = req.query;
        const updates = req.body;

        if (!historyId) {
          return res.status(400).json({ error: 'Missing historyId' });
        }

        const updated = await updatePublishingHistory(userId, historyId as string, updates);
        if (!updated) {
          return res.status(404).json({ error: 'History record not found' });
        }

        return res.status(200).json(updated);
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('History API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
