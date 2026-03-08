import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import culturalContext from '../datasets/cultural_context.json';

// AWS Translate client configuration
const translateClient = new TranslateClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Language code mapping for AWS Translate
const LANGUAGE_CODES: Record<string, string> = {
  'English': 'en',
  'Hindi': 'hi',
  'Marathi': 'mr',
  'Tamil': 'ta',
  'Telugu': 'te',
  'Bengali': 'bn',
  'Gujarati': 'gu',
  'Kannada': 'kn',
  'Malayalam': 'ml',
  'Punjabi': 'pa',
};

// Emoji regex pattern for preservation
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]/gu;

// Hashtag regex pattern
const HASHTAG_REGEX = /#[\w\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F]+/g;

// URL regex pattern
const URL_REGEX = /https?:\/\/[^\s]+/g;

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  culturalAdaptations: string[];
  preservedElements: {
    emojis: string[];
    hashtags: string[];
    urls: string[];
  };
}

export interface CulturalAdaptation {
  original: string;
  adapted: string;
  reason: string;
}

// Cultural keyword mappings for different languages
const CULTURAL_KEYWORD_MAPPINGS: Record<string, Record<string, string>> = {
  'hi': {
    'sustainable': 'टिकाऊ और पर्यावरण-अनुकूल',
    'eco-friendly': 'पर्यावरण के लिए अनुकूल',
    'organic': 'प्राकृतिक और जैविक',
    'handloom': 'हाथ से बुना हुआ - भारतीय कारीगरी',
    'artisan': 'कुशल कारीगर',
    'heritage': 'भारतीय विरासत',
    'traditional': 'पारंपरिक भारतीय',
    'Made in India': 'भारत में निर्मित - स्वदेशी',
    'shop local': 'स्थानीय खरीदारी करें',
    'launch': 'लॉन्च',
    'collection': 'संग्रह',
    'brand': 'ब्रांड',
  },
  'mr': {
    'sustainable': 'टिकाऊ आणि पर्यावरणपूरक',
    'eco-friendly': 'पर्यावरणास अनुकूल',
    'organic': 'सेंद्रिय आणि नैसर्गिक',
    'handloom': 'हातमागावर विणलेले',
    'artisan': 'कुशल कारागीर',
    'heritage': 'भारतीय वारसा',
    'traditional': 'पारंपरिक भारतीय',
    'Made in India': 'भारतात बनवलेले - स्वदेशी',
    'shop local': 'स्थानिक खरेदी करा',
    'launch': 'लाँच',
    'collection': 'संग्रह',
    'brand': 'ब्रँड',
  },
};

// Greeting adaptations
const GREETING_ADAPTATIONS: Record<string, Record<string, string>> = {
  'hi': {
    'hey': 'नमस्ते',
    'hi': 'नमस्ते',
    'hello': 'नमस्ते',
    'good morning': 'सुप्रभात',
    'good evening': 'शुभ संध्या',
    'welcome': 'स्वागत है',
  },
  'mr': {
    'hey': 'नमस्कार',
    'hi': 'नमस्कार',
    'hello': 'नमस्कार',
    'good morning': 'सुप्रभात',
    'good evening': 'शुभ संध्याकाळ',
    'welcome': 'स्वागत आहे',
  },
};

// Festival-specific hashtags for different languages
const FESTIVAL_HASHTAGS: Record<string, Record<string, string[]>> = {
  'hi': {
    'Diwali': ['#दीपावली', '#दिवाली', '#शुभदीपावली'],
    'Holi': ['#होली', '#रंगोंकात्योहार', '#हैप्पीहोली'],
    'Navratri': ['#नवरात्रि', '#जयमाताकी', '#गरबा'],
    'Ganesh Chaturthi': ['#गणेशचतुर्थी', '#गणपतिबाप्पा'],
  },
  'mr': {
    'Diwali': ['#दिवाळी', '#दीपावली', '#शुभदिवाळी'],
    'Holi': ['#होळी', '#रंगपंचमी'],
    'Navratri': ['#नवरात्र', '#नवरात्री'],
    'Ganesh Chaturthi': ['#गणेशोत्सव', '#गणपतीबाप्पामोरया'],
  },
};

/**
 * Extract and preserve elements that shouldn't be translated
 */
function extractPreservableElements(text: string): {
  cleanText: string;
  emojis: Array<{ index: number; emoji: string }>;
  hashtags: Array<{ index: number; hashtag: string }>;
  urls: Array<{ index: number; url: string }>;
} {
  const emojis: Array<{ index: number; emoji: string }> = [];
  const hashtags: Array<{ index: number; hashtag: string }> = [];
  const urls: Array<{ index: number; url: string }> = [];
  
  let cleanText = text;
  let placeholderIndex = 0;
  
  // Extract URLs
  cleanText = cleanText.replace(URL_REGEX, (match, offset) => {
    urls.push({ index: placeholderIndex++, url: match });
    return `[[URL_${urls.length - 1}]]`;
  });
  
  // Extract emojis
  cleanText = cleanText.replace(EMOJI_REGEX, (match, offset) => {
    emojis.push({ index: placeholderIndex++, emoji: match });
    return `[[EMOJI_${emojis.length - 1}]]`;
  });
  
  // Note: Hashtags are preserved but may need translation for Indic scripts
  const hashtagMatches = text.match(HASHTAG_REGEX);
  if (hashtagMatches) {
    hashtagMatches.forEach((tag, idx) => {
      hashtags.push({ index: idx, hashtag: tag });
    });
  }
  
  return { cleanText, emojis, hashtags, urls };
}

/**
 * Restore preserved elements to translated text
 */
function restorePreservedElements(
  translatedText: string,
  emojis: Array<{ index: number; emoji: string }>,
  urls: Array<{ index: number; url: string }>
): string {
  let result = translatedText;
  
  // Restore URLs
  urls.forEach((item, idx) => {
    result = result.replace(`[[URL_${idx}]]`, item.url);
  });
  
  // Restore emojis
  emojis.forEach((item, idx) => {
    result = result.replace(`[[EMOJI_${idx}]]`, item.emoji);
  });
  
  return result;
}

/**
 * Apply cultural adaptations to the text
 */
function applyCulturalAdaptations(
  text: string,
  targetLangCode: string
): { adaptedText: string; adaptations: string[] } {
  let adaptedText = text;
  const adaptations: string[] = [];
  
  // Apply greeting adaptations
  const greetings = GREETING_ADAPTATIONS[targetLangCode];
  if (greetings) {
    Object.entries(greetings).forEach(([english, local]) => {
      const regex = new RegExp(`\\b${english}\\b`, 'gi');
      if (regex.test(adaptedText)) {
        adaptedText = adaptedText.replace(regex, local);
        adaptations.push(`Greeting adapted: "${english}" → "${local}"`);
      }
    });
  }
  
  // Apply cultural keyword mappings
  const keywords = CULTURAL_KEYWORD_MAPPINGS[targetLangCode];
  if (keywords) {
    Object.entries(keywords).forEach(([english, local]) => {
      const regex = new RegExp(english, 'gi');
      if (regex.test(adaptedText)) {
        adaptedText = adaptedText.replace(regex, local);
        adaptations.push(`Cultural term: "${english}" → "${local}"`);
      }
    });
  }
  
  // Check for festival mentions and add cultural context
  culturalContext.festivals.forEach(festival => {
    if (text.toLowerCase().includes(festival.toLowerCase())) {
      const festivalHashtags = FESTIVAL_HASHTAGS[targetLangCode]?.[festival];
      if (festivalHashtags && festivalHashtags.length > 0) {
        adaptations.push(`Festival "${festival}" detected - local hashtags available: ${festivalHashtags.join(', ')}`);
      }
    }
  });
  
  // Add regional context awareness
  if (targetLangCode === 'hi') {
    adaptations.push('Adapted for Hindi-speaking audience (North/Central India)');
  } else if (targetLangCode === 'mr') {
    adaptations.push('Adapted for Marathi-speaking audience (Maharashtra)');
  }
  
  return { adaptedText, adaptations };
}

/**
 * Translate hashtags to target language
 */
function translateHashtags(
  hashtags: string[],
  targetLangCode: string
): string[] {
  const hashtagTranslations: Record<string, Record<string, string>> = {
    'hi': {
      '#IndianFashion': '#भारतीयफैशन',
      '#MadeInIndia': '#भारतमेंनिर्मित',
      '#Sustainable': '#टिकाऊ',
      '#EcoFriendly': '#पर्यावरणअनुकूल',
      '#Handloom': '#हथकरघा',
      '#Traditional': '#पारंपरिक',
      '#ShopLocal': '#स्थानीयखरीदी',
      '#DesiStyle': '#देसीस्टाइल',
    },
    'mr': {
      '#IndianFashion': '#भारतीयफॅशन',
      '#MadeInIndia': '#भारतातबनवलेले',
      '#Sustainable': '#टिकाऊ',
      '#EcoFriendly': '#पर्यावरणपूरक',
      '#Handloom': '#हातमाग',
      '#Traditional': '#पारंपरिक',
      '#ShopLocal': '#स्थानिकखरेदी',
      '#DesiStyle': '#देसीस्टाइल',
    },
  };
  
  const translations = hashtagTranslations[targetLangCode] || {};
  return hashtags.map(tag => {
    const upperTag = tag.charAt(0) + tag.slice(1);
    return translations[upperTag] || translations[tag] || tag;
  });
}

/**
 * Main translation function using AWS Translate with cultural adaptation
 */
export async function translateText(
  text: string,
  sourceLanguage: string = 'English',
  targetLanguage: string = 'Hindi',
  preserveCulturalContext: boolean = true
): Promise<TranslationResult> {
  const sourceLangCode = LANGUAGE_CODES[sourceLanguage] || 'en';
  const targetLangCode = LANGUAGE_CODES[targetLanguage] || 'hi';
  
  // Extract preservable elements
  const { cleanText, emojis, hashtags, urls } = extractPreservableElements(text);
  
  let translatedText: string;
  let culturalAdaptations: string[] = [];
  
  // Check if AWS credentials are configured
  const hasAWSCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
  
  if (hasAWSCredentials) {
    try {
      // Use AWS Translate
      const command = new TranslateTextCommand({
        Text: cleanText,
        SourceLanguageCode: sourceLangCode,
        TargetLanguageCode: targetLangCode,
      });
      
      const response = await translateClient.send(command);
      translatedText = response.TranslatedText || cleanText;
    } catch (error) {
      console.error('AWS Translate error:', error);
      // Fall back to local translation
      translatedText = await localFallbackTranslation(cleanText, targetLangCode);
      culturalAdaptations.push('Used local translation fallback (AWS Translate unavailable)');
    }
  } else {
    // Use local translation when AWS is not configured
    translatedText = await localFallbackTranslation(cleanText, targetLangCode);
    culturalAdaptations.push('Demo mode: Using local translation (Configure AWS credentials for production)');
  }
  
  // Restore preserved elements
  translatedText = restorePreservedElements(translatedText, emojis, urls);
  
  // Apply cultural adaptations if enabled
  if (preserveCulturalContext) {
    const { adaptedText, adaptations } = applyCulturalAdaptations(translatedText, targetLangCode);
    translatedText = adaptedText;
    culturalAdaptations = [...culturalAdaptations, ...adaptations];
  }
  
  // Translate hashtags
  const translatedHashtags = translateHashtags(
    hashtags.map(h => h.hashtag),
    targetLangCode
  );
  
  return {
    translatedText,
    sourceLanguage,
    targetLanguage,
    culturalAdaptations,
    preservedElements: {
      emojis: emojis.map(e => e.emoji),
      hashtags: translatedHashtags,
      urls: urls.map(u => u.url),
    },
  };
}

/**
 * Local fallback translation for demo mode
 */
async function localFallbackTranslation(text: string, targetLangCode: string): Promise<string> {
  // Enhanced Hindi translations
  const hindiDictionary: Record<string, string> = {
    // Common words
    'the': '',
    'a': '',
    'an': '',
    'is': 'है',
    'are': 'हैं',
    'was': 'था',
    'were': 'थे',
    'and': 'और',
    'or': 'या',
    'but': 'लेकिन',
    'with': 'के साथ',
    'for': 'के लिए',
    'our': 'हमारा',
    'your': 'आपका',
    'we': 'हम',
    'you': 'आप',
    'introducing': 'प्रस्तुत है',
    'this': 'यह',
    'that': 'वह',
    'new': 'नया',
    'now': 'अभी',
    'today': 'आज',
    
    // Fashion & sustainability terms
    'sustainable': 'टिकाऊ',
    'sustainability': 'स्थिरता',
    'eco-friendly': 'पर्यावरण अनुकूल',
    'organic': 'जैविक',
    'natural': 'प्राकृतिक',
    'handloom': 'हथकरघा',
    'handcrafted': 'हस्तनिर्मित',
    'artisan': 'कारीगर',
    'heritage': 'विरासत',
    'traditional': 'पारंपरिक',
    'fashion': 'फैशन',
    'clothing': 'वस्त्र',
    'clothes': 'कपड़े',
    'collection': 'संग्रह',
    'conscious': 'जागरूक',
    'made in india': 'भारत में निर्मित',
    'support': 'समर्थन',
    'community': 'समुदाय',
    'culture': 'संस्कृति',
    'modern': 'आधुनिक',
    'shop': 'खरीदें',
    'shopping': 'खरीदारी',
    'wear': 'पहनें',
    'style': 'शैली',
    'brand': 'ब्रांड',
    'launch': 'लॉन्च',
    'launching': 'लॉन्च हो रहा है',
    'inspired': 'प्रेरित',
    'craftsmanship': 'कारीगरी',
    'quality': 'गुणवत्ता',
    'premium': 'प्रीमियम',
    'exclusive': 'विशेष',
    'limited': 'सीमित',
    'edition': 'संस्करण',
    'beautiful': 'सुंदर',
    'elegant': 'सुरुचिपूर्ण',
    'unique': 'अनोखा',
    'authentic': 'प्रामाणिक',
    'proudly': 'गर्व से',
    'celebrate': 'जश्न मनाएं',
    'celebration': 'उत्सव',
    'story': 'कहानी',
    'journey': 'यात्रा',
    'discover': 'खोजें',
    'explore': 'पता लगाएं',
    'experience': 'अनुभव',
    'love': 'प्यार',
    'perfect': 'बिल्कुल सही',
    'best': 'सबसे अच्छा',
    
    // Business terms
    'startup': 'स्टार्टअप',
    'business': 'व्यवसाय',
    'entrepreneur': 'उद्यमी',
    'innovation': 'नवाचार',
    'growth': 'विकास',
    'success': 'सफलता',
  };
  
  // Enhanced Marathi translations
  const marathiDictionary: Record<string, string> = {
    // Common words
    'the': '',
    'a': '',
    'an': '',
    'is': 'आहे',
    'are': 'आहेत',
    'and': 'आणि',
    'or': 'किंवा',
    'but': 'पण',
    'with': 'सह',
    'for': 'साठी',
    'our': 'आमचे',
    'your': 'तुमचे',
    'we': 'आम्ही',
    'you': 'तुम्ही',
    'introducing': 'सादर करत आहोत',
    'this': 'हे',
    'that': 'ते',
    'new': 'नवीन',
    'now': 'आता',
    'today': 'आज',
    
    // Fashion & sustainability terms
    'sustainable': 'टिकाऊ',
    'sustainability': 'टिकाऊपणा',
    'eco-friendly': 'पर्यावरणपूरक',
    'organic': 'सेंद्रिय',
    'natural': 'नैसर्गिक',
    'handloom': 'हातमाग',
    'handcrafted': 'हस्तनिर्मित',
    'artisan': 'कारागीर',
    'heritage': 'वारसा',
    'traditional': 'पारंपरिक',
    'fashion': 'फॅशन',
    'clothing': 'वस्त्र',
    'clothes': 'कपडे',
    'collection': 'संग्रह',
    'conscious': 'जागरूक',
    'made in india': 'भारतात बनवलेले',
    'support': 'समर्थन',
    'community': 'समुदाय',
    'culture': 'संस्कृती',
    'modern': 'आधुनिक',
    'shop': 'खरेदी करा',
    'shopping': 'खरेदी',
    'wear': 'परिधान करा',
    'style': 'शैली',
    'brand': 'ब्रँड',
    'launch': 'लाँच',
    'launching': 'लाँच होत आहे',
    'inspired': 'प्रेरित',
    'craftsmanship': 'कारागिरी',
    'quality': 'गुणवत्ता',
    'premium': 'प्रीमियम',
    'exclusive': 'विशेष',
    'beautiful': 'सुंदर',
    'elegant': 'मोहक',
    'unique': 'अनोखे',
    'authentic': 'अस्सल',
    'proudly': 'अभिमानाने',
    'celebrate': 'साजरे करा',
    'celebration': 'उत्सव',
    'story': 'कथा',
    'journey': 'प्रवास',
    'discover': 'शोधा',
    'explore': 'अन्वेषण करा',
    'experience': 'अनुभव',
    'love': 'प्रेम',
    'perfect': 'परिपूर्ण',
    'best': 'सर्वोत्तम',
    
    // Business terms
    'startup': 'स्टार्टअप',
    'business': 'व्यवसाय',
    'entrepreneur': 'उद्योजक',
    'innovation': 'नवोपक्रम',
    'growth': 'वाढ',
    'success': 'यश',
  };
  
  // Tamil translations
  const tamilDictionary: Record<string, string> = {
    'the': '', 'a': '', 'an': '',
    'is': 'ஆகிறது', 'are': 'ஆகின்றன', 'and': 'மற்றும்', 'or': 'அல்லது', 'but': 'ஆனால்',
    'with': 'உடன்', 'for': 'க்கு', 'our': 'எங்கள்', 'your': 'உங்கள்', 'we': 'நாங்கள்', 'you': 'நீங்கள்',
    'introducing': 'அறிமுகப்படுத்துகிறோம்', 'this': 'இது', 'that': 'அது', 'new': 'புதிய', 'now': 'இப்போது', 'today': 'இன்று',
    'sustainable': 'நிலையான', 'eco-friendly': 'சுற்றுச்சூழல் நட்பு', 'organic': 'இயற்கை',
    'natural': 'இயல்பான', 'handloom': 'கைத்தறி', 'handcrafted': 'கைவினை',
    'artisan': 'கைவினைஞர்', 'heritage': 'பாரம்பரியம்', 'traditional': 'பாரம்பரிய',
    'fashion': 'நாகரீகம்', 'collection': 'தொகுப்பு', 'shop': 'கடை', 'shopping': 'ஷாப்பிங்',
    'beautiful': 'அழகான', 'quality': 'தரம்', 'love': 'அன்பு', 'celebrate': 'கொண்டாடுங்கள்',
    'discover': 'கண்டறியுங்கள்', 'explore': 'ஆராயுங்கள்', 'experience': 'அனுபவம்',
    'hello': 'வணக்கம்', 'welcome': 'வருக', 'good morning': 'காலை வணக்கம்',
    'brand': 'பிராண்ட்', 'launch': 'அறிமுகம்', 'style': 'பாணி', 'modern': 'நவீன',
  };

  // Telugu translations
  const teluguDictionary: Record<string, string> = {
    'the': '', 'a': '', 'an': '',
    'is': 'ఉంది', 'are': 'ఉన్నాయి', 'and': 'మరియు', 'or': 'లేదా', 'but': 'కానీ',
    'with': 'తో', 'for': 'కోసం', 'our': 'మా', 'your': 'మీ', 'we': 'మేము', 'you': 'మీరు',
    'introducing': 'పరిచయం చేస్తున్నాము', 'this': 'ఇది', 'that': 'అది', 'new': 'కొత్త', 'now': 'ఇప్పుడు', 'today': 'ఈరోజు',
    'sustainable': 'స్థిరమైన', 'eco-friendly': 'పర్యావరణ అనుకూల', 'organic': 'సేంద్రీయ',
    'natural': 'సహజ', 'handloom': 'చేనేత', 'handcrafted': 'చేతితో తయారు',
    'artisan': 'కళాకారుడు', 'heritage': 'వారసత్వం', 'traditional': 'సాంప్రదాయ',
    'fashion': 'ఫ్యాషన్', 'collection': 'సేకరణ', 'shop': 'దుకాణం', 'shopping': 'షాపింగ్',
    'beautiful': 'అందమైన', 'quality': 'నాణ్యత', 'love': 'ప్రేమ', 'celebrate': 'జరుపుకోండి',
    'discover': 'కనుగొనండి', 'explore': 'అన్వేషించండి', 'experience': 'అనుభవం',
    'hello': 'నమస్కారం', 'welcome': 'స్వాగతం', 'good morning': 'శుభోదయం',
    'brand': 'బ్రాండ్', 'launch': 'లాంచ్', 'style': 'శైలి', 'modern': 'ఆధునిక',
  };

  // Bengali translations
  const bengaliDictionary: Record<string, string> = {
    'the': '', 'a': '', 'an': '',
    'is': 'হয়', 'are': 'হয়', 'and': 'এবং', 'or': 'অথবা', 'but': 'কিন্তু',
    'with': 'সঙ্গে', 'for': 'জন্য', 'our': 'আমাদের', 'your': 'আপনার', 'we': 'আমরা', 'you': 'আপনি',
    'introducing': 'পরিচয় করিয়ে দিচ্ছি', 'this': 'এই', 'that': 'সেই', 'new': 'নতুন', 'now': 'এখন', 'today': 'আজ',
    'sustainable': 'টেকসই', 'eco-friendly': 'পরিবেশবান্ধব', 'organic': 'জৈব',
    'natural': 'প্রাকৃতিক', 'handloom': 'তাঁত', 'handcrafted': 'হাতে তৈরি',
    'artisan': 'কারিগর', 'heritage': 'ঐতিহ্য', 'traditional': 'ঐতিহ্যবাহী',
    'fashion': 'ফ্যাশন', 'collection': 'সংগ্রহ', 'shop': 'দোকান', 'shopping': 'কেনাকাটা',
    'beautiful': 'সুন্দর', 'quality': 'গুণমান', 'love': 'ভালোবাসা', 'celebrate': 'উদযাপন করুন',
    'discover': 'আবিষ্কার করুন', 'explore': 'অন্বেষণ করুন', 'experience': 'অভিজ্ঞতা',
    'hello': 'নমস্কার', 'welcome': 'স্বাগতম', 'good morning': 'সুপ্রভাত',
    'brand': 'ব্র্যান্ড', 'launch': 'লঞ্চ', 'style': 'স্টাইল', 'modern': 'আধুনিক',
  };

  // Gujarati translations
  const gujaratiDictionary: Record<string, string> = {
    'the': '', 'a': '', 'an': '',
    'is': 'છે', 'are': 'છે', 'and': 'અને', 'or': 'અથવા', 'but': 'પરંતુ',
    'with': 'સાથે', 'for': 'માટે', 'our': 'અમારું', 'your': 'તમારું', 'we': 'અમે', 'you': 'તમે',
    'introducing': 'રજૂ કરીએ છીએ', 'this': 'આ', 'that': 'તે', 'new': 'નવું', 'now': 'હમણાં', 'today': 'આજે',
    'sustainable': 'ટકાઉ', 'eco-friendly': 'પર્યાવરણ મૈત્રીપૂર્ણ', 'organic': 'કાર્બનિક',
    'natural': 'કુદરતી', 'handloom': 'હાથવણાટ', 'handcrafted': 'હાથથી બનાવેલ',
    'artisan': 'કારીગર', 'heritage': 'વારસો', 'traditional': 'પરંપરાગત',
    'fashion': 'ફેશન', 'collection': 'સંગ્રહ', 'shop': 'દુકાન', 'shopping': 'ખરીદી',
    'beautiful': 'સુંદર', 'quality': 'ગુણવત્તા', 'love': 'પ્રેમ', 'celebrate': 'ઉજવણી કરો',
    'discover': 'શોધો', 'explore': 'અન્વેષણ કરો', 'experience': 'અનુભવ',
    'hello': 'નમસ્તે', 'welcome': 'સ્વાગત', 'good morning': 'સુપ્રભાત',
    'brand': 'બ્રાન્ડ', 'launch': 'લોન્ચ', 'style': 'શૈલી', 'modern': 'આધુનિક',
  };

  // Kannada translations
  const kannadaDictionary: Record<string, string> = {
    'the': '', 'a': '', 'an': '',
    'is': 'ಇದೆ', 'are': 'ಇವೆ', 'and': 'ಮತ್ತು', 'or': 'ಅಥವಾ', 'but': 'ಆದರೆ',
    'with': 'ಜೊತೆ', 'for': 'ಗಾಗಿ', 'our': 'ನಮ್ಮ', 'your': 'ನಿಮ್ಮ', 'we': 'ನಾವು', 'you': 'ನೀವು',
    'introducing': 'ಪರಿಚಯಿಸುತ್ತಿದ್ದೇವೆ', 'this': 'ಇದು', 'that': 'ಅದು', 'new': 'ಹೊಸ', 'now': 'ಈಗ', 'today': 'ಇಂದು',
    'sustainable': 'ಸುಸ್ಥಿರ', 'eco-friendly': 'ಪರಿಸರ ಸ್ನೇಹಿ', 'organic': 'ಸಾವಯವ',
    'natural': 'ನೈಸರ್ಗಿಕ', 'handloom': 'ಕೈಮಗ್ಗ', 'handcrafted': 'ಕೈಯಿಂದ ಮಾಡಿದ',
    'artisan': 'ಕುಶಲಕರ್ಮಿ', 'heritage': 'ಪರಂಪರೆ', 'traditional': 'ಸಾಂಪ್ರದಾಯಿಕ',
    'fashion': 'ಫ್ಯಾಷನ್', 'collection': 'ಸಂಗ್ರಹ', 'shop': 'ಅಂಗಡಿ', 'shopping': 'ಶಾಪಿಂಗ್',
    'beautiful': 'ಸುಂದರ', 'quality': 'ಗುಣಮಟ್ಟ', 'love': 'ಪ್ರೀತಿ', 'celebrate': 'ಆಚರಿಸಿ',
    'discover': 'ಕಂಡುಹಿಡಿಯಿರಿ', 'explore': 'ಅನ್ವೇಷಿಸಿ', 'experience': 'ಅನುಭವ',
    'hello': 'ನಮಸ್ಕಾರ', 'welcome': 'ಸ್ವಾಗತ', 'good morning': 'ಶುಭೋದಯ',
    'brand': 'ಬ್ರಾಂಡ್', 'launch': 'ಲಾಂಚ್', 'style': 'ಶೈಲಿ', 'modern': 'ಆಧುನಿಕ',
  };

  // Malayalam translations
  const malayalamDictionary: Record<string, string> = {
    'the': '', 'a': '', 'an': '',
    'is': 'ആണ്', 'are': 'ആണ്', 'and': 'ഒപ്പം', 'or': 'അല്ലെങ്കിൽ', 'but': 'പക്ഷേ',
    'with': 'കൂടെ', 'for': 'വേണ്ടി', 'our': 'ഞങ്ങളുടെ', 'your': 'നിങ്ങളുടെ', 'we': 'ഞങ്ങൾ', 'you': 'നിങ്ങൾ',
    'introducing': 'പരിചയപ്പെടുത്തുന്നു', 'this': 'ഇത്', 'that': 'അത്', 'new': 'പുതിയ', 'now': 'ഇപ്പോൾ', 'today': 'ഇന്ന്',
    'sustainable': 'സുസ്ഥിര', 'eco-friendly': 'പരിസ്ഥിതി സൗഹൃദ', 'organic': 'ജൈവ',
    'natural': 'പ്രകൃതിദത്ത', 'handloom': 'കൈത്തറി', 'handcrafted': 'കൈകൊണ്ട് നിർമ്മിച്ച',
    'artisan': 'കരകൗശല വിദഗ്ധൻ', 'heritage': 'പൈതൃകം', 'traditional': 'പരമ്പരാഗത',
    'fashion': 'ഫാഷൻ', 'collection': 'ശേഖരം', 'shop': 'കട', 'shopping': 'ഷോപ്പിംഗ്',
    'beautiful': 'മനോഹരം', 'quality': 'ഗുണനിലവാരം', 'love': 'സ്നേഹം', 'celebrate': 'ആഘോഷിക്കൂ',
    'discover': 'കണ്ടെത്തൂ', 'explore': 'പര്യവേക്ഷണം ചെയ്യൂ', 'experience': 'അനുഭവം',
    'hello': 'നമസ്കാരം', 'welcome': 'സ്വാഗതം', 'good morning': 'സുപ്രഭാതം',
    'brand': 'ബ്രാൻഡ്', 'launch': 'ലോഞ്ച്', 'style': 'ശൈലി', 'modern': 'ആധുനിക',
  };

  // Punjabi translations
  const punjabiDictionary: Record<string, string> = {
    'the': '', 'a': '', 'an': '',
    'is': 'ਹੈ', 'are': 'ਹਨ', 'and': 'ਅਤੇ', 'or': 'ਜਾਂ', 'but': 'ਪਰ',
    'with': 'ਨਾਲ', 'for': 'ਲਈ', 'our': 'ਸਾਡਾ', 'your': 'ਤੁਹਾਡਾ', 'we': 'ਅਸੀਂ', 'you': 'ਤੁਸੀਂ',
    'introducing': 'ਪੇਸ਼ ਕਰ ਰਹੇ ਹਾਂ', 'this': 'ਇਹ', 'that': 'ਉਹ', 'new': 'ਨਵਾਂ', 'now': 'ਹੁਣ', 'today': 'ਅੱਜ',
    'sustainable': 'ਟਿਕਾਊ', 'eco-friendly': 'ਵਾਤਾਵਰਣ ਅਨੁਕੂਲ', 'organic': 'ਜੈਵਿਕ',
    'natural': 'ਕੁਦਰਤੀ', 'handloom': 'ਹੱਥਕਰਘਾ', 'handcrafted': 'ਹੱਥ ਨਾਲ ਬਣਾਇਆ',
    'artisan': 'ਕਾਰੀਗਰ', 'heritage': 'ਵਿਰਾਸਤ', 'traditional': 'ਰਵਾਇਤੀ',
    'fashion': 'ਫੈਸ਼ਨ', 'collection': 'ਸੰਗ੍ਰਹਿ', 'shop': 'ਦੁਕਾਨ', 'shopping': 'ਖਰੀਦਦਾਰੀ',
    'beautiful': 'ਸੁੰਦਰ', 'quality': 'ਗੁਣਵੱਤਾ', 'love': 'ਪਿਆਰ', 'celebrate': 'ਮਨਾਓ',
    'discover': 'ਖੋਜੋ', 'explore': 'ਪੜਚੋਲ ਕਰੋ', 'experience': 'ਅਨੁਭਵ',
    'hello': 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ', 'welcome': 'ਜੀ ਆਇਆਂ ਨੂੰ', 'good morning': 'ਸ਼ੁਭ ਸਵੇਰ',
    'brand': 'ਬ੍ਰਾਂਡ', 'launch': 'ਲਾਂਚ', 'style': 'ਸ਼ੈਲੀ', 'modern': 'ਆਧੁਨਿਕ',
  };

  // Select dictionary based on target language
  const dictionaries: Record<string, Record<string, string>> = {
    'hi': hindiDictionary,
    'mr': marathiDictionary,
    'ta': tamilDictionary,
    'te': teluguDictionary,
    'bn': bengaliDictionary,
    'gu': gujaratiDictionary,
    'kn': kannadaDictionary,
    'ml': malayalamDictionary,
    'pa': punjabiDictionary,
  };

  const dictionary = dictionaries[targetLangCode] || hindiDictionary;
  
  let translatedText = text;
  
  // Sort by length (longest first) to avoid partial replacements
  const sortedEntries = Object.entries(dictionary).sort((a, b) => b[0].length - a[0].length);
  
  for (const [english, translation] of sortedEntries) {
    if (translation) {
      const regex = new RegExp(`\\b${english}\\b`, 'gi');
      translatedText = translatedText.replace(regex, translation);
    }
  }
  
  return translatedText;
}

/**
 * Get supported languages
 */
export function getSupportedLanguages(): Array<{ code: string; name: string; nativeName: string }> {
  return [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
    { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
    { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  ];
}

export default {
  translateText,
  getSupportedLanguages,
};
