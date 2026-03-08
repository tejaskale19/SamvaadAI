"""
Content Publishing Route for SAMVAAD AI
POST /publish - Publish approved content to social media platforms
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum
import logging

from services.dynamodb_service import dynamodb_service
from services.s3_service import s3_service
from services.cloudwatch_service import cloudwatch_service
from routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/publish", tags=["Content Publishing"])


class Platform(str, Enum):
    """Supported publishing platforms"""
    INSTAGRAM = "instagram"
    TWITTER = "twitter"
    LINKEDIN = "linkedin"
    FACEBOOK = "facebook"
    AMAZON = "amazon"


class PublishStatus(str, Enum):
    """Publishing status"""
    PENDING = "pending"
    PUBLISHING = "publishing"
    PUBLISHED = "published"
    FAILED = "failed"
    SCHEDULED = "scheduled"


class PublishRequest(BaseModel):
    """Request model for publishing content"""
    content_id: str = Field(..., description="ID of the content to publish")
    variant_id: str = Field(..., description="ID of the variant to publish")
    platform: Platform = Field(..., description="Target platform")
    schedule_time: Optional[datetime] = Field(None, description="Schedule for future publishing")
    
    # Platform-specific options
    instagram_options: Optional[dict] = Field(None, description="Instagram-specific options")
    twitter_options: Optional[dict] = Field(None, description="Twitter-specific options")
    linkedin_options: Optional[dict] = Field(None, description="LinkedIn-specific options")
    facebook_options: Optional[dict] = Field(None, description="Facebook-specific options")


class PublishResponse(BaseModel):
    """Response model for publishing"""
    success: bool
    publish_id: str
    content_id: str
    platform: str
    status: PublishStatus
    published_at: Optional[datetime] = None
    scheduled_at: Optional[datetime] = None
    platform_post_id: Optional[str] = None
    platform_url: Optional[str] = None
    message: str


class BulkPublishRequest(BaseModel):
    """Request model for bulk publishing"""
    content_id: str
    variant_id: str
    platforms: List[Platform]
    schedule_time: Optional[datetime] = None


class BulkPublishResponse(BaseModel):
    """Response model for bulk publishing"""
    success: bool
    results: List[PublishResponse]
    total_platforms: int
    successful: int
    failed: int


@router.post("", response_model=PublishResponse)
async def publish_content(
    request: PublishRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """
    Publish content to a social media platform
    
    This endpoint handles:
    - Immediate publishing
    - Scheduled publishing
    - Platform-specific formatting
    - Publishing history tracking
    
    Note: Actual platform API integration requires platform credentials.
    This endpoint prepares content and tracks publishing status.
    """
    user_id = user.get("user_id", "demo_user")
    
    try:
        # Get content from database
        content = await dynamodb_service.get_content(request.content_id)
        
        if not content:
            raise HTTPException(
                status_code=404,
                detail=f"Content not found: {request.content_id}"
            )
        
        # Verify ownership
        if content.get("user_id") != user_id and user_id != "demo_user":
            raise HTTPException(
                status_code=403,
                detail="Not authorized to publish this content"
            )
        
        # Check if content is approved
        if content.get("status") not in ["approved", "scheduled"]:
            raise HTTPException(
                status_code=400,
                detail="Content must be approved before publishing"
            )
        
        # Get the specific variant
        variants = content.get("variants", [])
        selected_variant = next(
            (v for v in variants if v.get("variant_id") == request.variant_id),
            None
        )
        
        if not selected_variant:
            raise HTTPException(
                status_code=404,
                detail=f"Variant not found: {request.variant_id}"
            )
        
        # Create publish record
        import uuid
        publish_id = f"pub_{uuid.uuid4().hex[:12]}"
        timestamp = datetime.utcnow()
        
        publish_record = {
            "publish_id": publish_id,
            "content_id": request.content_id,
            "variant_id": request.variant_id,
            "user_id": user_id,
            "platform": request.platform.value,
            "content": selected_variant.get("content"),
            "hashtags": selected_variant.get("hashtags", []),
            "created_at": timestamp.isoformat(),
        }
        
        if request.schedule_time:
            # Scheduled publishing
            publish_record["status"] = PublishStatus.SCHEDULED.value
            publish_record["scheduled_at"] = request.schedule_time.isoformat()
            
            # Save to scheduled posts
            await dynamodb_service.create_scheduled_post({
                **publish_record,
                "execution_time": request.schedule_time.isoformat(),
            })
            
            message = f"Content scheduled for {request.schedule_time.isoformat()}"
            
            return PublishResponse(
                success=True,
                publish_id=publish_id,
                content_id=request.content_id,
                platform=request.platform.value,
                status=PublishStatus.SCHEDULED,
                scheduled_at=request.schedule_time,
                message=message,
            )
        else:
            # Immediate publishing
            publish_record["status"] = PublishStatus.PUBLISHING.value
            
            # Add to background for actual publishing
            background_tasks.add_task(
                _execute_publish,
                publish_record,
                request.platform,
                _get_platform_options(request)
            )
            
            # Save to publishing history
            await dynamodb_service.save_publishing_history(publish_record)
            
            # Log to CloudWatch
            await cloudwatch_service.log_event(
                stream="api",
                message=f"Content publishing initiated",
                level="INFO",
                metadata={
                    "publish_id": publish_id,
                    "platform": request.platform.value,
                    "user_id": user_id,
                }
            )
            
            return PublishResponse(
                success=True,
                publish_id=publish_id,
                content_id=request.content_id,
                platform=request.platform.value,
                status=PublishStatus.PUBLISHING,
                message="Publishing initiated. Check status for updates.",
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Publish error: {e}")
        
        await cloudwatch_service.log_error(
            error_type="PublishError",
            error_message=str(e),
            user_id=user_id,
            endpoint="/publish"
        )
        
        raise HTTPException(
            status_code=500,
            detail=f"Publishing failed: {str(e)}"
        )


@router.post("/bulk", response_model=BulkPublishResponse)
async def bulk_publish_content(
    request: BulkPublishRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """
    Publish content to multiple platforms at once
    
    Useful for cross-platform publishing where the same content
    needs to be distributed across multiple social media platforms.
    """
    user_id = user.get("user_id", "demo_user")
    results = []
    
    for platform in request.platforms:
        try:
            publish_request = PublishRequest(
                content_id=request.content_id,
                variant_id=request.variant_id,
                platform=platform,
                schedule_time=request.schedule_time,
            )
            
            result = await publish_content(
                request=publish_request,
                background_tasks=background_tasks,
                user=user
            )
            results.append(result)
            
        except HTTPException as e:
            results.append(PublishResponse(
                success=False,
                publish_id="",
                content_id=request.content_id,
                platform=platform.value,
                status=PublishStatus.FAILED,
                message=str(e.detail),
            ))
        except Exception as e:
            results.append(PublishResponse(
                success=False,
                publish_id="",
                content_id=request.content_id,
                platform=platform.value,
                status=PublishStatus.FAILED,
                message=str(e),
            ))
    
    successful = sum(1 for r in results if r.success)
    failed = len(results) - successful
    
    return BulkPublishResponse(
        success=failed == 0,
        results=results,
        total_platforms=len(request.platforms),
        successful=successful,
        failed=failed,
    )


@router.get("/status/{publish_id}")
async def get_publish_status(
    publish_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Get the status of a publish request
    """
    user_id = user.get("user_id", "demo_user")
    
    try:
        # Get from publishing history
        history = await dynamodb_service.get_publishing_history_by_id(publish_id)
        
        if not history:
            raise HTTPException(
                status_code=404,
                detail=f"Publish record not found: {publish_id}"
            )
        
        # Verify ownership
        if history.get("user_id") != user_id and user_id != "demo_user":
            raise HTTPException(
                status_code=403,
                detail="Not authorized to view this publish status"
            )
        
        return {
            "publish_id": publish_id,
            "content_id": history.get("content_id"),
            "platform": history.get("platform"),
            "status": history.get("status"),
            "created_at": history.get("created_at"),
            "published_at": history.get("published_at"),
            "scheduled_at": history.get("scheduled_at"),
            "platform_post_id": history.get("platform_post_id"),
            "platform_url": history.get("platform_url"),
            "error": history.get("error"),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get publish status error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get publish status: {str(e)}"
        )


@router.delete("/{publish_id}")
async def cancel_scheduled_publish(
    publish_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Cancel a scheduled publish
    
    Only works for content that has not yet been published.
    """
    user_id = user.get("user_id", "demo_user")
    
    try:
        history = await dynamodb_service.get_publishing_history_by_id(publish_id)
        
        if not history:
            raise HTTPException(
                status_code=404,
                detail=f"Publish record not found: {publish_id}"
            )
        
        if history.get("user_id") != user_id and user_id != "demo_user":
            raise HTTPException(
                status_code=403,
                detail="Not authorized to cancel this publish"
            )
        
        if history.get("status") not in ["scheduled", "pending"]:
            raise HTTPException(
                status_code=400,
                detail="Can only cancel scheduled or pending publishes"
            )
        
        # Update status to cancelled
        await dynamodb_service.update_publishing_history(
            publish_id,
            {
                "status": "cancelled",
                "cancelled_at": datetime.utcnow().isoformat(),
                "cancelled_by": user_id,
            }
        )
        
        return {
            "success": True,
            "message": f"Scheduled publish {publish_id} has been cancelled",
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cancel publish error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to cancel publish: {str(e)}"
        )


async def _execute_publish(
    publish_record: dict,
    platform: Platform,
    options: dict
) -> None:
    """
    Background task to execute actual publishing
    
    This is where platform API integration would happen.
    Currently simulates publishing and updates status.
    """
    import asyncio
    import uuid
    
    publish_id = publish_record.get("publish_id")
    
    try:
        # Simulate API call delay
        await asyncio.sleep(2)
        
        # In production, this would call the actual platform APIs:
        # - Instagram Graph API
        # - Twitter API v2
        # - LinkedIn Marketing API
        # - Facebook Graph API
        # - Amazon SP-API for product content
        
        # Simulate successful publish
        platform_post_id = f"{platform.value}_{uuid.uuid4().hex[:10]}"
        
        # Update publishing history
        await dynamodb_service.update_publishing_history(
            publish_id,
            {
                "status": PublishStatus.PUBLISHED.value,
                "published_at": datetime.utcnow().isoformat(),
                "platform_post_id": platform_post_id,
                "platform_url": _generate_platform_url(platform, platform_post_id),
            }
        )
        
        # Log success
        await cloudwatch_service.log_event(
            stream="api",
            message=f"Content published successfully",
            level="INFO",
            metadata={
                "publish_id": publish_id,
                "platform": platform.value,
                "platform_post_id": platform_post_id,
            }
        )
        
        # Store output in S3
        await s3_service.upload_json(
            data={
                **publish_record,
                "status": "published",
                "platform_post_id": platform_post_id,
            },
            filename=f"{publish_id}.json",
            prefix="generated-outputs/published/"
        )
        
    except Exception as e:
        logger.error(f"Publishing execution failed: {e}")
        
        await dynamodb_service.update_publishing_history(
            publish_id,
            {
                "status": PublishStatus.FAILED.value,
                "error": str(e),
                "failed_at": datetime.utcnow().isoformat(),
            }
        )
        
        await cloudwatch_service.log_error(
            error_type="PublishExecutionError",
            error_message=str(e),
            endpoint="/publish",
        )


def _get_platform_options(request: PublishRequest) -> dict:
    """Extract platform-specific options from request"""
    options = {}
    
    if request.platform == Platform.INSTAGRAM and request.instagram_options:
        options = request.instagram_options
    elif request.platform == Platform.TWITTER and request.twitter_options:
        options = request.twitter_options
    elif request.platform == Platform.LINKEDIN and request.linkedin_options:
        options = request.linkedin_options
    elif request.platform == Platform.FACEBOOK and request.facebook_options:
        options = request.facebook_options
    
    return options


def _generate_platform_url(platform: Platform, post_id: str) -> str:
    """Generate a mock platform URL for the published content"""
    urls = {
        Platform.INSTAGRAM: f"https://instagram.com/p/{post_id}",
        Platform.TWITTER: f"https://twitter.com/i/status/{post_id}",
        Platform.LINKEDIN: f"https://linkedin.com/feed/update/{post_id}",
        Platform.FACEBOOK: f"https://facebook.com/posts/{post_id}",
        Platform.AMAZON: f"https://amazon.in/dp/{post_id}",
    }
    return urls.get(platform, f"https://platform.com/{post_id}")
