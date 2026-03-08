import type { Platform } from '../types';

// Types for content calendar
export interface CalendarPost {
  id: string;
  date: string;
  time: string;
  topic: string;
  description: string;
  platform: Platform;
  hashtags: string[];
  category: 'promotion' | 'engagement' | 'educational' | 'entertainment' | 'ugc' | 'seasonal';
  priority: 'high' | 'medium' | 'low';
  status: 'scheduled' | 'draft' | 'published' | 'skipped';
}

export interface CalendarWeek {
  weekNumber: number;
  startDate: string;
  endDate: string;
  posts: CalendarPost[];
  theme: string;
}

export interface ContentCalendar {
  id: string;
  userId: string;
  month: string;
  year: number;
  businessType: string;
  targetAudience: string;
  weeks: CalendarWeek[];
  totalPosts: number;
  platformDistribution: Record<Platform, number>;
  createdAt: string;
}

export interface CalendarGenerationRequest {
  businessType: string;
  targetAudience: string;
  brandVoice: string;
  goals: string[];
  platforms: Platform[];
  postsPerWeek: number;
  startDate: string;
  culturalEvents?: string[];
}

// Indian cultural events and festivals for 2026
const INDIAN_EVENTS_2026: Record<string, { name: string; type: string }> = {
  '2026-01-14': { name: 'Makar Sankranti / Pongal', type: 'festival' },
  '2026-01-26': { name: 'Republic Day', type: 'national' },
  '2026-02-14': { name: 'Valentine\'s Day', type: 'celebration' },
  '2026-02-26': { name: 'Maha Shivaratri', type: 'festival' },
  '2026-03-10': { name: 'Holi', type: 'festival' },
  '2026-03-30': { name: 'Ugadi / Gudi Padwa', type: 'festival' },
  '2026-04-02': { name: 'Ram Navami', type: 'festival' },
  '2026-04-14': { name: 'Baisakhi', type: 'festival' },
  '2026-05-01': { name: 'May Day', type: 'national' },
  '2026-05-07': { name: 'Buddha Purnima', type: 'festival' },
  '2026-05-10': { name: 'Mother\'s Day', type: 'celebration' },
  '2026-06-21': { name: 'International Yoga Day / Father\'s Day', type: 'awareness' },
  '2026-07-17': { name: 'Muharram', type: 'festival' },
  '2026-08-15': { name: 'Independence Day', type: 'national' },
  '2026-08-19': { name: 'Raksha Bandhan', type: 'festival' },
  '2026-08-27': { name: 'Janmashtami', type: 'festival' },
  '2026-09-05': { name: 'Teacher\'s Day', type: 'national' },
  '2026-09-16': { name: 'Milad-un-Nabi', type: 'festival' },
  '2026-09-29': { name: 'Navratri Begins', type: 'festival' },
  '2026-10-02': { name: 'Gandhi Jayanti', type: 'national' },
  '2026-10-07': { name: 'Dussehra', type: 'festival' },
  '2026-10-21': { name: 'Karwa Chauth', type: 'festival' },
  '2026-10-27': { name: 'Diwali', type: 'festival' },
  '2026-10-29': { name: 'Bhai Dooj', type: 'festival' },
  '2026-11-14': { name: 'Children\'s Day', type: 'national' },
  '2026-11-30': { name: 'Guru Nanak Jayanti', type: 'festival' },
  '2026-12-25': { name: 'Christmas', type: 'festival' },
  '2026-12-31': { name: 'New Year\'s Eve', type: 'celebration' },
};

// Post category templates
const CATEGORY_TEMPLATES: Record<string, { topics: string[]; hashtagPrefixes: string[] }> = {
  promotion: {
    topics: [
      'Product spotlight: {product}',
      'Limited time offer announcement',
      'Customer success story feature',
      'Bundle deal promotion',
      'Flash sale announcement',
      'New arrival showcase',
    ],
    hashtagPrefixes: ['Sale', 'Offer', 'Deal', 'ShopNow', 'NewArrival'],
  },
  engagement: {
    topics: [
      'Poll: Your favorite {category}',
      'This or That? {optionA} vs {optionB}',
      'Caption this photo contest',
      'Share your story challenge',
      'Q&A session announcement',
      'Community spotlight',
    ],
    hashtagPrefixes: ['Poll', 'Contest', 'Community', 'YourVoice', 'ShareYourStory'],
  },
  educational: {
    topics: [
      'How to {action} with {product}',
      '5 tips for {benefit}',
      'Did you know? {fact}',
      'Behind the scenes: {process}',
      'Expert tips on {topic}',
      'Industry insights: {trend}',
    ],
    hashtagPrefixes: ['Tips', 'HowTo', 'DidYouKnow', 'LearnWith', 'ProTips'],
  },
  entertainment: {
    topics: [
      'Meme Monday: {theme}',
      'Throwback to {memory}',
      'Team spotlight: Meet {person}',
      'Fun facts about {topic}',
      'Mood of the day',
      'Weekend vibes post',
    ],
    hashtagPrefixes: ['Memes', 'FunFriday', 'TeamSpotlight', 'GoodVibes', 'WeekendVibes'],
  },
  ugc: {
    topics: [
      'Customer photo feature',
      'Review spotlight',
      'Fan art showcase',
      'Customer transformation story',
      'Unboxing moment share',
      'Community creation feature',
    ],
    hashtagPrefixes: ['CustomerLove', 'FanFeature', 'CommunityLove', 'RealCustomers', 'UserGenerated'],
  },
  seasonal: {
    topics: [
      'Festival greeting: {festival}',
      'Seasonal collection launch',
      'Holiday special offer',
      'Festival preparation tips',
      'Celebration ideas for {event}',
      'Festive decor inspiration',
    ],
    hashtagPrefixes: ['Festival', 'Celebration', 'FestiveSeason', 'Holiday', 'SeasonalSpecial'],
  },
};

// Platform-specific posting times (IST)
const OPTIMAL_POSTING_TIMES: Record<Platform, string[]> = {
  instagram: ['09:00', '12:00', '17:00', '19:00', '21:00'],
  twitter: ['08:00', '12:00', '17:00', '18:00', '21:00'],
  linkedin: ['07:30', '10:00', '12:00', '17:30'],
  facebook: ['09:00', '13:00', '16:00', '19:00'],
};

// Generate unique ID
function generateId(): string {
  return `cal_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

// Get events for a specific date
function getEventsForDate(dateStr: string): { name: string; type: string } | null {
  return INDIAN_EVENTS_2026[dateStr] || null;
}

// Generate a single post
function generatePost(
  date: Date,
  platform: Platform,
  category: keyof typeof CATEGORY_TEMPLATES,
  businessType: string,
  postNumber: number
): CalendarPost {
  const dateStr = date.toISOString().split('T')[0];
  const event = getEventsForDate(dateStr);
  
  // If there's a cultural event, make it a seasonal post
  const actualCategory = event ? 'seasonal' as const : category as CalendarPost['category'];
  const template = CATEGORY_TEMPLATES[actualCategory];
  
  // Select a random topic template
  const topicTemplate = template.topics[Math.floor(Math.random() * template.topics.length)];
  
  // Generate topic with placeholders replaced
  let topic = topicTemplate;
  if (event) {
    topic = topic.replace('{festival}', event.name).replace('{event}', event.name);
  }
  topic = topic
    .replace('{product}', `${businessType} product`)
    .replace('{category}', businessType)
    .replace('{optionA}', 'Option A')
    .replace('{optionB}', 'Option B')
    .replace('{action}', 'style')
    .replace('{benefit}', 'better engagement')
    .replace('{fact}', 'interesting industry fact')
    .replace('{process}', 'our creation process')
    .replace('{topic}', businessType)
    .replace('{trend}', 'current trends')
    .replace('{theme}', 'industry humor')
    .replace('{memory}', 'our journey')
    .replace('{person}', 'team member');

  // Generate hashtags
  const baseHashtags = template.hashtagPrefixes.slice(0, 2);
  const hashtags = [
    `#${businessType.replace(/\s+/g, '')}`,
    `#${baseHashtags[0]}`,
    '#MadeInIndia',
    event ? `#${event.name.replace(/['\s]/g, '')}` : '#BrandName',
    '#ContentCreator',
  ];

  // Select optimal posting time
  const times = OPTIMAL_POSTING_TIMES[platform];
  const time = times[Math.floor(Math.random() * times.length)];

  return {
    id: generateId(),
    date: dateStr,
    time,
    topic,
    description: `${topic} - Create engaging content for ${platform} targeting your audience.`,
    platform,
    hashtags,
    category: actualCategory,
    priority: event ? 'high' : (Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low'),
    status: 'draft',
  };
}

// Generate 30-day content calendar
export async function generateContentCalendar(
  request: CalendarGenerationRequest
): Promise<ContentCalendar> {
  const startDate = new Date(request.startDate);
  const posts: CalendarPost[] = [];
  const weeks: CalendarWeek[] = [];
  
  const categories: (keyof typeof CATEGORY_TEMPLATES)[] = [
    'promotion', 'engagement', 'educational', 'entertainment', 'ugc', 'seasonal'
  ];
  
  const platformDistribution: Record<Platform, number> = {
    instagram: 0,
    twitter: 0,
    linkedin: 0,
    facebook: 0,
  };

  let currentWeekPosts: CalendarPost[] = [];
  let weekStartDate = new Date(startDate);
  let weekNumber = 1;

  // Generate posts for 30 days
  for (let day = 0; day < 30; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + day);
    
    // Check if we need to start a new week
    if (day > 0 && currentDate.getDay() === 0) {
      // Save the current week
      const weekEndDate = new Date(currentDate);
      weekEndDate.setDate(weekEndDate.getDate() - 1);
      
      weeks.push({
        weekNumber,
        startDate: weekStartDate.toISOString().split('T')[0],
        endDate: weekEndDate.toISOString().split('T')[0],
        posts: currentWeekPosts,
        theme: getWeekTheme(weekStartDate, request.businessType),
      });
      
      currentWeekPosts = [];
      weekStartDate = new Date(currentDate);
      weekNumber++;
    }

    // Determine number of posts for this day based on postsPerWeek
    const postsPerDay = Math.ceil(request.postsPerWeek / 7);
    const dayOfWeek = currentDate.getDay();
    
    // Post more on weekdays, less on weekends
    const actualPostsToday = dayOfWeek === 0 || dayOfWeek === 6 
      ? Math.max(1, postsPerDay - 1)
      : postsPerDay;

    // Check for special events
    const dateStr = currentDate.toISOString().split('T')[0];
    const event = getEventsForDate(dateStr);
    
    for (let p = 0; p < actualPostsToday && p < request.platforms.length; p++) {
      // Rotate through platforms
      const platform = request.platforms[p % request.platforms.length];
      
      // Select category (rotate through categories, prioritize seasonal for events)
      let category = categories[day % categories.length];
      if (event) {
        category = 'seasonal';
      }
      
      const post = generatePost(currentDate, platform, category, request.businessType, posts.length);
      posts.push(post);
      currentWeekPosts.push(post);
      platformDistribution[platform]++;
    }
  }

  // Add final week if there are posts
  if (currentWeekPosts.length > 0) {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 29);
    
    weeks.push({
      weekNumber,
      startDate: weekStartDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      posts: currentWeekPosts,
      theme: getWeekTheme(weekStartDate, request.businessType),
    });
  }

  // Apply AI enhancements (simulated)
  const enhancedPosts = await enhanceWithAI(posts, request);

  return {
    id: generateId(),
    userId: 'demo_user',
    month: startDate.toLocaleString('en-US', { month: 'long' }),
    year: startDate.getFullYear(),
    businessType: request.businessType,
    targetAudience: request.targetAudience,
    weeks: weeks.map(week => ({
      ...week,
      posts: enhancedPosts.filter(p => week.posts.some(wp => wp.id === p.id)),
    })),
    totalPosts: enhancedPosts.length,
    platformDistribution,
    createdAt: new Date().toISOString(),
  };
}

// Get week theme based on date and business
function getWeekTheme(weekStart: Date, businessType: string): string {
  const themes = [
    `${businessType} Spotlight Week`,
    'Customer Appreciation Week',
    'Behind the Scenes Week',
    'Educational Series Week',
    'Community Engagement Week',
    'Product Innovation Week',
    'Sustainability Focus Week',
    'Cultural Celebration Week',
  ];
  
  // Check for any events in this week
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(weekStart);
    checkDate.setDate(weekStart.getDate() + i);
    const event = getEventsForDate(checkDate.toISOString().split('T')[0]);
    if (event) {
      return `${event.name} Celebration Week`;
    }
  }
  
  return themes[Math.floor(Math.random() * themes.length)];
}

// Simulate AI enhancement of posts
async function enhanceWithAI(posts: CalendarPost[], request: CalendarGenerationRequest): Promise<CalendarPost[]> {
  // In a real implementation, this would call an LLM API
  // For now, we enhance with more specific content
  
  return posts.map((post, index) => {
    // Add brand voice elements
    let enhancedTopic = post.topic;
    if (request.brandVoice === 'casual') {
      enhancedTopic = `Hey fam! ${post.topic} 🎉`;
    } else if (request.brandVoice === 'professional') {
      enhancedTopic = `Discover: ${post.topic}`;
    } else if (request.brandVoice === 'inspiring') {
      enhancedTopic = `✨ ${post.topic} - Transform your experience`;
    }

    // Add goal-specific elements
    let enhancedDescription = post.description;
    if (request.goals.includes('sales')) {
      enhancedDescription += ' Include clear CTA for purchase.';
    }
    if (request.goals.includes('engagement')) {
      enhancedDescription += ' Add interactive element or question.';
    }
    if (request.goals.includes('awareness')) {
      enhancedDescription += ' Focus on brand story and values.';
    }

    // Add target audience specific hashtags
    const audienceHashtags: string[] = [];
    if (request.targetAudience.toLowerCase().includes('gen z')) {
      audienceHashtags.push('#GenZ', '#Trending');
    }
    if (request.targetAudience.toLowerCase().includes('millennial')) {
      audienceHashtags.push('#MillennialLife', '#Adulting');
    }
    if (request.targetAudience.toLowerCase().includes('professional')) {
      audienceHashtags.push('#Professional', '#CareerGrowth');
    }

    return {
      ...post,
      topic: enhancedTopic,
      description: enhancedDescription,
      hashtags: [...post.hashtags, ...audienceHashtags].slice(0, 8),
    };
  });
}

// Get calendar by date range
export async function getCalendarPosts(
  startDate: string,
  endDate: string,
  platform?: Platform
): Promise<CalendarPost[]> {
  // This would fetch from DynamoDB in production
  // For now, generate sample posts
  const posts: CalendarPost[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const platforms: Platform[] = platform ? [platform] : ['instagram', 'twitter', 'linkedin', 'facebook'];
  const categories: (keyof typeof CATEGORY_TEMPLATES)[] = ['promotion', 'engagement', 'educational'];
  
  let current = new Date(start);
  let postIndex = 0;
  
  while (current <= end) {
    const platformForDay = platforms[postIndex % platforms.length];
    const categoryForDay = categories[postIndex % categories.length];
    
    posts.push(generatePost(current, platformForDay, categoryForDay, 'Your Business', postIndex));
    
    current.setDate(current.getDate() + 1);
    postIndex++;
  }
  
  return posts;
}

// Update post status
export function updatePostStatus(
  postId: string,
  status: CalendarPost['status']
): CalendarPost | null {
  // This would update in DynamoDB in production
  console.log(`Updating post ${postId} to status ${status}`);
  return null;
}

// Export calendar to ICS format
export function exportToICS(calendar: ContentCalendar): string {
  let ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Samvaad AI//Content Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${calendar.businessType} Content Calendar\n`;

  for (const week of calendar.weeks) {
    for (const post of week.posts) {
      const startDateTime = `${post.date.replace(/-/g, '')}T${post.time.replace(':', '')}00`;
      const endDateTime = `${post.date.replace(/-/g, '')}T${(parseInt(post.time.split(':')[0]) + 1).toString().padStart(2, '0')}${post.time.split(':')[1]}00`;
      
      ics += `BEGIN:VEVENT
DTSTART:${startDateTime}
DTEND:${endDateTime}
SUMMARY:[${post.platform.toUpperCase()}] ${post.topic}
DESCRIPTION:${post.description}\\n\\nHashtags: ${post.hashtags.join(' ')}
CATEGORIES:${post.category}
PRIORITY:${post.priority === 'high' ? 1 : post.priority === 'medium' ? 5 : 9}
UID:${post.id}@samvaad-ai
END:VEVENT\n`;
    }
  }

  ics += 'END:VCALENDAR';
  return ics;
}
