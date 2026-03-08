"""
Content Generation Route for SAMVAAD AI
POST /generate - Generate AI content using AWS Bedrock
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Optional
import logging
import uuid

from models.content_model import ContentRequest, ContentResponse, ContentVariant
from services.ai_provider_service import ai_provider_service
from services.engagement_service import engagement_service
from services.dynamodb_service import dynamodb_service
from services.redis_service import redis_service
from services.stepfunctions_service import stepfunctions_service
from routes.auth import get_current_user
from middleware.rate_limit import rate_limit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/generate", tags=["Content Generation"])


@router.post(
    "",
    response_model=ContentResponse,
    dependencies=[Depends(rate_limit(requests_per_window=20, window_seconds=60))],
)
async def generate_content(
    request: ContentRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """
    Generate AI content for social media platforms
    
    - Uses AWS Bedrock with Llama 3 for content generation
    - Generates 3 content variants by default
    - Includes hashtags and emojis based on platform
    - Supports cultural context for Indian audience
    - Caches results for similar prompts
    
    Returns generated content variants with engagement predictions
    """
    user_id = user.get("user_id", "demo_user")
    
    try:
        # Check cache first
        cached = await redis_service.get_cached_content(
            request.prompt,
            request.platform.value
        )
        
        if cached:
            logger.info(f"Cache hit for content generation")
            return ContentResponse(**cached)
        
        # Generate content using switchable AI provider (Bedrock → OpenAI → Template)
        result = await ai_provider_service.generate_content(
            prompt=request.prompt,
            platform=request.platform.value,
            language=request.language,
            tone=request.tone,
            cultural_context=request.cultural_context,
            target_audience=request.target_audience,
            include_hashtags=request.include_hashtags,
            include_emojis=request.include_emojis,
            num_variants=request.max_variants,
        )

        logger.info(
            "Content generated",
            extra={"provider": result.get("provider"), "user_id": user_id,
                   "platform": request.platform.value},
        )
        
        if not result.get("success") and not result.get("variants"):
            raise HTTPException(
                status_code=500,
                detail="Failed to generate content"
            )
        
        variants = result.get("variants", [])
        content_id = result.get("content_id") or f"content_{uuid.uuid4().hex[:12]}"
        
        # Predict engagement for each variant
        for variant in variants:
            engagement = await engagement_service.predict_engagement(
                content=variant.get("content", ""),
                platform=request.platform.value,
                hashtags=variant.get("hashtags", []),
            )
            variant["engagement_score"] = engagement.get("score")
        
        # Sort by engagement score
        variants.sort(key=lambda x: x.get("engagement_score", 0), reverse=True)
        
        # Create response
        response_data = {
            "content_id": content_id,
            "prompt": request.prompt,
            "platform": request.platform,
            "variants": [ContentVariant(**v) for v in variants],
            "status": "draft",
            "metadata": {
                "cultural_context": request.cultural_context,
                "target_audience": request.target_audience,
                "language": request.language,
            }
        }
        
        # Save to database BEFORE returning so /approve can find it
        await save_content_to_db(user_id, response_data)
        
        # Cache in background (non-critical)
        background_tasks.add_task(
            cache_content,
            request.prompt,
            request.platform.value,
            response_data
        )
        
        return ContentResponse(**response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Content generation error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Content generation failed: {str(e)}"
        )


@router.post("/workflow")
async def start_generation_workflow(
    request: ContentRequest,
    user: dict = Depends(get_current_user)
):
    """
    Start a full content generation workflow using Step Functions
    
    This triggers the complete pipeline:
    1. Content generation
    2. Platform optimization
    3. Translation (if specified)
    4. Engagement prediction
    5. Save for approval
    
    Returns workflow execution details
    """
    user_id = user.get("user_id", "demo_user")
    
    options = {
        "cultural_context": request.cultural_context,
        "target_audience": request.target_audience,
        "num_variants": request.max_variants,
        "include_hashtags": request.include_hashtags,
        "include_emojis": request.include_emojis,
    }
    
    result = await stepfunctions_service.start_workflow(
        user_id=user_id,
        prompt=request.prompt,
        platform=request.platform.value,
        options=options,
    )
    
    if not result.get("success"):
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Failed to start workflow")
        )
    
    return result


@router.get("/workflow/{workflow_id}/status")
async def get_workflow_status(
    workflow_id: str,
    user: dict = Depends(get_current_user)
):
    """Get status of a content generation workflow"""
    result = await stepfunctions_service.get_execution_status(workflow_id)
    
    if not result.get("success"):
        raise HTTPException(
            status_code=404,
            detail="Workflow not found"
        )
    
    return result


def _serialise_variants(variants) -> list:
    """Convert ContentVariant objects to plain dicts (Pydantic v2-safe)."""
    result = []
    for v in variants:
        if hasattr(v, "model_dump"):
            result.append(v.model_dump())
        elif hasattr(v, "dict"):
            result.append(v.dict())
        else:
            result.append(v)
    return result


def _platform_str(platform) -> str:
    return platform.value if hasattr(platform, "value") else str(platform)


async def save_content_to_db(user_id: str, content_data: dict):
    """Persist generated content in DynamoDB. Raises on failure so the
    generate endpoint does not return an ID that /approve cannot find."""
    content_id = content_data["content_id"]
    record = {
        "content_id": content_id,
        "user_id": user_id,
        "prompt": content_data["prompt"],
        "platform": _platform_str(content_data["platform"]),
        "variants": _serialise_variants(content_data["variants"]),
        "status": "draft",
        "metadata": content_data.get("metadata", {}),
    }
    result = await dynamodb_service.save_content(record)
    if not result.get("success"):
        err = result.get("error", "unknown")
        logger.error(f"Failed to save content {content_id} to DynamoDB: {err}")
        raise RuntimeError(f"DynamoDB save failed for {content_id}: {err}")
    logger.info(f"Saved content {content_id} to DynamoDB")
    print(f"Saved content {content_id} to DynamoDB")


async def cache_content(prompt: str, platform: str, content_data: dict):
    """Background task — caches generated content in Redis."""
    try:
        cache_data = {
            "content_id": content_data["content_id"],
            "prompt": content_data["prompt"],
            "platform": _platform_str(content_data["platform"]),
            "variants": _serialise_variants(content_data["variants"]),
            "status": "draft",
            "metadata": content_data.get("metadata", {}),
        }
        await redis_service.cache_generated_content(prompt, platform, cache_data)
    except Exception as e:
        logger.error("Failed to cache content in Redis", extra={"error": str(e)})
