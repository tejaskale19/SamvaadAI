import type { NextApiRequest, NextApiResponse } from 'next';
import type { LocalizedContent } from '../../../types';
import { translateText, getSupportedLanguages } from '../../../services/translateService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LocalizedContent | { languages: ReturnType<typeof getSupportedLanguages> } | { error: string }>
) {
  // Handle GET request to fetch supported languages
  if (req.method === 'GET') {
    return res.status(200).json({ languages: getSupportedLanguages() });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      content, 
      sourceLanguage = 'English',
      targetLanguage = 'Hindi', 
      preserveCulturalContext = true 
    } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Validate target language
    const supportedLanguages = getSupportedLanguages();
    const isValidLanguage = supportedLanguages.some(
      lang => lang.name === targetLanguage || lang.code === targetLanguage
    );

    if (!isValidLanguage) {
      return res.status(400).json({ 
        error: `Unsupported language: ${targetLanguage}. Supported languages: ${supportedLanguages.map(l => l.name).join(', ')}` 
      });
    }

    // Use the translateService with AWS Translate integration
    const translationResult = await translateText(
      content,
      sourceLanguage,
      targetLanguage,
      preserveCulturalContext
    );

    const localizedContent: LocalizedContent = {
      original: content,
      translated: translationResult.translatedText,
      language: targetLanguage,
      culturalAdaptations: translationResult.culturalAdaptations,
      preservedElements: translationResult.preservedElements,
    };

    // In production: Cache in ElastiCache
    // await elasticache.set(`translation:${hashContent(content)}:${targetLanguage}`, localizedContent);

    res.status(200).json(localizedContent);
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Failed to translate content' });
  }
}
