import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createPublishingHistory,
  getPublishingHistory,
  getUserPublishingHistory,
  updatePublishingHistory,
  getUserContent,
  generateId,
  type PublishingHistory,
} from '../../../services/dynamodb';
import type { Platform } from '../../../types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const userId = (req.headers['x-user-id'] as string) || 'demo_user';

  try {
    switch (req.method) {
      case 'GET': {
        const { historyId, platform, limit, startDate, endDate } = req.query;

        if (historyId) {
          const history = await getPublishingHistory(userId, historyId as string);
          if (!history) {
            return res.status(404).json({ error: 'History not found' });
          }
          return res.status(200).json(history);
        }

        // Get publishing history with filters
        const result = await getUserPublishingHistory(userId, {
          platform: platform as Platform,
          limit: limit ? parseInt(limit as string, 10) : 50,
          startDate: startDate as string,
          endDate: endDate as string,
        });

        // Also fetch content details to enrich history
        const contentResult = await getUserContent(userId, { limit: 100 });
        const contentMap = new Map(contentResult.items.map(c => [c.contentId, c]));

        const enrichedHistory = result.items.map(history => {
          const content = contentMap.get(history.contentId);
          return {
            ...history,
            prompt: content?.prompt || 'Unknown',
            variants: content?.variants?.length || 0,
          };
        });

        return res.status(200).json({
          items: enrichedHistory,
          lastKey: result.lastKey,
        });
      }

      case 'POST': {
        const { contentId, platform, publishedAt, status, metrics } = req.body;

        if (!contentId || !platform) {
          return res.status(400).json({ error: 'contentId and platform are required' });
        }

        const history: PublishingHistory = {
          historyId: generateId('hist'),
          contentId,
          userId,
          platform,
          publishedAt: publishedAt || new Date().toISOString(),
          status: status || 'success',
          metrics,
        };

        const created = await createPublishingHistory(history);
        return res.status(201).json(created);
      }

      case 'PUT': {
        const { historyId } = req.query;
        const updates = req.body;

        if (!historyId) {
          return res.status(400).json({ error: 'historyId is required' });
        }

        const updated = await updatePublishingHistory(userId, historyId as string, updates);
        if (!updated) {
          return res.status(404).json({ error: 'History not found or no updates provided' });
        }

        return res.status(200).json(updated);
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Publishing History API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
