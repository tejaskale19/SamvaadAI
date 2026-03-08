"""
History Route for SAMVAAD AI
GET /history - Retrieve content history and analytics
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timedelta
from typing import Optional, List
import logging

from models.content_model import HistoryResponse, HistoryItem, Platform, ContentStatus
from services.dynamodb_service import dynamodb_service
from routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/history", tags=["Content History"])


@router.get("", response_model=HistoryResponse)
async def get_content_history(
    platform: Optional[str] = Query(None, description="Filter by platform"),
    status: Optional[str] = Query(None, description="Filter by status"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    limit: int = Query(50, ge=1, le=100, description="Number of items to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    user: dict = Depends(get_current_user)
):
    """
    Get user's content history
    
    Filters:
    - platform: instagram, twitter, linkedin, facebook, amazon
    - status: draft, pending, approved, rejected, published
    - start_date/end_date: Date range filter
    
    Returns paginated list of content with engagement metrics
    """
    user_id = user.get("user_id", "demo_user")
    
    try:
        result = await dynamodb_service.get_user_content(
            user_id=user_id,
            status=status,
            platform=platform,
            limit=limit,
            offset=offset
        )
        
        items = []
        for item in result.get("items", []):
            # Get selected variant content
            selected_content = None
            engagement_score = None
            
            variants = item.get("variants", [])
            selected_id = item.get("selected_variant_id")
            
            if selected_id:
                for v in variants:
                    if v.get("variant_id") == selected_id:
                        selected_content = v.get("content", "")[:200]
                        engagement_score = v.get("engagement_score")
                        break
            elif variants:
                selected_content = variants[0].get("content", "")[:200]
                engagement_score = variants[0].get("engagement_score")
            
            history_item = HistoryItem(
                content_id=item.get("content_id", ""),
                prompt=item.get("prompt", ""),
                platform=Platform(item.get("platform", "instagram")),
                status=ContentStatus(item.get("status", "draft")),
                selected_content=selected_content,
                engagement_score=engagement_score,
                created_at=datetime.fromisoformat(item.get("created_at", datetime.utcnow().isoformat())),
                published_at=datetime.fromisoformat(item["published_at"]) if item.get("published_at") else None,
                metrics=item.get("metrics"),
            )
            items.append(history_item)
        
        return HistoryResponse(
            items=items,
            total=result.get("total", len(items)),
            limit=limit,
            offset=offset,
            has_more=result.get("has_more", False),
        )
        
    except Exception as e:
        logger.error(f"History fetch error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch history: {str(e)}"
        )


@router.get("/{content_id}")
async def get_content_detail(
    content_id: str,
    user: dict = Depends(get_current_user)
):
    """Get detailed view of a specific content item"""
    user_id = user.get("user_id", "demo_user")
    
    content = await dynamodb_service.get_content(content_id)
    
    if not content:
        raise HTTPException(
            status_code=404,
            detail="Content not found"
        )
    
    # Verify ownership (allow demo_user access for testing)
    if content.get("user_id") != user_id and user_id != "demo_user":
        raise HTTPException(
            status_code=403,
            detail="Not authorized to view this content"
        )
    
    return content


@router.delete("/{content_id}")
async def delete_content(
    content_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete a content item (only drafts and rejected)"""
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
            detail="Not authorized to delete this content"
        )
    
    if content.get("status") in ["published", "scheduled"]:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete published or scheduled content"
        )
    
    # Update status to deleted (soft delete)
    result = await dynamodb_service.update_content(
        content_id,
        {"status": "deleted", "deleted_at": datetime.utcnow().isoformat()}
    )
    
    return {"success": True, "message": "Content deleted"}


@router.get("/stats/summary")
async def get_history_summary(
    days: int = Query(30, ge=1, le=365, description="Number of days for summary"),
    user: dict = Depends(get_current_user)
):
    """Get summary statistics for user's content history"""
    user_id = user.get("user_id", "demo_user")
    
    try:
        # Get all content for user
        result = await dynamodb_service.get_user_content(
            user_id=user_id,
            limit=1000
        )
        
        items = result.get("items", [])
        
        # Calculate statistics
        status_counts = {}
        platform_counts = {}
        total_engagement = 0
        engagement_count = 0
        
        for item in items:
            status = item.get("status", "unknown")
            platform = item.get("platform", "unknown")
            
            status_counts[status] = status_counts.get(status, 0) + 1
            platform_counts[platform] = platform_counts.get(platform, 0) + 1
            
            # Get engagement from first variant
            variants = item.get("variants", [])
            if variants and variants[0].get("engagement_score"):
                total_engagement += variants[0]["engagement_score"]
                engagement_count += 1
        
        avg_engagement = total_engagement / engagement_count if engagement_count > 0 else 0
        
        return {
            "total_content": len(items),
            "status_breakdown": status_counts,
            "platform_breakdown": platform_counts,
            "avg_engagement_score": round(avg_engagement, 1),
            "period_days": days,
        }
        
    except Exception as e:
        logger.error(f"History summary error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get summary: {str(e)}"
        )


@router.get("/publishing")
async def get_publishing_history(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    user: dict = Depends(get_current_user)
):
    """Get publishing history with metrics"""
    user_id = user.get("user_id", "demo_user")
    
    try:
        history = await dynamodb_service.get_publishing_history(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )
        
        return {
            "items": history,
            "total": len(history),
        }
        
    except Exception as e:
        logger.error(f"Publishing history error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get publishing history: {str(e)}"
        )


@router.get("/scheduled")
async def get_scheduled_posts(
    user: dict = Depends(get_current_user)
):
    """Get all scheduled posts"""
    user_id = user.get("user_id", "demo_user")
    
    try:
        scheduled = await dynamodb_service.get_scheduled_posts(user_id)
        
        return {
            "items": scheduled,
            "total": len(scheduled),
        }
        
    except Exception as e:
        logger.error(f"Scheduled posts error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get scheduled posts: {str(e)}"
        )
