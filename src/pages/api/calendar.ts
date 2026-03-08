import type { NextApiRequest, NextApiResponse } from 'next';
import {
  generateContentCalendar,
  getCalendarPosts,
  exportToICS,
  type CalendarGenerationRequest,
  type ContentCalendar,
} from '../../../services/contentCalendar';
import type { Platform } from '../../../types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET': {
        const { startDate, endDate, platform, format } = req.query;

        if (!startDate || !endDate) {
          return res.status(400).json({ 
            error: 'startDate and endDate are required' 
          });
        }

        const posts = await getCalendarPosts(
          startDate as string,
          endDate as string,
          platform as Platform
        );

        return res.status(200).json({ posts });
      }

      case 'POST': {
        const { action } = req.query;

        if (action === 'generate') {
          const {
            businessType,
            targetAudience,
            brandVoice,
            goals,
            platforms,
            postsPerWeek,
            startDate,
            culturalEvents,
          } = req.body as CalendarGenerationRequest;

          // Validate required fields
          if (!businessType || !targetAudience || !platforms || !startDate) {
            return res.status(400).json({
              error: 'Missing required fields: businessType, targetAudience, platforms, startDate'
            });
          }

          const calendar = await generateContentCalendar({
            businessType,
            targetAudience,
            brandVoice: brandVoice || 'casual',
            goals: goals || ['engagement'],
            platforms,
            postsPerWeek: postsPerWeek || 7,
            startDate,
            culturalEvents,
          });

          return res.status(201).json(calendar);
        }

        if (action === 'export') {
          const calendar = req.body as ContentCalendar;
          
          if (!calendar || !calendar.weeks) {
            return res.status(400).json({ error: 'Invalid calendar data' });
          }

          const icsContent = exportToICS(calendar);
          
          res.setHeader('Content-Type', 'text/calendar');
          res.setHeader('Content-Disposition', 'attachment; filename=content-calendar.ics');
          return res.status(200).send(icsContent);
        }

        return res.status(400).json({ error: 'Invalid action. Use ?action=generate or ?action=export' });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Calendar API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
