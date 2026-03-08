"""
Engagement Prediction Service for SAMVAAD AI
Analyzes content and predicts engagement metrics
"""

import logging
import re
from datetime import datetime
from typing import Dict, List, Optional, Any
from textblob import TextBlob
import math

from config import get_settings, PLATFORM_CONFIGS, ENGAGEMENT_WEIGHTS

logger = logging.getLogger(__name__)
settings = get_settings()


class EngagementService:
    """Service for predicting content engagement"""
    
    def __init__(self):
        """Initialize engagement prediction service"""
        self.weights = ENGAGEMENT_WEIGHTS
        self.platform_configs = PLATFORM_CONFIGS
        
        # Optimal posting times for Indian audience (IST hours)
        self.optimal_times = {
            "instagram": [9, 12, 17, 19, 20, 21],
            "twitter": [8, 12, 17, 21],
            "linkedin": [7, 8, 12, 17, 18],
            "facebook": [9, 13, 16, 19, 20],
            "amazon": [10, 14, 20, 21],  # Shopping times
        }
        
        # High-performing hashtag patterns for India
        self.trending_hashtags = {
            "general": ["#MadeInIndia", "#VocalForLocal", "#IndianBrand", "#ShopIndian"],
            "festive": ["#Diwali", "#Holi", "#Navratri", "#Eid", "#Christmas", "#FestivalSeason"],
            "fashion": ["#IndianFashion", "#EthnicWear", "#Handloom", "#Sustainable"],
            "food": ["#IndianFood", "#Foodie", "#HomeMade", "#StreetFood"],
            "tech": ["#StartupIndia", "#TechIndia", "#Innovation", "#DigitalIndia"],
        }
        
        # Sentiment keywords for Indian context
        self.positive_keywords = [
            "exclusive", "premium", "handcrafted", "authentic", "traditional",
            "celebration", "festival", "joy", "happiness", "love", "beautiful",
            "amazing", "wonderful", "special", "unique", "blessed", "grateful"
        ]
        
        self.emoji_pattern = re.compile(
            "["
            "\U0001F600-\U0001F64F"
            "\U0001F300-\U0001F5FF"
            "\U0001F680-\U0001F6FF"
            "\U0001F1E0-\U0001F1FF"
            "\U00002702-\U000027B0"
            "\U000024C2-\U0001F251"
            "]+",
            flags=re.UNICODE
        )
    
    def _analyze_post_length(self, content: str, platform: str) -> float:
        """
        Analyze post length relative to platform optimal lengths
        
        Returns score from 0-100
        """
        config = self.platform_configs.get(platform, self.platform_configs["instagram"])
        max_length = config["max_length"]
        content_length = len(content)
        
        # Optimal length is typically 50-80% of max for most platforms
        if platform == "twitter":
            optimal_range = (100, 250)
        elif platform == "instagram":
            optimal_range = (150, 1000)
        elif platform == "linkedin":
            optimal_range = (200, 1500)
        elif platform == "facebook":
            optimal_range = (80, 500)
        elif platform == "amazon":
            optimal_range = (150, 1500)
        else:
            optimal_range = (100, max_length * 0.7)
        
        if content_length < optimal_range[0]:
            # Too short
            return max(30, (content_length / optimal_range[0]) * 70)
        elif content_length <= optimal_range[1]:
            # Optimal length
            return 100
        elif content_length <= max_length:
            # Slightly long but within limits
            excess = (content_length - optimal_range[1]) / (max_length - optimal_range[1])
            return max(60, 100 - (excess * 40))
        else:
            # Exceeds maximum
            return 20
    
    def _count_emojis(self, content: str) -> int:
        """Count emojis in content"""
        emojis = self.emoji_pattern.findall(content)
        return sum(len(e) for e in emojis)
    
    def _analyze_emoji_usage(self, content: str, platform: str) -> float:
        """
        Analyze emoji usage for engagement
        
        Returns score from 0-100
        """
        config = self.platform_configs.get(platform, {})
        
        if not config.get("supports_emojis", True):
            # Platform doesn't support emojis well (Amazon)
            emoji_count = self._count_emojis(content)
            return 100 if emoji_count == 0 else max(50, 100 - (emoji_count * 10))
        
        emoji_count = self._count_emojis(content)
        content_length = len(content)
        
        # Calculate emoji density
        if content_length == 0:
            return 50
        
        emoji_density = emoji_count / (content_length / 100)
        
        # Optimal emoji density varies by platform
        if platform == "instagram":
            # Instagram loves emojis - optimal is 3-8 per 100 chars
            if 2 <= emoji_density <= 5:
                return 100
            elif emoji_density < 2:
                return 70 + (emoji_density * 15)
            else:
                return max(50, 100 - ((emoji_density - 5) * 10))
        elif platform == "twitter":
            # Twitter - moderate emojis - optimal 1-3
            if 1 <= emoji_density <= 3:
                return 100
            elif emoji_density < 1:
                return 80
            else:
                return max(60, 100 - ((emoji_density - 3) * 15))
        elif platform == "linkedin":
            # LinkedIn - minimal emojis - optimal 0-2
            if emoji_density <= 2:
                return 100
            else:
                return max(50, 100 - ((emoji_density - 2) * 20))
        else:
            # Default scoring
            if 1 <= emoji_density <= 4:
                return 100
            return max(50, 100 - abs(emoji_density - 2.5) * 10)
    
    def _extract_hashtags(self, content: str) -> List[str]:
        """Extract hashtags from content"""
        return re.findall(r'#\w+', content)
    
    def _analyze_hashtags(self, content: str, hashtags: List[str], platform: str) -> float:
        """
        Analyze hashtag usage for engagement
        
        Returns score from 0-100
        """
        config = self.platform_configs.get(platform, {})
        optimal_count = config.get("optimal_hashtags", 5)
        max_hashtags = config.get("max_hashtags", 10)
        
        # Combine explicit hashtags with extracted ones
        all_hashtags = set(hashtags + self._extract_hashtags(content))
        hashtag_count = len(all_hashtags)
        
        if max_hashtags == 0:
            # Platform doesn't use hashtags (Amazon)
            return 100 if hashtag_count == 0 else 50
        
        # Score based on count optimality
        if hashtag_count == 0:
            return 40  # No hashtags is not ideal
        elif hashtag_count <= optimal_count:
            count_score = 70 + (hashtag_count / optimal_count) * 30
        elif hashtag_count <= max_hashtags:
            excess = hashtag_count - optimal_count
            max_excess = max_hashtags - optimal_count
            count_score = 100 - (excess / max_excess) * 30
        else:
            count_score = 50  # Too many hashtags
        
        # Check for trending/relevant hashtags
        relevance_bonus = 0
        for hashtag in all_hashtags:
            hashtag_lower = hashtag.lower()
            for category, tags in self.trending_hashtags.items():
                if any(tag.lower() in hashtag_lower or hashtag_lower in tag.lower() for tag in tags):
                    relevance_bonus += 5
        
        return min(100, count_score + relevance_bonus)
    
    def _analyze_sentiment(self, content: str) -> float:
        """
        Analyze content sentiment
        
        Returns score from 0-100
        """
        try:
            blob = TextBlob(content)
            
            # Get polarity (-1 to 1) and subjectivity (0 to 1)
            polarity = blob.sentiment.polarity
            subjectivity = blob.sentiment.subjectivity
            
            # Convert polarity to score (positive content performs better)
            # Map -1 to 1 range to 30-100 range (very negative to very positive)
            polarity_score = ((polarity + 1) / 2) * 70 + 30
            
            # Moderate subjectivity is good (not too dry, not too opinionated)
            # Optimal is around 0.4-0.6
            if 0.3 <= subjectivity <= 0.7:
                subjectivity_score = 100
            else:
                subjectivity_score = 100 - abs(subjectivity - 0.5) * 50
            
            # Check for positive keywords
            keyword_bonus = 0
            content_lower = content.lower()
            for keyword in self.positive_keywords:
                if keyword in content_lower:
                    keyword_bonus += 3
            
            # Combine scores
            sentiment_score = (polarity_score * 0.5) + (subjectivity_score * 0.3) + min(20, keyword_bonus)
            
            return min(100, max(0, sentiment_score))
            
        except Exception as e:
            logger.warning(f"Sentiment analysis error: {e}")
            return 70  # Default neutral-positive score
    
    def _analyze_timing(self, posting_time: Optional[datetime], platform: str) -> float:
        """
        Analyze posting time effectiveness
        
        Returns score from 0-100
        """
        if posting_time is None:
            return 70  # Default score if no time specified
        
        optimal_hours = self.optimal_times.get(platform, [9, 12, 17, 20])
        hour = posting_time.hour
        
        # Check if it's an optimal hour
        if hour in optimal_hours:
            return 100
        
        # Calculate distance from nearest optimal hour
        min_distance = min(abs(hour - opt_hour) for opt_hour in optimal_hours)
        min_distance = min(min_distance, 24 - min_distance)  # Consider wraparound
        
        # Score decreases with distance from optimal
        return max(40, 100 - (min_distance * 10))
    
    def _analyze_cultural_relevance(self, content: str, cultural_context: Optional[str] = None) -> float:
        """
        Analyze cultural relevance for Indian audience
        
        Returns score from 0-100
        """
        score = 60  # Base score
        content_lower = content.lower()
        
        # Check for festival/cultural mentions
        cultural_keywords = {
            "diwali": 15, "deepavali": 15, "holi": 15, "navratri": 15,
            "eid": 15, "christmas": 10, "pongal": 12, "onam": 12,
            "ganesh": 12, "durga": 12, "janmashtami": 12,
            "independence": 10, "republic day": 10,
            "india": 8, "indian": 8, "desi": 8,
            "traditional": 8, "heritage": 8, "artisan": 8,
            "handmade": 8, "authentic": 8, "local": 5,
        }
        
        for keyword, bonus in cultural_keywords.items():
            if keyword in content_lower:
                score += bonus
        
        # Bonus if explicit cultural context provided
        if cultural_context:
            if cultural_context.lower() in content_lower:
                score += 10
            score += 5  # Bonus for having context
        
        # Check for regional language words (Hindi/Marathi common words)
        regional_words = [
            "namaste", "namaskar", "dhanyawad", "shubh", "jai",
            "dil", "pyaar", "khushi", "tyohar", "utsav"
        ]
        for word in regional_words:
            if word in content_lower:
                score += 5
        
        return min(100, score)
    
    async def predict_engagement(
        self,
        content: str,
        platform: str = "instagram",
        hashtags: Optional[List[str]] = None,
        posting_time: Optional[datetime] = None,
        target_audience: Optional[str] = None,
        cultural_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Predict engagement for content
        
        Args:
            content: The content to analyze
            platform: Target platform
            hashtags: List of hashtags
            posting_time: Planned posting time
            target_audience: Target audience description
            cultural_context: Cultural/festival context
            
        Returns:
            Engagement prediction with score, factors, and recommendations
        """
        hashtags = hashtags or []
        
        # Analyze individual factors
        timing_score = self._analyze_timing(posting_time, platform)
        hashtag_score = self._analyze_hashtags(content, hashtags, platform)
        
        # Content quality combines length, emoji usage, and sentiment
        length_score = self._analyze_post_length(content, platform)
        emoji_score = self._analyze_emoji_usage(content, platform)
        sentiment_score = self._analyze_sentiment(content)
        content_quality_score = (length_score * 0.3 + emoji_score * 0.3 + sentiment_score * 0.4)
        
        cultural_score = self._analyze_cultural_relevance(content, cultural_context)
        
        # Calculate weighted overall score
        factors = {
            "timing": round(timing_score, 1),
            "hashtags": round(hashtag_score, 1),
            "content_quality": round(content_quality_score, 1),
            "cultural_relevance": round(cultural_score, 1),
            "sentiment": round(sentiment_score, 1),
        }
        
        overall_score = (
            factors["timing"] * self.weights["timing"] +
            factors["hashtags"] * self.weights["hashtags"] +
            factors["content_quality"] * self.weights["content_quality"] +
            factors["cultural_relevance"] * self.weights["cultural_relevance"] +
            factors["sentiment"] * self.weights["sentiment"]
        )
        
        # Calculate confidence based on factor variance
        factor_values = list(factors.values())
        variance = sum((f - overall_score) ** 2 for f in factor_values) / len(factor_values)
        confidence = max(0.5, min(0.95, 1 - (math.sqrt(variance) / 50)))
        
        # Generate recommendations
        recommendations = self._generate_recommendations(factors, platform, hashtags, posting_time)
        
        # Predict reach and likes (rough estimates)
        base_reach = {"instagram": 1000, "twitter": 500, "linkedin": 300, "facebook": 400, "amazon": 200}
        base = base_reach.get(platform, 500)
        predicted_reach = int(base * (overall_score / 50) * (1 + len(hashtags) * 0.1))
        predicted_likes = int(predicted_reach * (overall_score / 100) * 0.05)
        
        # Get optimal posting times
        optimal_times = [f"{h}:00 IST" for h in self.optimal_times.get(platform, [9, 12, 17, 20])]
        
        return {
            "score": round(overall_score, 1),
            "confidence": round(confidence, 2),
            "factors": factors,
            "recommendations": recommendations,
            "predicted_reach": predicted_reach,
            "predicted_likes": predicted_likes,
            "optimal_posting_times": optimal_times,
        }
    
    def _generate_recommendations(
        self,
        factors: Dict[str, float],
        platform: str,
        hashtags: List[str],
        posting_time: Optional[datetime]
    ) -> List[str]:
        """Generate improvement recommendations based on factor scores"""
        recommendations = []
        
        # Timing recommendations
        if factors["timing"] < 70:
            optimal = self.optimal_times.get(platform, [9, 12, 17, 20])
            time_str = ", ".join([f"{h}:00" for h in optimal[:3]])
            recommendations.append(f"Consider posting at optimal times: {time_str} IST for better reach")
        
        # Hashtag recommendations
        if factors["hashtags"] < 70:
            config = self.platform_configs.get(platform, {})
            optimal = config.get("optimal_hashtags", 5)
            current = len(hashtags)
            if current < optimal:
                recommendations.append(f"Add {optimal - current} more relevant hashtags for better discoverability")
            elif current > config.get("max_hashtags", 10):
                recommendations.append("Reduce hashtag count - too many can hurt engagement")
            else:
                recommendations.append("Use more trending hashtags like #MadeInIndia or #VocalForLocal")
        
        # Content quality recommendations
        if factors["content_quality"] < 70:
            recommendations.append("Improve content by adding engaging emojis and maintaining optimal length")
        
        # Cultural relevance recommendations
        if factors["cultural_relevance"] < 70:
            recommendations.append("Add cultural context or festival references to connect with Indian audience")
        
        # Sentiment recommendations
        if factors["sentiment"] < 70:
            recommendations.append("Use more positive and engaging language to boost sentiment score")
        
        # Add general best practices if few recommendations
        if len(recommendations) < 2:
            recommendations.append("Content looks good! Consider A/B testing with slight variations")
        
        return recommendations[:5]  # Limit to 5 recommendations


# Create singleton instance
engagement_service = EngagementService()
