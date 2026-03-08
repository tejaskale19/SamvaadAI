import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createScheduledPost,
  getScheduledPost,
  getUserScheduledPosts,
  updateScheduledPost,
  deleteScheduledPost,
  generateId,
  type ScheduledPost,
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
        const { scheduleId, status, fromDate, toDate, limit } = req.query;

        if (scheduleId) {
          const post = await getScheduledPost(userId, scheduleId as string);
          if (!post) {
            return res.status(404).json({ error: 'Scheduled post not found' });
          }
          return res.status(200).json(post);
        }

        const result = await getUserScheduledPosts(userId, {
          status: status as string,
          fromDate: fromDate as string,
          toDate: toDate as string,
          limit: limit ? parseInt(limit as string, 10) : 50,
        });

        return res.status(200).json(result);
      }

      case 'POST': {
        const { contentId, platform, scheduledFor, timezone } = req.body;

        if (!contentId || !platform || !scheduledFor) {
          return res.status(400).json({ 
            error: 'contentId, platform, and scheduledFor are required' 
          });
        }

        const now = new Date().toISOString();
        const post: ScheduledPost = {
          scheduleId: generateId('sch'),
          contentId,
          userId,
          platform,
          scheduledFor,
          timezone: timezone || 'Asia/Kolkata',
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        };

        const created = await createScheduledPost(post);
        return res.status(201).json(created);
      }

      case 'PUT': {
        const { scheduleId } = req.query;
        const updates = req.body;

        if (!scheduleId) {
          return res.status(400).json({ error: 'scheduleId is required' });
        }

        const updated = await updateScheduledPost(userId, scheduleId as string, updates);
        if (!updated) {
          return res.status(404).json({ error: 'Scheduled post not found or no updates provided' });
        }

        return res.status(200).json(updated);
      }

      case 'DELETE': {
        const { scheduleId } = req.query;

        if (!scheduleId) {
          return res.status(400).json({ error: 'scheduleId is required' });
        }

        await deleteScheduledPost(userId, scheduleId as string);
        return res.status(200).json({ message: 'Scheduled post deleted successfully' });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Scheduled Posts API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
