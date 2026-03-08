"""
Engagement Prediction Route for SAMVAAD AI
POST /predict - Predict engagement metrics for content
"""

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from typing import Optional, List
import logging

from models.content_model import EngagementRequest, EngagementResponse, EngagementFactors
from services.engagement_service import engagement_service
from services.redis_service import redis_service
from services.dynamodb_service import dynamodb_service
from routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/predict", tags=["Engagement Prediction"])


@router.post("", response_model=EngagementResponse)
async def predict_engagement(
    request: EngagementRequest,
    user: dict = Depends(get_current_user)
):
    """
    Predict engagement score for content
    
    Analyzes:
    - Post length and structure
    - Emoji count and relevance
    - Hashtag count and trending status
    - Sentiment analysis
    - Posting time optimization
    - Cultural relevance for Indian audience
    
    Returns:
    - Overall engagement score (0-100)
    - Confidence level
    - Factor breakdown
    - Improvement recommendations
    - Optimal posting times
    """
    user_id = user.get("user_id", "demo_user")
    
    try:
        # Check cache
        content_hash = redis_service.hash_content(request.content)
        cached = await redis_service.get_cached_engagement(
            content_hash,
            request.platform.value
        )
        
        if cached:
            logger.info("Cache hit for engagement prediction")
            return EngagementResponse(**cached)
        
        # Predict engagement
        result = await engagement_service.predict_engagement(
            content=request.content,
            platform=request.platform.value,
            hashtags=request.hashtags,
            posting_time=request.posting_time,
            target_audience=request.target_audience,
        )
        
        response = EngagementResponse(
            score=result["score"],
            confidence=result["confidence"],
            factors=EngagementFactors(**result["factors"]),
            recommendations=result["recommendations"],
            predicted_reach=result.get("predicted_reach"),
            predicted_likes=result.get("predicted_likes"),
            optimal_posting_times=result.get("optimal_posting_times", []),
        )
        
        # Cache the prediction
        await redis_service.cache_engagement_prediction(
            content_hash,
            request.platform.value,
            response.dict()
        )
        
        # Save engagement score to database (for analytics) — non-critical
        try:
            await dynamodb_service.save_engagement_score({
                "content_id": f"predict_{content_hash[:12]}",
                "user_id": user_id,
                "platform": request.platform.value,
                "score": result["score"],
                "confidence": result["confidence"],
                "factors": result["factors"],
                "recommendations": result["recommendations"],
            })
        except Exception as e:
            logger.warning(f"Failed to save engagement analytics: {e}")
        
        return response
        
    except Exception as e:
        logger.error(f"Engagement prediction error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )


@router.post("/batch")
async def predict_batch_engagement(
    contents: List[EngagementRequest],
    user: dict = Depends(get_current_user)
):
    """
    Predict engagement for multiple content items
    
    Useful for comparing variants and selecting the best one
    """
    if len(contents) > 10:
        raise HTTPException(
            status_code=400,
            detail="Maximum 10 content items per batch"
        )
    
    results = []
    for content in contents:
        try:
            result = await engagement_service.predict_engagement(
                content=content.content,
                platform=content.platform.value,
                hashtags=content.hashtags,
                posting_time=content.posting_time,
            )
            results.append({
                "content": content.content[:100] + "..." if len(content.content) > 100 else content.content,
                "score": result["score"],
                "confidence": result["confidence"],
                "recommendations": result["recommendations"][:2],
            })
        except Exception as e:
            results.append({
                "content": content.content[:50] + "...",
                "error": str(e),
            })
    
    # Sort by score
    successful = [r for r in results if "score" in r]
    successful.sort(key=lambda x: x["score"], reverse=True)
    
    return {
        "results": results,
        "best_content": successful[0] if successful else None,
        "total": len(results),
        "successful": len(successful),
    }


@router.get("/optimal-times/{platform}")
async def get_optimal_posting_times(
    platform: str,
    user: dict = Depends(get_current_user)
):
    """
    Get optimal posting times for a platform
    
    Based on Indian audience engagement patterns
    """
    optimal_times = {
        "instagram": {
            "best_times": ["7:00 PM", "8:00 PM", "9:00 PM", "12:00 PM"],
            "best_days": ["Tuesday", "Wednesday", "Thursday"],
            "avoid": ["2:00 AM - 5:00 AM"],
            "timezone": "IST",
        },
        "twitter": {
            "best_times": ["8:00 AM", "12:00 PM", "5:00 PM", "9:00 PM"],
            "best_days": ["Monday", "Tuesday", "Wednesday"],
            "avoid": ["1:00 AM - 6:00 AM"],
            "timezone": "IST",
        },
        "linkedin": {
            "best_times": ["7:00 AM", "8:00 AM", "12:00 PM", "5:00 PM"],
            "best_days": ["Tuesday", "Wednesday", "Thursday"],
            "avoid": ["Weekends", "Late nights"],
            "timezone": "IST",
        },
        "facebook": {
            "best_times": ["1:00 PM", "4:00 PM", "8:00 PM", "9:00 PM"],
            "best_days": ["Thursday", "Friday", "Saturday"],
            "avoid": ["3:00 AM - 7:00 AM"],
            "timezone": "IST",
        },
        "amazon": {
            "best_times": ["10:00 AM", "2:00 PM", "8:00 PM", "9:00 PM"],
            "best_days": ["Friday", "Saturday", "Sunday"],
            "avoid": ["Late nights"],
            "timezone": "IST",
            "note": "Peak shopping hours for product listings",
        },
    }
    
    if platform not in optimal_times:
        raise HTTPException(
            status_code=404,
            detail=f"Platform not found: {platform}"
        )
    
    return optimal_times[platform]


@router.get("/factors")
async def get_engagement_factors():
    """Get explanation of engagement scoring factors"""
    return {
        "factors": {
            "timing": {
                "weight": 0.20,
                "description": "How well the posting time aligns with audience activity",
                "tips": [
                    "Post during peak hours for your platform",
                    "Consider your audience's timezone (IST)",
                    "Avoid posting late at night",
                ],
            },
            "hashtags": {
                "weight": 0.15,
                "description": "Effectiveness and relevance of hashtags",
                "tips": [
                    "Use platform-optimal number of hashtags",
                    "Include trending hashtags",
                    "Mix broad and niche hashtags",
                ],
            },
            "content_quality": {
                "weight": 0.30,
                "description": "Overall quality including length, structure, and emojis",
                "tips": [
                    "Keep content at optimal length for platform",
                    "Use emojis appropriately",
                    "Include clear call-to-action",
                ],
            },
            "cultural_relevance": {
                "weight": 0.20,
                "description": "Relevance to Indian culture, festivals, and audience",
                "tips": [
                    "Reference current festivals and events",
                    "Use culturally relevant themes",
                    "Connect with local traditions",
                ],
            },
            "sentiment": {
                "weight": 0.15,
                "description": "Tone and emotional appeal of content",
                "tips": [
                    "Keep tone positive and engaging",
                    "Use emotional triggers appropriately",
                    "Maintain authenticity",
                ],
            },
        },
        "score_ranges": {
            "excellent": {"min": 85, "max": 100, "label": "Excellent - High viral potential"},
            "good": {"min": 70, "max": 84, "label": "Good - Strong engagement expected"},
            "average": {"min": 55, "max": 69, "label": "Average - Moderate engagement"},
            "needs_improvement": {"min": 0, "max": 54, "label": "Needs Improvement"},
        },
    }
