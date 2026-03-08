import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getAnalyticsData,
  getUserContent,
  getUserEngagementScores,
  getUserPublishingHistory,
  type EngagementScore,
  type PublishingHistory,
} from '../../../../services/dynamodb';
import type { Platform } from '../../../../types';

interface PlatformStats {
  platform: Platform;
  posts: number;
  avgEngagement: number;
  totalReach: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
}

interface TimeSeriesData {
  date: string;
  engagement: number;
  posts: number;
  reach: number;
}

interface HashtagPerformance {
  hashtag: string;
  count: number;
  avgEngagement: number;
}

interface PostingTimeData {
  hour: number;
  dayOfWeek: number;
  avgEngagement: number;
  postCount: number;
}

interface AIInsight {
  type: 'positive' | 'negative' | 'neutral' | 'suggestion';
  title: string;
  description: string;
  metric?: number;
  trend?: 'up' | 'down' | 'stable';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const userId = req.headers['x-user-id'] as string || 'demo-user';

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { startDate, endDate, type } = req.query;

    // Get base analytics data
    const analytics = await getAnalyticsData(userId, {
      startDate: startDate as string,
      endDate: endDate as string,
    });

    // Calculate platform performance
    const platformStats: PlatformStats[] = calculatePlatformStats(
      analytics.publishingHistory,
      analytics.engagementScores
    );

    // Calculate engagement over time
    const engagementTimeSeries: TimeSeriesData[] = calculateTimeSeries(
      analytics.publishingHistory,
      analytics.engagementScores
    );

    // Calculate top hashtags
    const contentResult = await getUserContent(userId, { limit: 100 });
    const topHashtags: HashtagPerformance[] = calculateHashtagPerformance(
      contentResult.items,
      analytics.engagementScores
    );

    // Calculate best posting times
    const bestPostingTimes: PostingTimeData[] = calculateBestPostingTimes(
      analytics.publishingHistory,
      analytics.engagementScores
    );

    // Generate AI insights
    const aiInsights: AIInsight[] = generateAIInsights(
      analytics,
      platformStats,
      engagementTimeSeries,
      topHashtags,
      bestPostingTimes
    );

    // Return specific type if requested
    if (type === 'platform') {
      return res.status(200).json({ platformStats });
    }
    if (type === 'timeseries') {
      return res.status(200).json({ engagementTimeSeries });
    }
    if (type === 'hashtags') {
      return res.status(200).json({ topHashtags });
    }
    if (type === 'postingTimes') {
      return res.status(200).json({ bestPostingTimes });
    }
    if (type === 'insights') {
      return res.status(200).json({ aiInsights });
    }

    // Return comprehensive analytics
    return res.status(200).json({
      summary: {
        totalContent: analytics.totalContent,
        contentByStatus: analytics.contentByStatus,
        contentByPlatform: analytics.contentByPlatform,
        avgEngagement: analytics.avgEngagement,
      },
      platformStats,
      engagementTimeSeries,
      topHashtags: topHashtags.slice(0, 10),
      bestPostingTimes,
      aiInsights,
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function calculatePlatformStats(
  history: PublishingHistory[],
  scores: EngagementScore[]
): PlatformStats[] {
  const platformMap = new Map<Platform, {
    posts: number;
    engagements: number[];
    reach: number;
    likes: number;
    comments: number;
    shares: number;
  }>();

  const platforms: Platform[] = ['instagram', 'twitter', 'linkedin', 'facebook'];
  platforms.forEach(p => {
    platformMap.set(p, { posts: 0, engagements: [], reach: 0, likes: 0, comments: 0, shares: 0 });
  });

  // Process publishing history
  history.forEach(h => {
    const stats = platformMap.get(h.platform);
    if (stats) {
      stats.posts++;
      stats.reach += h.metrics?.reach || 0;
      stats.likes += h.metrics?.likes || 0;
      stats.comments += h.metrics?.comments || 0;
      stats.shares += h.metrics?.shares || 0;
    }
  });

  // Add engagement scores
  scores.forEach(s => {
    const stats = platformMap.get(s.platform);
    if (stats) {
      stats.engagements.push(s.score);
    }
  });

  return platforms.map(platform => {
    const stats = platformMap.get(platform)!;
    return {
      platform,
      posts: stats.posts,
      avgEngagement: stats.engagements.length > 0
        ? Math.round(stats.engagements.reduce((a, b) => a + b, 0) / stats.engagements.length)
        : 0,
      totalReach: stats.reach,
      totalLikes: stats.likes,
      totalComments: stats.comments,
      totalShares: stats.shares,
    };
  }).filter(s => s.posts > 0);
}

function calculateTimeSeries(
  history: PublishingHistory[],
  scores: EngagementScore[]
): TimeSeriesData[] {
  const dateMap = new Map<string, { engagement: number[]; posts: number; reach: number }>();

  // Group by date
  history.forEach(h => {
    const date = h.publishedAt.split('T')[0];
    if (!dateMap.has(date)) {
      dateMap.set(date, { engagement: [], posts: 0, reach: 0 });
    }
    const data = dateMap.get(date)!;
    data.posts++;
    data.reach += h.metrics?.reach || 0;
  });

  // Add engagement scores by date
  scores.forEach(s => {
    const date = s.createdAt.split('T')[0];
    if (!dateMap.has(date)) {
      dateMap.set(date, { engagement: [], posts: 0, reach: 0 });
    }
    dateMap.get(date)!.engagement.push(s.score);
  });

  // Convert to array and sort by date
  return Array.from(dateMap.entries())
    .map(([date, data]) => ({
      date,
      engagement: data.engagement.length > 0
        ? Math.round(data.engagement.reduce((a, b) => a + b, 0) / data.engagement.length)
        : 0,
      posts: data.posts,
      reach: data.reach,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30); // Last 30 days
}

function calculateHashtagPerformance(
  content: { metadata?: { hashtags?: string[] }; contentId: string }[],
  scores: EngagementScore[]
): HashtagPerformance[] {
  const hashtagMap = new Map<string, { count: number; engagements: number[] }>();

  // Create a map of contentId to engagement score
  const scoreMap = new Map<string, number>();
  scores.forEach(s => scoreMap.set(s.contentId, s.score));

  // Process content hashtags
  content.forEach(c => {
    const hashtags = c.metadata?.hashtags || [];
    const engagement = scoreMap.get(c.contentId) || 0;

    hashtags.forEach(tag => {
      const normalized = tag.toLowerCase().replace(/^#/, '');
      if (!hashtagMap.has(normalized)) {
        hashtagMap.set(normalized, { count: 0, engagements: [] });
      }
      const data = hashtagMap.get(normalized)!;
      data.count++;
      if (engagement > 0) {
        data.engagements.push(engagement);
      }
    });
  });

  return Array.from(hashtagMap.entries())
    .map(([hashtag, data]) => ({
      hashtag: `#${hashtag}`,
      count: data.count,
      avgEngagement: data.engagements.length > 0
        ? Math.round(data.engagements.reduce((a, b) => a + b, 0) / data.engagements.length)
        : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function calculateBestPostingTimes(
  history: PublishingHistory[],
  scores: EngagementScore[]
): PostingTimeData[] {
  const timeMap = new Map<string, { engagements: number[]; count: number }>();

  // Create score map by contentId
  const scoreMap = new Map<string, number>();
  scores.forEach(s => scoreMap.set(s.contentId, s.score));

  // Process publishing times
  history.forEach(h => {
    const date = new Date(h.publishedAt);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    const key = `${dayOfWeek}-${hour}`;

    if (!timeMap.has(key)) {
      timeMap.set(key, { engagements: [], count: 0 });
    }
    const data = timeMap.get(key)!;
    data.count++;
    const score = scoreMap.get(h.contentId);
    if (score) {
      data.engagements.push(score);
    }
  });

  return Array.from(timeMap.entries())
    .map(([key, data]) => {
      const [dayOfWeek, hour] = key.split('-').map(Number);
      return {
        hour,
        dayOfWeek,
        avgEngagement: data.engagements.length > 0
          ? Math.round(data.engagements.reduce((a, b) => a + b, 0) / data.engagements.length)
          : 0,
        postCount: data.count,
      };
    })
    .sort((a, b) => b.avgEngagement - a.avgEngagement);
}

function generateAIInsights(
  analytics: Awaited<ReturnType<typeof getAnalyticsData>>,
  platformStats: PlatformStats[],
  timeSeries: TimeSeriesData[],
  hashtags: HashtagPerformance[],
  postingTimes: PostingTimeData[]
): AIInsight[] {
  const insights: AIInsight[] = [];

  // Overall engagement trend
  if (timeSeries.length >= 7) {
    const recent = timeSeries.slice(-7);
    const older = timeSeries.slice(-14, -7);
    
    if (older.length > 0) {
      const recentAvg = recent.reduce((a, b) => a + b.engagement, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b.engagement, 0) / older.length;
      const change = ((recentAvg - olderAvg) / olderAvg) * 100;

      if (change > 10) {
        insights.push({
          type: 'positive',
          title: 'Engagement Growing',
          description: `Your engagement has increased by ${Math.round(change)}% compared to the previous week. Keep up the great work!`,
          metric: Math.round(change),
          trend: 'up',
        });
      } else if (change < -10) {
        insights.push({
          type: 'negative',
          title: 'Engagement Declining',
          description: `Your engagement has decreased by ${Math.abs(Math.round(change))}% this week. Consider adjusting your content strategy.`,
          metric: Math.round(change),
          trend: 'down',
        });
      }
    }
  }

  // Best performing platform
  if (platformStats.length > 0) {
    const bestPlatform = platformStats.reduce((a, b) => 
      a.avgEngagement > b.avgEngagement ? a : b
    );
    
    insights.push({
      type: 'positive',
      title: `${capitalize(bestPlatform.platform)} is Your Top Platform`,
      description: `Your content on ${capitalize(bestPlatform.platform)} achieves ${bestPlatform.avgEngagement}% average engagement, outperforming other platforms.`,
      metric: bestPlatform.avgEngagement,
    });
  }

  // Top hashtag recommendation
  if (hashtags.length > 0) {
    const topHashtag = hashtags[0];
    insights.push({
      type: 'suggestion',
      title: 'Top Performing Hashtag',
      description: `${topHashtag.hashtag} is your best performing hashtag with ${topHashtag.avgEngagement}% average engagement. Use it more in your posts!`,
      metric: topHashtag.avgEngagement,
    });
  }

  // Best posting time
  if (postingTimes.length > 0) {
    const bestTime = postingTimes[0];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const hour = bestTime.hour > 12 ? `${bestTime.hour - 12} PM` : `${bestTime.hour} AM`;
    
    insights.push({
      type: 'suggestion',
      title: 'Optimal Posting Time',
      description: `${days[bestTime.dayOfWeek]} at ${hour} IST is your best time to post, with ${bestTime.avgEngagement}% average engagement.`,
      metric: bestTime.avgEngagement,
    });
  }

  // Content volume insight
  const approvedRate = analytics.contentByStatus['approved'] 
    ? (analytics.contentByStatus['approved'] / analytics.totalContent) * 100 
    : 0;
  
  if (approvedRate > 80) {
    insights.push({
      type: 'positive',
      title: 'High Approval Rate',
      description: `${Math.round(approvedRate)}% of your content gets approved. Your content quality is excellent!`,
      metric: Math.round(approvedRate),
    });
  } else if (approvedRate < 50 && analytics.totalContent > 5) {
    insights.push({
      type: 'negative',
      title: 'Low Approval Rate',
      description: `Only ${Math.round(approvedRate)}% of your content gets approved. Consider reviewing the feedback and improving content quality.`,
      metric: Math.round(approvedRate),
    });
  }

  // Cultural relevance for Indian audience
  insights.push({
    type: 'suggestion',
    title: 'Indian Audience Tip',
    description: 'Posts with regional language elements and festival-related content see 25% higher engagement in India.',
  });

  return insights;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
