"""
SAMVAAD AI - FastAPI Backend Application
AI-powered social media content generation platform for Indian audience
"""

import logging
import asyncio
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn

from config import get_settings
from utils.logging_config import configure_logging
from routes import (
    generate_router,
    translate_router,
    predict_router,
    approve_router,
    history_router,
    auth_router,
    analytics_router,
    trends_router,
    publish_router,
)
from services.redis_service import redis_service
from services.dynamodb_service import dynamodb_service

# Load settings
settings = get_settings()

# Configure structured JSON logging (CloudWatch-compatible)
configure_logging(service="samvaad-ai", environment=settings.ENVIRONMENT)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager
    
    Handles startup and shutdown events
    """
    # Startup
    logger.info("Starting SAMVAAD AI Backend...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"AWS Region: {settings.AWS_REGION}")
    
    # Initialize services
    try:
        # Check Redis connection
        await redis_service.set("health_check", "ok", ttl=10)
        logger.info("Redis connection OK")
    except Exception as e:
        logger.warning(f"Redis not available: {e}")
    
    try:
        # Check DynamoDB connection (will use demo mode if unavailable)
        logger.info("DynamoDB service initialized")
    except Exception as e:
        logger.warning(f"DynamoDB initialization warning: {e}")
    
    logger.info("SAMVAAD AI Backend started successfully!")
    
    yield
    
    # Shutdown
    logger.info("Shutting down SAMVAAD AI Backend...")


# Create FastAPI application
app = FastAPI(
    title="SAMVAAD AI",
    description="""
    🚀 AI-powered social media content generation platform for Indian audience
    
    ## Features
    
    - **Content Generation**: Generate engaging social media content using AWS Bedrock (Llama 3)
    - **Multi-language Translation**: Translate content to 10 Indian languages using AWS Translate
    - **Engagement Prediction**: Predict content engagement with AI-powered analysis
    - **Platform Optimization**: Optimize content for Instagram, Twitter, LinkedIn, Facebook, Amazon
    - **Cultural Context**: Indian festival, event, and cultural awareness
    - **Content Approval**: Workflow for content review and scheduling
    
    ## Supported Languages
    
    English, Hindi, Marathi, Tamil, Telugu, Bengali, Gujarati, Kannada, Malayalam, Punjabi
    
    ## Platforms
    
    Instagram, Twitter, LinkedIn, Facebook, Amazon (Product listings)
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        settings.FRONTEND_URL,
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle unhandled exceptions"""
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc) if settings.ENVIRONMENT == "development" else "An error occurred",
        }
    )


# Include routers
app.include_router(auth_router, prefix="/api")
app.include_router(generate_router, prefix="/api")
app.include_router(translate_router, prefix="/api")
app.include_router(predict_router, prefix="/api")
app.include_router(approve_router, prefix="/api")
app.include_router(history_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(trends_router, prefix="/api")
app.include_router(publish_router, prefix="/api")


# Health check endpoints
@app.get("/", tags=["Health"])
async def root():
    """Root endpoint - API info"""
    return {
        "name": "SAMVAAD AI",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check"""
    health_status = {
        "status": "healthy",
        "services": {}
    }
    
    # Check Redis
    try:
        await redis_service.set("health", "ok", ttl=5)
        result = await redis_service.get("health")
        health_status["services"]["redis"] = "connected" if result else "degraded"
    except Exception as e:
        health_status["services"]["redis"] = "unavailable"
    
    # Check DynamoDB
    try:
        # Lightweight connectivity probe — list tables with limit 1
        _client = dynamodb_service.client
        await asyncio.to_thread(lambda: _client.list_tables(Limit=1))
        health_status["services"]["dynamodb"] = "connected"
    except Exception as e:
        health_status["services"]["dynamodb"] = "unavailable"
        logger.warning("DynamoDB health check failed", extra={"error": str(e)})
    
    # Overall status
    if all(s == "connected" for s in health_status["services"].values()):
        health_status["status"] = "healthy"
    elif "unavailable" in health_status["services"].values():
        health_status["status"] = "degraded"
    
    return health_status


@app.get("/api/status", tags=["Health"])
async def api_status():
    """API status with feature flags"""
    return {
        "api_version": "1.0.0",
        "features": {
            "content_generation": True,
            "translation": True,
            "engagement_prediction": True,
            "trends": True,
            "scheduling": True,
            "workflow": True,
        },
        "supported_platforms": ["instagram", "twitter", "linkedin", "facebook", "amazon"],
        "supported_languages": [
            "en", "hi", "mr", "ta", "te", "bn", "gu", "kn", "ml", "pa"
        ],
        "environment": settings.ENVIRONMENT,
    }


# Run the application
if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.ENVIRONMENT == "development",
    )
