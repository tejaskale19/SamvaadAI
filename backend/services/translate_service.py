"""
AWS Translate Service for SAMVAAD AI
Handles content translation to Indian regional languages
"""

import boto3
import logging
import re
from typing import Dict, List, Tuple, Optional
from botocore.exceptions import ClientError

from config import get_settings, SUPPORTED_LANGUAGES

logger = logging.getLogger(__name__)
settings = get_settings()


class TranslateService:
    """Service for AWS Translate content translation"""
    
    def __init__(self):
        """Initialize AWS Translate client"""
        self.client = boto3.client(
            "translate",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        self.supported_languages = SUPPORTED_LANGUAGES
        
        # Emoji pattern for extraction
        self.emoji_pattern = re.compile(
            "["
            "\U0001F600-\U0001F64F"  # emoticons
            "\U0001F300-\U0001F5FF"  # symbols & pictographs
            "\U0001F680-\U0001F6FF"  # transport & map symbols
            "\U0001F1E0-\U0001F1FF"  # flags (iOS)
            "\U00002702-\U000027B0"
            "\U000024C2-\U0001F251"
            "\U0001F900-\U0001F9FF"  # supplemental symbols
            "\U0001FA00-\U0001FA6F"  # chess symbols
            "\U0001FA70-\U0001FAFF"  # symbols and pictographs extended
            "\U00002600-\U000026FF"  # misc symbols
            "\U00002700-\U000027BF"  # dingbats
            "]+",
            flags=re.UNICODE
        )
        
        # Hashtag pattern
        self.hashtag_pattern = re.compile(r'#\w+', re.UNICODE)
        
        # URL pattern
        self.url_pattern = re.compile(
            r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        )
        
        # Mention pattern
        self.mention_pattern = re.compile(r'@\w+', re.UNICODE)
    
    def _extract_preserved_elements(
        self,
        text: str,
        preserve_emojis: bool = True,
        preserve_hashtags: bool = True
    ) -> Tuple[str, Dict[str, List[str]]]:
        """
        Extract elements to preserve during translation
        
        Returns:
            Tuple of (cleaned text, dictionary of preserved elements)
        """
        preserved = {
            "emojis": [],
            "hashtags": [],
            "urls": [],
            "mentions": []
        }
        
        # Extract and replace URLs
        urls = self.url_pattern.findall(text)
        preserved["urls"] = urls
        for i, url in enumerate(urls):
            text = text.replace(url, f"__URL_{i}__", 1)
        
        # Extract and replace mentions
        mentions = self.mention_pattern.findall(text)
        preserved["mentions"] = mentions
        for i, mention in enumerate(mentions):
            text = text.replace(mention, f"__MENTION_{i}__", 1)
        
        # Extract and optionally replace hashtags
        if preserve_hashtags:
            hashtags = self.hashtag_pattern.findall(text)
            preserved["hashtags"] = hashtags
            for i, hashtag in enumerate(hashtags):
                text = text.replace(hashtag, f"__HASHTAG_{i}__", 1)
        
        # Extract and optionally replace emojis
        if preserve_emojis:
            emojis = self.emoji_pattern.findall(text)
            preserved["emojis"] = emojis
            for i, emoji in enumerate(emojis):
                text = text.replace(emoji, f"__EMOJI_{i}__", 1)
        
        return text, preserved
    
    def _restore_preserved_elements(
        self,
        text: str,
        preserved: Dict[str, List[str]]
    ) -> str:
        """Restore preserved elements after translation"""
        
        # Restore emojis
        for i, emoji in enumerate(preserved.get("emojis", [])):
            text = text.replace(f"__EMOJI_{i}__", emoji)
        
        # Restore hashtags
        for i, hashtag in enumerate(preserved.get("hashtags", [])):
            text = text.replace(f"__HASHTAG_{i}__", hashtag)
        
        # Restore URLs
        for i, url in enumerate(preserved.get("urls", [])):
            text = text.replace(f"__URL_{i}__", url)
        
        # Restore mentions
        for i, mention in enumerate(preserved.get("mentions", [])):
            text = text.replace(f"__MENTION_{i}__", mention)
        
        # Clean up any leftover placeholders
        text = re.sub(r'__\w+_\d+__', '', text)
        
        return text
    
    async def translate(
        self,
        text: str,
        source_language: str = "en",
        target_language: str = "hi",
        preserve_emojis: bool = True,
        preserve_hashtags: bool = True,
        preserve_formatting: bool = True
    ) -> Dict[str, any]:
        """
        Translate content while preserving emojis, hashtags, and formatting
        
        Args:
            text: Content to translate
            source_language: Source language code
            target_language: Target language code
            preserve_emojis: Whether to preserve emojis
            preserve_hashtags: Whether to preserve hashtags
            preserve_formatting: Whether to preserve text formatting
            
        Returns:
            Dictionary with translation results
        """
        if target_language not in self.supported_languages:
            return {
                "success": False,
                "error": f"Unsupported target language: {target_language}",
                "supported_languages": list(self.supported_languages.keys())
            }
        
        if source_language == target_language:
            return {
                "success": True,
                "original_content": text,
                "translated_content": text,
                "source_language": source_language,
                "target_language": target_language,
                "confidence_score": 1.0,
                "preserved_elements": {}
            }
        
        try:
            # Extract elements to preserve
            clean_text, preserved = self._extract_preserved_elements(
                text, preserve_emojis, preserve_hashtags
            )
            
            # Handle paragraph-by-paragraph translation if preserving formatting
            if preserve_formatting and "\n" in clean_text:
                paragraphs = clean_text.split("\n")
                translated_paragraphs = []
                
                for para in paragraphs:
                    if para.strip():
                        response = self.client.translate_text(
                            Text=para,
                            SourceLanguageCode=source_language,
                            TargetLanguageCode=target_language
                        )
                        translated_paragraphs.append(response["TranslatedText"])
                    else:
                        translated_paragraphs.append("")
                
                translated_text = "\n".join(translated_paragraphs)
            else:
                # Single translation call
                response = self.client.translate_text(
                    Text=clean_text,
                    SourceLanguageCode=source_language,
                    TargetLanguageCode=target_language
                )
                translated_text = response["TranslatedText"]
            
            # Restore preserved elements
            final_text = self._restore_preserved_elements(translated_text, preserved)
            
            return {
                "success": True,
                "original_content": text,
                "translated_content": final_text,
                "source_language": source_language,
                "target_language": target_language,
                "confidence_score": 0.95,  # AWS Translate doesn't provide confidence
                "preserved_elements": preserved
            }
            
        except ClientError as e:
            logger.error(f"AWS Translate error: {e}")
            return {
                "success": False,
                "error": f"AWS Translate service unavailable: {str(e)}",
                "original_content": text,
                "source_language": source_language,
                "target_language": target_language,
            }
        except Exception as e:
            logger.error(f"Translation error: {e}")
            return {
                "success": False,
                "error": str(e),
                "original_content": text
            }
    
    def _fallback_translate(
        self,
        text: str,
        source_language: str,
        target_language: str,
        preserved: Dict[str, List[str]]
    ) -> Dict[str, any]:
        """Provide demo translation when AWS Translate is unavailable"""
        
        # Demo translations for common phrases
        demo_translations = {
            "hi": {
                "Happy Diwali": "दीवाली की शुभकामनाएं",
                "Hello": "नमस्ते",
                "Welcome": "स्वागत है",
                "Thank you": "धन्यवाद",
                "Shop now": "अभी खरीदें",
                "Limited offer": "सीमित ऑफर",
                "Exclusive": "विशेष",
                "Sale": "सेल",
                "New arrival": "नई आवक",
                "Best quality": "सर्वोत्तम गुणवत्ता",
            },
            "mr": {
                "Happy Diwali": "दिवाळीच्या हार्दिक शुभेच्छा",
                "Hello": "नमस्कार",
                "Welcome": "स्वागत आहे",
                "Thank you": "धन्यवाद",
                "Shop now": "आता खरेदी करा",
                "Limited offer": "मर्यादित ऑफर",
                "Exclusive": "विशेष",
                "Sale": "सेल",
                "New arrival": "नवीन आगमन",
                "Best quality": "सर्वोत्तम दर्जा",
            },
            "ta": {
                "Happy Diwali": "தீபாவளி நல்வாழ்த்துக்கள்",
                "Hello": "வணக்கம்",
                "Welcome": "வரவேற்கிறோம்",
                "Thank you": "நன்றி",
                "Shop now": "இப்போது வாங்கவும்",
            },
            "te": {
                "Happy Diwali": "దీపావళి శుభాకాంక్షలు",
                "Hello": "నమస్కారం",
                "Welcome": "స్వాగతం",
                "Thank you": "ధన్యవాదాలు",
                "Shop now": "ఇప్పుడే షాపింగ్ చేయండి",
            },
            "bn": {
                "Happy Diwali": "শুভ দীপাবলি",
                "Hello": "নমস্কার",
                "Welcome": "স্বাগতম",
                "Thank you": "ধন্যবাদ",
                "Shop now": "এখনই কিনুন",
            },
            "gu": {
                "Happy Diwali": "દિવાળીની શુભકામનાઓ",
                "Hello": "નમસ્તે",
                "Welcome": "સ્વાગત છે",
                "Thank you": "આભાર",
                "Shop now": "હમણાં ખરીદો",
            },
            "kn": {
                "Happy Diwali": "ದೀಪಾವಳಿ ಶುಭಾಶಯಗಳು",
                "Hello": "ನಮಸ್ಕಾರ",
                "Welcome": "ಸ್ವಾಗತ",
                "Thank you": "ಧನ್ಯವಾದಗಳು",
                "Shop now": "ಈಗ ಖರೀದಿಸಿ",
            },
            "ml": {
                "Happy Diwali": "ദീപാവലി ആശംസകൾ",
                "Hello": "നമസ്കാരം",
                "Welcome": "സ്വാഗതം",
                "Thank you": "നന്ദി",
                "Shop now": "ഇപ്പോൾ വാങ്ങുക",
            },
            "pa": {
                "Happy Diwali": "ਦੀਵਾਲੀ ਦੀਆਂ ਮੁਬਾਰਕਾਂ",
                "Hello": "ਸਤ ਸ੍ਰੀ ਅਕਾਲ",
                "Welcome": "ਜੀ ਆਇਆਂ ਨੂੰ",
                "Thank you": "ਧੰਨਵਾਦ",
                "Shop now": "ਹੁਣੇ ਖਰੀਦੋ",
            },
        }
        
        translated = text
        if target_language in demo_translations:
            for eng, trans in demo_translations[target_language].items():
                translated = translated.replace(eng, trans)
                translated = translated.replace(eng.lower(), trans)
        
        # Restore preserved elements
        translated = self._restore_preserved_elements(translated, preserved)
        
        return {
            "success": True,
            "original_content": text,
            "translated_content": translated,
            "source_language": source_language,
            "target_language": target_language,
            "confidence_score": 0.75,
            "preserved_elements": preserved,
            "is_demo": True,
            "message": "Using demo translation - AWS Translate not configured"
        }
    
    async def translate_batch(
        self,
        texts: List[str],
        source_language: str = "en",
        target_language: str = "hi"
    ) -> List[Dict[str, any]]:
        """Translate multiple texts"""
        results = []
        for text in texts:
            result = await self.translate(text, source_language, target_language)
            results.append(result)
        return results
    
    def get_supported_languages(self) -> Dict[str, str]:
        """Get list of supported languages"""
        return self.supported_languages


# Create singleton instance
translate_service = TranslateService()
