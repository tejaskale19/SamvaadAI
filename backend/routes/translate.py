"""
Translation Route for SAMVAAD AI
POST /translate - Translate content using AWS Translate
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List
import logging

from models.content_model import TranslationRequest, TranslationResponse
from services.translate_service import translate_service
from services.redis_service import redis_service
from config import SUPPORTED_LANGUAGES
from routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/translate", tags=["Translation"])


@router.post("", response_model=TranslationResponse)
async def translate_content(
    request: TranslationRequest,
    user: dict = Depends(get_current_user)
):
    """
    Translate content to Indian regional languages
    
    Supported languages:
    - Hindi (hi)
    - Marathi (mr)
    - Tamil (ta)
    - Telugu (te)
    - Bengali (bn)
    - Gujarati (gu)
    - Kannada (kn)
    - Malayalam (ml)
    - Punjabi (pa)
    
    Features:
    - Preserves emojis during translation
    - Preserves hashtags
    - Maintains text formatting
    - Caches translations for efficiency
    """
    try:
        # Check cache first
        cached = await redis_service.get_cached_translation(
            request.content,
            request.source_language,
            request.target_language
        )
        
        if cached:
            logger.info(f"Cache hit for translation")
            return TranslationResponse(**cached)
        
        # Perform translation
        result = await translate_service.translate(
            text=request.content,
            source_language=request.source_language,
            target_language=request.target_language,
            preserve_emojis=request.preserve_emojis,
            preserve_hashtags=request.preserve_hashtags,
            preserve_formatting=request.preserve_formatting,
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "Translation failed")
            )
        
        response = TranslationResponse(
            original_content=result["original_content"],
            translated_content=result["translated_content"],
            source_language=result["source_language"],
            target_language=result["target_language"],
            confidence_score=result.get("confidence_score", 0.9),
            preserved_elements=result.get("preserved_elements", {}),
        )
        
        # Cache the translation
        await redis_service.cache_translation(
            request.content,
            request.source_language,
            request.target_language,
            response.dict()
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Translation error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Translation failed: {str(e)}"
        )


@router.post("/batch")
async def translate_batch(
    texts: List[str],
    target_language: str,
    source_language: str = "en",
    user: dict = Depends(get_current_user)
):
    """
    Translate multiple texts in batch
    
    Args:
        texts: List of texts to translate
        target_language: Target language code
        source_language: Source language code (default: en)
    
    Returns:
        List of translation results
    """
    if len(texts) > 50:
        raise HTTPException(
            status_code=400,
            detail="Maximum 50 texts allowed per batch"
        )
    
    if target_language not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language: {target_language}"
        )
    
    try:
        results = await translate_service.translate_batch(
            texts=texts,
            source_language=source_language,
            target_language=target_language
        )
        
        return {
            "results": results,
            "total": len(results),
            "successful": sum(1 for r in results if r.get("success")),
        }
        
    except Exception as e:
        logger.error(f"Batch translation error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Batch translation failed: {str(e)}"
        )


@router.get("/languages")
async def get_supported_languages():
    """Get list of supported languages for translation"""
    return {
        "languages": SUPPORTED_LANGUAGES,
        "default_source": "en",
        "indian_languages": {
            code: name for code, name in SUPPORTED_LANGUAGES.items()
            if code != "en"
        }
    }
