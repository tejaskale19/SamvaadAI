import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getAnalyticsData,
  getUserPublishingHistory,
  getUserEngagementScores,
  getUserContent,
} from '../../../services/dynamodb';
import type { Platform } from '../../../types';

interface PlatformStats {
  platform: Platform;
  posts: number;
  avgEngagement: number;
  totalReach: number;
  totalLikes: number;
}

interface DailyStats {
  date: string;
  posts: number;
  avgEngagement: number;
  reach: number;
}

interface HashtagPerformance {
  hashtag: string;
  uses: number;
  avgEngagement: number;
}

interface HourlyPerformance {
  hour: number;
  posts: number;
  avgEngagement: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const userId = (req.headers['x-user-id'] as string) || 'demo_user';

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { startDate, endDate, type } = req.query;

    // Get base analytics data
    const analyticsData = await getAnalyticsData(userId, {
      startDate: startDate as string,
      endDate: endDate as string,
    });

    // Calculate platform performance
    const platformStats: PlatformStats[] = [];
    const platforms: Platform[] = ['instagram', 'twitter', 'linkedin', 'facebook'];
    
    for (const platform of platforms) {
      const platformHistory = analyticsData.publishingHistory.filter(h => h.platform === platform);
      const platformScores = analyticsData.engagementScores.filter(s => s.platform === platform);
      
      const avgEngagement = platformScores.length > 0
        ? Math.round(platformScores.reduce((sum, s) => sum + s.score, 0) / platformScores.length)
        : 0;
      
      const totalReach = platformHistory.reduce((sum, h) => sum + (h.metrics?.reach || 0), 0);
      const totalLikes = platformHistory.reduce((sum, h) => sum + (h.metrics?.likes || 0), 0);

      platformStats.push({
        platform,
        posts: analyticsData.contentByPlatform[platform] || 0,
        avgEngagement,
        totalReach,
        totalLikes,
      });
    }

    // Calculate engagement over time (last 30 days)
    const dailyStats: DailyStats[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayHistory = analyticsData.publishingHistory.filter(
        h => h.publishedAt.startsWith(dateStr)
      );
      const dayScores = analyticsData.engagementScores.filter(
        s => s.createdAt.startsWith(dateStr)
      );
      
      dailyStats.push({
        date: dateStr,
        posts: dayHistory.length,
        avgEngagement: dayScores.length > 0
          ? Math.round(dayScores.reduce((sum, s) => sum + s.score, 0) / dayScores.length)
          : 0,
        reach: dayHistory.reduce((sum, h) => sum + (h.metrics?.reach || 0), 0),
      });
    }

    // Calculate top hashtags
    const hashtagMap = new Map<string, { uses: number; totalEngagement: number }>();
    const contentResult = await getUserContent(userId, { limit: 100 });
    
    contentResult.items.forEach(content => {
      const engagementScore = analyticsData.engagementScores.find(
        s => s.contentId === content.contentId
      );
      const score = engagementScore?.score || 0;
      
      content.variants.forEach(variant => {
        variant.hashtags.forEach(hashtag => {
          const existing = hashtagMap.get(hashtag) || { uses: 0, totalEngagement: 0 };
          hashtagMap.set(hashtag, {
            uses: existing.uses + 1,
            totalEngagement: existing.totalEngagement + score,
          });
        });
      });

      // Also check metadata hashtags
      content.metadata?.hashtags?.forEach(hashtag => {
        const existing = hashtagMap.get(hashtag) || { uses: 0, totalEngagement: 0 };
        hashtagMap.set(hashtag, {
          uses: existing.uses + 1,
          totalEngagement: existing.totalEngagement + score,
        });
      });
    });

    const topHashtags: HashtagPerformance[] = Array.from(hashtagMap.entries())
      .map(([hashtag, data]) => ({
        hashtag,
        uses: data.uses,
        avgEngagement: Math.round(data.totalEngagement / data.uses),
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 10);

    // Calculate best posting times
    const hourlyMap = new Map<number, { posts: number; totalEngagement: number }>();
    
    analyticsData.publishingHistory.forEach(history => {
      const hour = new Date(history.publishedAt).getHours();
      const engagementScore = analyticsData.engagementScores.find(
        s => s.contentId === history.contentId
      );
      const score = engagementScore?.score || 0;
      
      const existing = hourlyMap.get(hour) || { posts: 0, totalEngagement: 0 };
      hourlyMap.set(hour, {
        posts: existing.posts + 1,
        totalEngagement: existing.totalEngagement + score,
      });
    });

    const bestPostingTimes: HourlyPerformance[] = Array.from(hourlyMap.entries())
      .map(([hour, data]) => ({
        hour,
        posts: data.posts,
        avgEngagement: data.posts > 0 ? Math.round(data.totalEngagement / data.posts) : 0,
      }))
      .sort((a, b) => a.hour - b.hour);

    // Generate AI insights based on the data
    const insights = generateAIInsights(
      analyticsData,
      platformStats,
      dailyStats,
      topHashtags,
      bestPostingTimes
    );

    return res.status(200).json({
      summary: {
        totalContent: analyticsData.totalContent,
        contentByStatus: analyticsData.contentByStatus,
        avgEngagement: analyticsData.avgEngagement,
        totalPublished: analyticsData.publishingHistory.length,
      },
      platformStats,
      dailyStats,
      topHashtags,
      bestPostingTimes,
      insights,
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    
    // Return empty analytics when DynamoDB is not configured or unavailable
    return res.status(200).json({
      summary: {
        totalContent: 0,
        contentByStatus: {},
        avgEngagement: 0,
        totalPublished: 0,
      },
      platformStats: [],
      dailyStats: [],
      topHashtags: [],
      bestPostingTimes: [],
      insights: ['No analytics data available yet. Generate and publish content to see performance metrics.'],
    });
  }
}

// Generate demo data for when DynamoDB is unavailable
function generateDemoData() {
  const platformStats = [
    { platform: 'instagram' as Platform, posts: 12, avgEngagement: 82, totalReach: 15600, totalLikes: 1840 },
    { platform: 'twitter' as Platform, posts: 8, avgEngagement: 74, totalReach: 9200, totalLikes: 980 },
    { platform: 'linkedin' as Platform, posts: 5, avgEngagement: 71, totalReach: 4800, totalLikes: 420 },
    { platform: 'facebook' as Platform, posts: 3, avgEngagement: 68, totalReach: 3200, totalLikes: 310 },
  ];

  const dailyStats = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
      date: date.toISOString().split('T')[0],
      posts: Math.floor(Math.random() * 4) + 1,
      avgEngagement: Math.floor(Math.random() * 25) + 65,
      reach: Math.floor(Math.random() * 4000) + 1500,
    };
  });

  const topHashtags = [
    { hashtag: '#SustainableFashion', uses: 12, avgEngagement: 89 },
    { hashtag: '#MadeInIndia', uses: 10, avgEngagement: 85 },
    { hashtag: '#EcoFriendly', uses: 8, avgEngagement: 82 },
    { hashtag: '#FestivalSpecial', uses: 7, avgEngagement: 88 },
    { hashtag: '#HandmadeWithLove', uses: 6, avgEngagement: 79 },
    { hashtag: '#IndianCrafts', uses: 5, avgEngagement: 76 },
    { hashtag: '#TraditionalArt', uses: 4, avgEngagement: 73 },
    { hashtag: '#SupportLocal', uses: 4, avgEngagement: 71 },
  ];

  const bestPostingTimes = [
    { hour: 9, posts: 5, avgEngagement: 72 },
    { hour: 12, posts: 4, avgEngagement: 68 },
    { hour: 15, posts: 3, avgEngagement: 74 },
    { hour: 18, posts: 6, avgEngagement: 82 },
    { hour: 19, posts: 8, avgEngagement: 91 },
    { hour: 20, posts: 7, avgEngagement: 88 },
    { hour: 21, posts: 5, avgEngagement: 79 },
  ];

  const insights = [
    '📱 Instagram is your top-performing platform with 82% average engagement. Consider prioritizing content for this platform.',
    '📈 Your engagement is up 15% compared to last week. Keep up the momentum!',
    '#️⃣ "#SustainableFashion" is your best-performing hashtag with 89% average engagement across 12 posts.',
    '⏰ Posts published around 7 PM IST perform best with 91% average engagement.',
    '🎯 Content with high cultural relevance (80%+) averages 85% engagement. Include more festival and regional content.',
  ];

  return {
    summary: {
      totalContent: 28,
      contentByStatus: { approved: 18, pending: 6, draft: 4 },
      avgEngagement: 78,
      totalPublished: 18,
    },
    platformStats,
    dailyStats,
    topHashtags,
    bestPostingTimes,
    insights,
  };
}

function generateAIInsights(
  analyticsData: Awaited<ReturnType<typeof getAnalyticsData>>,
  platformStats: PlatformStats[],
  dailyStats: DailyStats[],
  topHashtags: HashtagPerformance[],
  bestPostingTimes: HourlyPerformance[]
): string[] {
  const insights: string[] = [];

  // Platform performance insight
  const bestPlatform = platformStats.reduce(
    (best, current) => current.avgEngagement > best.avgEngagement ? current : best,
    platformStats[0]
  );
  if (bestPlatform && bestPlatform.avgEngagement > 0) {
    insights.push(
      `📱 ${bestPlatform.platform.charAt(0).toUpperCase() + bestPlatform.platform.slice(1)} is your top-performing platform with ${bestPlatform.avgEngagement}% average engagement. Consider prioritizing content for this platform.`
    );
  }

  // Engagement trend insight
  const recentDays = dailyStats.slice(-7);
  const previousDays = dailyStats.slice(-14, -7);
  const recentAvg = recentDays.reduce((sum, d) => sum + d.avgEngagement, 0) / 7;
  const previousAvg = previousDays.reduce((sum, d) => sum + d.avgEngagement, 0) / 7;
  
  if (recentAvg > previousAvg * 1.1) {
    insights.push(
      `📈 Your engagement is up ${Math.round((recentAvg - previousAvg) / previousAvg * 100)}% compared to last week. Keep up the momentum!`
    );
  } else if (recentAvg < previousAvg * 0.9) {
    insights.push(
      `📉 Engagement has dropped ${Math.round((previousAvg - recentAvg) / previousAvg * 100)}% this week. Consider experimenting with different content types or posting times.`
    );
  }

  // Top hashtag insight
  if (topHashtags.length > 0) {
    const topTag = topHashtags[0];
    insights.push(
      `#️⃣ "${topTag.hashtag}" is your best-performing hashtag with ${topTag.avgEngagement}% average engagement across ${topTag.uses} posts.`
    );
  }

  // Best posting time insight
  const bestTime = bestPostingTimes.reduce(
    (best, current) => current.avgEngagement > best.avgEngagement ? current : best,
    bestPostingTimes[0]
  );
  if (bestTime && bestTime.avgEngagement > 0) {
    const timeStr = bestTime.hour === 0 ? '12 AM' :
                    bestTime.hour < 12 ? `${bestTime.hour} AM` :
                    bestTime.hour === 12 ? '12 PM' :
                    `${bestTime.hour - 12} PM`;
    insights.push(
      `⏰ Posts published around ${timeStr} IST perform best with ${bestTime.avgEngagement}% average engagement.`
    );
  }

  // Content volume insight
  const totalApproved = analyticsData.contentByStatus['approved'] || 0;
  const totalDraft = analyticsData.contentByStatus['draft'] || 0;
  if (totalDraft > totalApproved) {
    insights.push(
      `📝 You have ${totalDraft} drafts waiting for approval. Review and publish them to maintain consistent posting.`
    );
  }

  // Cultural relevance insight
  const culturalScores = analyticsData.engagementScores
    .filter(s => s.factors.culturalRelevance > 80);
  if (culturalScores.length > 0) {
    insights.push(
      `🎯 Content with high cultural relevance (80%+) averages ${Math.round(culturalScores.reduce((sum, s) => sum + s.score, 0) / culturalScores.length)}% engagement. Include more festival and regional content.`
    );
  }

  // Add default insights if none generated
  if (insights.length === 0) {
    insights.push(
      '🚀 Start creating content to see personalized insights about your performance.',
      '💡 Pro tip: Post consistently during evening hours (7-9 PM IST) for better reach in India.',
      '🎯 Include trending hashtags and festival-related content to boost engagement.'
    );
  }

  return insights;
}
