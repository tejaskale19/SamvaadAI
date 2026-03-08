"""
Amazon SageMaker Service for SAMVAAD AI
Machine Learning service for engagement prediction
"""

import boto3
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from botocore.exceptions import ClientError
import hashlib

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class SageMakerService:
    """Service for Amazon SageMaker ML predictions"""
    
    def __init__(self):
        """Initialize SageMaker runtime client"""
        self.enabled = False
        self.endpoint_name = getattr(settings, 'SAGEMAKER_ENDPOINT_NAME', None)
        
        if self.endpoint_name:
            try:
                self.client = boto3.client(
                    "sagemaker-runtime",
                    region_name=settings.AWS_REGION,
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                )
                self.enabled = True
                logger.info(f"SageMaker endpoint configured: {self.endpoint_name}")
            except Exception as e:
                logger.warning(f"SageMaker client initialization failed: {e}")
                self.enabled = False
        else:
            logger.info("SageMaker endpoint not configured. Using local fallback.")
    
    def _extract_features(self, content: str, platform: str, hashtags: List[str]) -> Dict[str, Any]:
        """
        Extract ML features from content
        
        Feature engineering for SageMaker model:
        - content_length: Length of content
        - word_count: Number of words
        - hashtag_count: Number of hashtags
        - emoji_count: Number of emojis
        - question_count: Number of questions
        - exclamation_count: Number of exclamations
        - platform_encoded: One-hot encoded platform
        - is_weekend: Whether posting on weekend
        """
        import re
        
        # Basic content features
        content_length = len(content)
        word_count = len(content.split())
        hashtag_count = len(hashtags)
        
        # Emoji detection
        emoji_pattern = re.compile(
            "["
            "\U0001F600-\U0001F64F"
            "\U0001F300-\U0001F5FF"
            "\U0001F680-\U0001F6FF"
            "\U0001F1E0-\U0001F1FF"
            "]+"
        )
        emoji_count = len(emoji_pattern.findall(content))
        
        # Punctuation features
        question_count = content.count('?')
        exclamation_count = content.count('!')
        
        # Platform encoding
        platforms = ['instagram', 'twitter', 'linkedin', 'facebook', 'amazon']
        platform_encoded = [1.0 if p == platform.lower() else 0.0 for p in platforms]
        
        # Time features
        current_time = datetime.now()
        hour_of_day = current_time.hour
        day_of_week = current_time.weekday()
        is_weekend = 1.0 if day_of_week >= 5 else 0.0
        
        # Indian peak hours
        is_peak_hour = 1.0 if hour_of_day in [9, 12, 17, 19, 20, 21] else 0.0
        
        # Cultural keywords detection
        cultural_keywords = [
            'diwali', 'holi', 'festival', 'indian', 'india',
            'traditional', 'handcraft', 'artisan', 'heritage'
        ]
        content_lower = content.lower()
        cultural_score = sum(1 for kw in cultural_keywords if kw in content_lower)
        
        return {
            "content_length": content_length,
            "word_count": word_count,
            "hashtag_count": hashtag_count,
            "emoji_count": emoji_count,
            "question_count": question_count,
            "exclamation_count": exclamation_count,
            "is_weekend": is_weekend,
            "is_peak_hour": is_peak_hour,
            "cultural_score": cultural_score,
            "platform_encoded": platform_encoded,
            "hour_of_day": hour_of_day,
            "day_of_week": day_of_week,
        }
    
    async def predict_engagement(
        self,
        content: str,
        platform: str,
        hashtags: List[str] = None,
        posting_time: Optional[datetime] = None,
        target_audience: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Predict engagement using SageMaker ML model
        
        Args:
            content: The content text to analyze
            platform: Target social media platform
            hashtags: List of hashtags in the content
            posting_time: Planned posting time
            target_audience: Target audience description
            
        Returns:
            Dictionary with engagement score, confidence, and recommendations
        """
        hashtags = hashtags or []
        
        # Extract features
        features = self._extract_features(content, platform, hashtags)
        
        if self.enabled:
            try:
                # Prepare payload for SageMaker endpoint
                payload = {
                    "instances": [
                        {
                            "features": [
                                features["content_length"],
                                features["word_count"],
                                features["hashtag_count"],
                                features["emoji_count"],
                                features["question_count"],
                                features["exclamation_count"],
                                features["is_weekend"],
                                features["is_peak_hour"],
                                features["cultural_score"],
                                features["hour_of_day"],
                                features["day_of_week"],
                                *features["platform_encoded"],
                            ]
                        }
                    ]
                }
                
                # Invoke SageMaker endpoint
                response = self.client.invoke_endpoint(
                    EndpointName=self.endpoint_name,
                    Body=json.dumps(payload),
                    ContentType='application/json',
                    Accept='application/json'
                )
                
                result = json.loads(response['Body'].read().decode())
                
                # Parse SageMaker response
                predictions = result.get("predictions", [{}])[0]
                
                engagement_score = predictions.get("engagement_score", 75)
                confidence = predictions.get("confidence", 0.8)
                best_posting_time = predictions.get("best_posting_time")
                content_quality = predictions.get("content_quality", 80)
                cultural_relevance = predictions.get("cultural_relevance", 85)
                
                return {
                    "score": min(100, max(0, int(engagement_score))),
                    "confidence": round(confidence, 2),
                    "content_quality_score": content_quality,
                    "cultural_relevance_score": cultural_relevance,
                    "best_posting_time": best_posting_time,
                    "model_version": "sagemaker-v1",
                    "features": features,
                    "recommendations": self._generate_recommendations(features, platform),
                    "predicted_reach": self._estimate_reach(engagement_score, platform),
                    "predicted_likes": self._estimate_likes(engagement_score, platform),
                    "optimal_posting_times": self._get_optimal_times(platform),
                }
                
            except ClientError as e:
                logger.error(f"SageMaker prediction error: {e}")
                # Fallback to local prediction
                return await self._local_prediction(features, platform)
        else:
            # Use local heuristic prediction
            return await self._local_prediction(features, platform)
    
    async def _local_prediction(
        self,
        features: Dict[str, Any],
        platform: str
    ) -> Dict[str, Any]:
        """
        Local fallback prediction when SageMaker is not available
        Uses heuristic rules based on platform best practices
        """
        score = 50.0  # Base score
        
        # Content length scoring
        platform_optimal_lengths = {
            "instagram": (150, 1000),
            "twitter": (100, 250),
            "linkedin": (200, 1500),
            "facebook": (80, 500),
            "amazon": (150, 1500),
        }
        
        optimal = platform_optimal_lengths.get(platform, (100, 500))
        length = features["content_length"]
        
        if optimal[0] <= length <= optimal[1]:
            score += 15
        elif length < optimal[0]:
            score += 5
        else:
            score += 8
        
        # Hashtag scoring
        platform_optimal_hashtags = {
            "instagram": (5, 15),
            "twitter": (1, 3),
            "linkedin": (2, 5),
            "facebook": (1, 3),
            "amazon": (0, 0),
        }
        
        optimal_hashtags = platform_optimal_hashtags.get(platform, (1, 5))
        hashtag_count = features["hashtag_count"]
        
        if optimal_hashtags[0] <= hashtag_count <= optimal_hashtags[1]:
            score += 10
        elif hashtag_count > optimal_hashtags[1]:
            score += 5  # Too many hashtags
        
        # Emoji scoring
        if features["emoji_count"] > 0:
            if platform in ["instagram", "twitter", "facebook"]:
                score += min(10, features["emoji_count"] * 2)
            elif platform == "linkedin":
                score += min(5, features["emoji_count"])
        
        # Timing scoring
        if features["is_peak_hour"]:
            score += 10
        
        # Cultural relevance
        score += min(15, features["cultural_score"] * 3)
        
        # Engagement boost for questions
        score += min(5, features["question_count"] * 2)
        
        # Normalize score
        final_score = min(100, max(0, int(score)))
        
        # Calculate confidence based on feature completeness
        confidence = 0.7 + (0.05 * min(6, features["cultural_score"]))
        
        return {
            "score": final_score,
            "confidence": round(confidence, 2),
            "content_quality_score": final_score,
            "cultural_relevance_score": min(100, 60 + features["cultural_score"] * 8),
            "best_posting_time": self._get_best_time_for_platform(platform),
            "model_version": "local-heuristic-v1",
            "features": features,
            "recommendations": self._generate_recommendations(features, platform),
            "predicted_reach": self._estimate_reach(final_score, platform),
            "predicted_likes": self._estimate_likes(final_score, platform),
            "optimal_posting_times": self._get_optimal_times(platform),
        }
    
    def _generate_recommendations(
        self,
        features: Dict[str, Any],
        platform: str
    ) -> List[str]:
        """Generate improvement recommendations"""
        recommendations = []
        
        # Content length recommendations
        platform_optimal_lengths = {
            "instagram": (150, 1000),
            "twitter": (100, 250),
            "linkedin": (200, 1500),
            "facebook": (80, 500),
            "amazon": (150, 1500),
        }
        
        optimal = platform_optimal_lengths.get(platform, (100, 500))
        
        if features["content_length"] < optimal[0]:
            recommendations.append(f"Add more detail - optimal length for {platform} is {optimal[0]}-{optimal[1]} characters")
        elif features["content_length"] > optimal[1]:
            recommendations.append(f"Consider shortening content - optimal is under {optimal[1]} characters for {platform}")
        
        # Hashtag recommendations
        if platform != "amazon":
            if features["hashtag_count"] == 0:
                recommendations.append("Add relevant hashtags to increase discoverability")
            elif features["hashtag_count"] > 10 and platform != "instagram":
                recommendations.append("Consider reducing hashtags for this platform")
        
        # Emoji recommendations
        if features["emoji_count"] == 0 and platform in ["instagram", "twitter", "facebook"]:
            recommendations.append("Add emojis to increase visual appeal and engagement")
        
        # Timing recommendations
        if not features["is_peak_hour"]:
            recommendations.append("Consider posting during peak hours (9 AM, 12 PM, 5-9 PM IST)")
        
        # Cultural relevance
        if features["cultural_score"] == 0:
            recommendations.append("Add Indian cultural references to resonate better with local audience")
        
        # Engagement boosters
        if features["question_count"] == 0:
            recommendations.append("Ask a question to encourage engagement")
        
        return recommendations[:5]  # Return top 5 recommendations
    
    def _estimate_reach(self, engagement_score: float, platform: str) -> Dict[str, int]:
        """Estimate reach based on engagement score"""
        base_reach = {
            "instagram": 500,
            "twitter": 300,
            "linkedin": 400,
            "facebook": 600,
            "amazon": 200,
        }
        
        multiplier = engagement_score / 50  # Score of 100 = 2x base reach
        base = base_reach.get(platform, 400)
        
        return {
            "min": int(base * multiplier * 0.7),
            "max": int(base * multiplier * 1.5),
            "average": int(base * multiplier),
        }
    
    def _estimate_likes(self, engagement_score: float, platform: str) -> Dict[str, int]:
        """Estimate likes based on engagement score"""
        base_likes = {
            "instagram": 50,
            "twitter": 20,
            "linkedin": 30,
            "facebook": 40,
            "amazon": 5,
        }
        
        multiplier = engagement_score / 50
        base = base_likes.get(platform, 30)
        
        return {
            "min": int(base * multiplier * 0.5),
            "max": int(base * multiplier * 2),
            "average": int(base * multiplier),
        }
    
    def _get_optimal_times(self, platform: str) -> List[str]:
        """Get optimal posting times for platform"""
        optimal_times = {
            "instagram": ["09:00 IST", "12:00 IST", "17:00 IST", "19:00 IST", "21:00 IST"],
            "twitter": ["08:00 IST", "12:00 IST", "17:00 IST", "21:00 IST"],
            "linkedin": ["07:00 IST", "08:00 IST", "12:00 IST", "17:00 IST"],
            "facebook": ["09:00 IST", "13:00 IST", "16:00 IST", "19:00 IST"],
            "amazon": ["10:00 IST", "14:00 IST", "20:00 IST"],
        }
        return optimal_times.get(platform, ["09:00 IST", "17:00 IST", "20:00 IST"])
    
    def _get_best_time_for_platform(self, platform: str) -> str:
        """Get single best posting time"""
        best_times = {
            "instagram": "19:00 IST",
            "twitter": "12:00 IST",
            "linkedin": "08:00 IST",
            "facebook": "13:00 IST",
            "amazon": "20:00 IST",
        }
        return best_times.get(platform, "17:00 IST")
    
    async def batch_predict(
        self,
        contents: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Batch prediction for multiple content items
        
        Args:
            contents: List of content dictionaries with keys:
                - content: str
                - platform: str
                - hashtags: List[str]
                
        Returns:
            List of prediction results
        """
        results = []
        
        for item in contents:
            prediction = await self.predict_engagement(
                content=item.get("content", ""),
                platform=item.get("platform", "instagram"),
                hashtags=item.get("hashtags", []),
            )
            results.append(prediction)
        
        return results


# Global service instance
sagemaker_service = SageMakerService()
