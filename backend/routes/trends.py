"""
Trends Route for SAMVAAD AI
GET /trends - Retrieve trending topics and hashtags
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
import logging

from services.trend_service import trend_service
from services.redis_service import redis_service
from routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/trends", tags=["Trends"])


@router.get("/topics")
async def get_trending_topics(
    category: Optional[str] = Query(None, description="Category: general, festivals, business, lifestyle"),
    limit: int = Query(10, ge=1, le=50),
    user: dict = Depends(get_current_user)
):
    """
    Get trending topics in India
    
    Categories:
    - general: General trending topics
    - festivals: Festival and event-related topics
    - business: Business and startup topics
    - lifestyle: Lifestyle and wellness topics
    """
    # Check cache
    cached = await redis_service.get_cached_trends("topics", category)
    if cached:
        return cached
    
    result = await trend_service.get_trending_topics(
        category=category,
        limit=limit
    )
    
    # Cache for 30 minutes
    await redis_service.cache_trends("topics", category, result, ttl=1800)
    
    return result


@router.get("/hashtags")
async def get_trending_hashtags(
    platform: str = Query("instagram", description="Platform: instagram, twitter, linkedin, facebook"),
    limit: int = Query(10, ge=1, le=30),
    user: dict = Depends(get_current_user)
):
    """
    Get trending hashtags for a platform
    
    Returns hashtags with post count and growth percentage
    """
    # Check cache
    cached = await redis_service.get_cached_trends("hashtags", platform)
    if cached:
        return cached
    
    result = await trend_service.get_trending_hashtags(
        platform=platform,
        limit=limit
    )
    
    # Cache for 30 minutes
    await redis_service.cache_trends("hashtags", platform, result, ttl=1800)
    
    return result


@router.get("/events")
async def get_upcoming_events(
    event_type: Optional[str] = Query(None, description="Type: festival, national, lifestyle"),
    days_ahead: int = Query(30, ge=1, le=90),
    user: dict = Depends(get_current_user)
):
    """
    Get upcoming events and occasions
    
    Useful for planning festival and occasion-based content
    """
    result = await trend_service.get_upcoming_events(
        event_type=event_type,
        days_ahead=days_ahead
    )
    
    return result


@router.get("/recommendations")
async def get_content_recommendations(
    platform: str = Query("instagram"),
    industry: Optional[str] = Query(None, description="Your industry sector"),
    user: dict = Depends(get_current_user)
):
    """
    Get content recommendations based on trends
    
    Returns:
    - Trending hashtags to use
    - Upcoming occasions to leverage
    - Content ideas based on trends
    - Optimal posting times
    """
    result = await trend_service.get_content_recommendations(
        platform=platform,
        industry=industry
    )
    
    return result


@router.get("/competitor/{handle}")
async def analyze_competitor(
    handle: str,
    platform: str = Query("instagram"),
    user: dict = Depends(get_current_user)
):
    """
    Analyze competitor's social media performance
    
    Note: This is demo data. Connect social media APIs for real analysis.
    """
    result = await trend_service.analyze_competitor(
        competitor_handle=handle,
        platform=platform
    )
    
    return result
