import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createContent,
  getContent,
  getUserContent,
  updateContent,
  deleteContent,
  generateId,
  type Content,
} from '../../../../services/dynamodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get userId from headers (in production, extract from JWT)
  const userId = req.headers['x-user-id'] as string || 'demo-user';

  try {
    switch (req.method) {
      case 'GET': {
        const { contentId, status, limit } = req.query;

        if (contentId) {
          // Get specific content
          const content = await getContent(userId, contentId as string);
          if (!content) {
            return res.status(404).json({ error: 'Content not found' });
          }
          return res.status(200).json(content);
        }

        // Get all user content with optional filters
        const result = await getUserContent(userId, {
          status: status as string,
          limit: limit ? parseInt(limit as string) : undefined,
        });

        return res.status(200).json(result);
      }

      case 'POST': {
        const { prompt, platform, variants, metadata } = req.body;

        if (!prompt || !platform) {
          return res.status(400).json({ error: 'Missing required fields: prompt, platform' });
        }

        const content: Content = {
          contentId: generateId('cnt'),
          userId,
          prompt,
          platform,
          variants: variants || [],
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata,
        };

        const created = await createContent(content);
        return res.status(201).json(created);
      }

      case 'PUT': {
        const { contentId } = req.query;
        const updates = req.body;

        if (!contentId) {
          return res.status(400).json({ error: 'Missing contentId' });
        }

        const updated = await updateContent(userId, contentId as string, updates);
        if (!updated) {
          return res.status(404).json({ error: 'Content not found' });
        }

        return res.status(200).json(updated);
      }

      case 'DELETE': {
        const { contentId } = req.query;

        if (!contentId) {
          return res.status(400).json({ error: 'Missing contentId' });
        }

        await deleteContent(userId, contentId as string);
        return res.status(204).end();
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Content API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
