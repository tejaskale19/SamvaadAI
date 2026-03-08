import OpenAI from 'openai';
import type { Platform, ContentVariant } from '../types';
import culturalContext from '../datasets/cultural_context.json';
import { generateHashtagRecommendations } from './trendService';

// Initialize OpenAI client
let openaiClient: OpenAI | null = null;

const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

if (hasOpenAIKey) {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

type SocialMediaPlatform = keyof typeof culturalContext.social_media_trends;

// Platform-specific guidelines for AI
const PLATFORM_GUIDELINES: Record<Platform, string> = {
  instagram: 'Instagram: visual-focused, use emojis, 2200 character limit, include hashtags, engaging hooks',
  twitter: 'Twitter/X: concise, max 280 characters, trending topics, witty, minimal hashtags (2-3)',
  linkedin: 'LinkedIn: professional tone, industry insights, longer form OK, minimal emojis, business focus',
  facebook: 'Facebook: conversational, community-focused, can be longer, moderate emoji use',
};

// Cultural context for Indian audience
const INDIAN_CONTEXT = `
Target audience: Indian consumers with cultural context awareness.
Include Indian cultural references where appropriate (festivals like Diwali, Holi; values like family, tradition).
Use Indian English expressions naturally.
Reference sustainability, Made in India, artisan craftsmanship themes.
Support local businesses and traditional Indian crafts messaging.
`;

// Generate AI content using OpenAI
export async function generateAIContent(
  prompt: string,
  platform: Platform,
  numberOfVariants: number = 3
): Promise<{
  variants: ContentVariant[];
  isAIGenerated: boolean;
}> {
  // Get trending hashtags for the platform
  const hashtagRecommendations = await generateHashtagRecommendations(prompt, platform, 10);
  const trendingHashtags = hashtagRecommendations.map(h => h.hashtag);

  // If no OpenAI API key, use template-based fallback
  if (!openaiClient || !hasOpenAIKey) {
    console.log('OpenAI not configured, using template-based generation');
    return {
      variants: generateTemplateVariants(prompt, platform, numberOfVariants, trendingHashtags),
      isAIGenerated: false,
    };
  }

  try {
    const systemPrompt = `You are an expert social media content creator specializing in Indian markets and sustainable fashion. 
Create engaging, culturally-aware social media content.

Platform-specific guidelines: ${PLATFORM_GUIDELINES[platform]}

${INDIAN_CONTEXT}

Available trending hashtags: ${trendingHashtags.slice(0, 8).join(', ')}

Generate content that:
1. Is authentic and resonates with Indian audience
2. Uses appropriate emojis
3. Includes relevant hashtags (from the trending list when possible)
4. Has strong calls-to-action
5. Follows platform best practices`;

    const userPrompt = `Create ${numberOfVariants} different social media post variants for ${platform} based on this prompt:

"${prompt}"

For each variant, provide:
1. A different tone (professional, casual, inspirational)
2. Engaging content optimized for ${platform}
3. Relevant hashtags (use from trending list: ${trendingHashtags.slice(0, 5).join(', ')})
4. Appropriate emojis

Format each variant as JSON:
{
  "variants": [
    {
      "tone": "professional|casual|inspirational",
      "content": "the social media post content",
      "hashtags": ["#hashtag1", "#hashtag2", ...]
    }
  ]
}`;

    const response = await openaiClient.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });

    const responseContent = response.choices[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const variants: ContentVariant[] = parsed.variants.map((v: any, index: number) => ({
        id: `variant-${Date.now()}-${index}`,
        content: v.content,
        platform,
        hashtags: v.hashtags || trendingHashtags.slice(0, 5),
        tone: v.tone || ['professional', 'casual', 'inspirational'][index],
        engagementScore: Math.floor(Math.random() * 20) + 80, // 80-100 for AI content
      }));

      return {
        variants: variants.slice(0, numberOfVariants),
        isAIGenerated: true,
      };
    }

    throw new Error('Failed to parse AI response');
  } catch (error) {
    console.error('AI generation error, falling back to templates:', error);
    return {
      variants: generateTemplateVariants(prompt, platform, numberOfVariants, trendingHashtags),
      isAIGenerated: false,
    };
  }
}

// Fallback template-based generation
function generateTemplateVariants(
  prompt: string,
  platform: Platform,
  numberOfVariants: number,
  trendingHashtags: string[]
): ContentVariant[] {
  const platformKey = platform as SocialMediaPlatform;
  const platformConfig = culturalContext.social_media_trends[platformKey] || culturalContext.social_media_trends.instagram;
  const sustainableKeywords = culturalContext.sustainability_keywords.english;
  const fashionThemes = [...culturalContext.fashion_themes.sustainable, ...culturalContext.fashion_themes.traditional];

  const variantTypes: Array<'professional' | 'casual' | 'inspirational'> = [
    'professional',
    'casual',
    'inspirational',
  ];

  const variants: ContentVariant[] = [];

  for (let i = 0; i < Math.min(numberOfVariants, 3); i++) {
    const variantType = variantTypes[i];
    const variantHashtags = trendingHashtags.slice(i * 3, (i + 1) * 3 + 2);
    const hashtagString = variantHashtags.length > 0 
      ? variantHashtags.join(' ') 
      : platformConfig.hashtag_patterns.slice(0, 3).join(' ');

    const contentTemplates: Record<string, string> = {
      professional: `🌿 Introducing our sustainable collection inspired by Indian heritage.

${prompt}

Our collection features ${fashionThemes[i % fashionThemes.length]} craftsmanship, created with ${sustainableKeywords[i % sustainableKeywords.length].toLowerCase()} practices. Each piece tells a story of tradition meeting modern consciousness.

Shop consciously. Wear proudly. 🇮🇳

${hashtagString}`,

      casual: `Hey fashion fam! 👋

Ready to upgrade your wardrobe the sustainable way? 🌱

${prompt}

We're all about that ${fashionThemes[(i + 1) % fashionThemes.length]} vibe with zero guilt! Our clothes are made with love, tradition, and respect for Mother Earth. 🌍

Who's in? Drop a 💚 if you're ready to shop!

${hashtagString}`,

      inspirational: `✨ Fashion that honors our roots while protecting our future ✨

${prompt}

"The best time to plant a tree was 20 years ago. The second best time is now." - Just like the best time to choose sustainable fashion!

Our ${fashionThemes[(i + 2) % fashionThemes.length]} collection celebrates the artisans who weave dreams into fabric. Every purchase supports:
🌱 Sustainable practices
👨‍👩‍👧‍👦 Artisan communities
🇮🇳 Made in India movement

Join the conscious fashion revolution! 💫

${hashtagString}`
    };

    const tones: Array<'professional' | 'casual' | 'inspirational' | 'humorous'> = ['professional', 'casual', 'inspirational'];

    variants.push({
      id: `variant-${Date.now()}-${i}`,
      content: contentTemplates[variantType],
      platform,
      hashtags: variantHashtags.length > 0 ? variantHashtags : platformConfig.hashtag_patterns.slice(0, 5),
      tone: tones[i % 3],
      engagementScore: Math.floor(Math.random() * 30) + 70, // 70-100 range
    });
  }

  return variants;
}

// Check if AI is available
export function isAIAvailable(): boolean {
  return hasOpenAIKey && openaiClient !== null;
}

export default {
  generateAIContent,
  isAIAvailable,
};
