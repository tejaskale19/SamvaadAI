"""
Analytics Route for SAMVAAD AI
GET /analytics - Retrieve analytics data
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timedelta
from typing import Optional
import logging

from services.dynamodb_service import dynamodb_service
from routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("")
async def get_analytics(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    user: dict = Depends(get_current_user)
):
    """
    Get comprehensive analytics data
    
    Returns:
    - Content statistics by status and platform
    - Average engagement scores
    - Publishing history
    - Performance trends
    """
    user_id = user.get("user_id", "demo_user")
    
    try:
        # Get analytics from DynamoDB
        analytics = await dynamodb_service.get_analytics_data(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date
        )
        
        # Calculate additional metrics
        content_by_status = analytics.get("content_by_status", {})
        content_by_platform = analytics.get("content_by_platform", {})
        
        # Platform performance
        platform_stats = []
        for platform, count in content_by_platform.items():
            platform_scores = [
                s for s in analytics.get("engagement_scores", [])
                if s.get("platform") == platform
            ]
            avg_engagement = (
                sum(s.get("score", 0) for s in platform_scores) / len(platform_scores)
                if platform_scores else 0
            )
            platform_stats.append({
                "platform": platform,
                "posts": count,
                "avg_engagement": round(avg_engagement, 1),
            })
        
        # Daily stats for last 30 days
        daily_stats = []
        history = analytics.get("publishing_history", [])
        
        # Group by date
        date_counts = {}
        for item in history:
            date_str = item.get("published_at", "")[:10]
            if date_str:
                date_counts[date_str] = date_counts.get(date_str, 0) + 1
        
        for i in range(30):
            date = datetime.utcnow() - timedelta(days=29-i)
            date_str = date.strftime("%Y-%m-%d")
            daily_stats.append({
                "date": date_str,
                "posts": date_counts.get(date_str, 0),
            })
        
        # Generate insights
        insights = generate_insights(analytics, platform_stats)
        
        return {
            "summary": {
                "total_content": analytics.get("total_content", 0),
                "content_by_status": content_by_status,
                "avg_engagement": analytics.get("avg_engagement", 0),
                "total_published": len(history),
            },
            "platform_stats": platform_stats,
            "daily_stats": daily_stats,
            "insights": insights,
            "updated_at": datetime.utcnow().isoformat(),
        }
        
    except Exception as e:
        logger.error(f"Analytics error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get analytics: {str(e)}"
        )


@router.get("/engagement")
async def get_engagement_analytics(
    days: int = Query(30, ge=1, le=365),
    user: dict = Depends(get_current_user)
):
    """Get engagement score trends"""
    user_id = user.get("user_id", "demo_user")
    
    try:
        scores = await dynamodb_service.get_user_engagement_scores(
            user_id=user_id,
            limit=100
        )
        
        # Group by date
        daily_engagement = {}
        for score in scores:
            date_str = score.get("created_at", "")[:10]
            if date_str:
                if date_str not in daily_engagement:
                    daily_engagement[date_str] = []
                daily_engagement[date_str].append(score.get("score", 0))
        
        # Calculate daily averages
        engagement_trend = []
        for date_str, scores_list in sorted(daily_engagement.items()):
            avg = sum(scores_list) / len(scores_list) if scores_list else 0
            engagement_trend.append({
                "date": date_str,
                "avg_score": round(avg, 1),
                "count": len(scores_list),
            })
        
        return {
            "trend": engagement_trend[-days:],
            "overall_avg": round(
                sum(s.get("score", 0) for s in scores) / len(scores) if scores else 0,
                1
            ),
            "total_predictions": len(scores),
        }
        
    except Exception as e:
        logger.error(f"Engagement analytics error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get engagement analytics: {str(e)}"
        )


@router.get("/performance/{content_id}")
async def get_content_performance(
    content_id: str,
    user: dict = Depends(get_current_user)
):
    """Get performance metrics for specific content"""
    user_id = user.get("user_id", "demo_user")
    
    content = await dynamodb_service.get_content(content_id)
    
    if not content:
        raise HTTPException(
            status_code=404,
            detail="Content not found"
        )
    
    if content.get("user_id") != user_id and user_id != "demo_user":
        raise HTTPException(
            status_code=403,
            detail="Not authorized"
        )
    
    # Get engagement scores for this content
    engagement_scores = await dynamodb_service.get_user_engagement_scores(user_id)
    content_scores = [
        s for s in engagement_scores
        if s.get("content_id") == content_id
    ]
    
    return {
        "content_id": content_id,
        "status": content.get("status"),
        "platform": content.get("platform"),
        "created_at": content.get("created_at"),
        "engagement_prediction": content_scores[0] if content_scores else None,
        "metrics": content.get("metrics", {}),
    }


def generate_insights(analytics: dict, platform_stats: list) -> list:
    """Generate AI-like insights from analytics data"""
    insights = []
    
    # Best performing platform
    if platform_stats:
        best_platform = max(platform_stats, key=lambda x: x.get("avg_engagement", 0))
        if best_platform.get("avg_engagement", 0) > 0:
            insights.append(
                f"📱 {best_platform['platform'].title()} is your best performing platform "
                f"with {best_platform['avg_engagement']}% average engagement"
            )
    
    # Content status insights
    content_by_status = analytics.get("content_by_status", {})
    approved = content_by_status.get("approved", 0)
    pending = content_by_status.get("pending", 0)
    
    if pending > approved:
        insights.append(
            f"📝 You have {pending} content items pending approval. "
            f"Review them to maintain consistent posting."
        )
    
    # Engagement insight
    avg_engagement = analytics.get("avg_engagement", 0)
    if avg_engagement >= 80:
        insights.append(
            f"🔥 Excellent! Your average engagement score is {avg_engagement}%. "
            f"Keep creating high-quality content!"
        )
    elif avg_engagement >= 60:
        insights.append(
            f"📈 Good job! Your average engagement is {avg_engagement}%. "
            f"Try adding more cultural relevance to boost higher."
        )
    elif avg_engagement > 0:
        insights.append(
            f"💡 Your engagement score is {avg_engagement}%. "
            f"Consider optimizing posting times and hashtags."
        )
    
    # Publishing frequency
    history_count = len(analytics.get("publishing_history", []))
    if history_count == 0:
        insights.append(
            "🚀 Start publishing content to see your performance analytics!"
        )
    
    # Ensure at least one insight
    if not insights:
        insights.append(
            "✨ Generate and publish content to unlock detailed analytics!"
        )
    
    return insights
