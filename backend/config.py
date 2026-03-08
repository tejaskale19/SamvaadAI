"""
Configuration module for SAMVAAD AI Backend
Handles AWS services configuration and environment variables
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # App Settings
    APP_NAME: str = "SAMVAAD AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    API_PREFIX: str = "/api/v1"
    FRONTEND_URL: str = "http://localhost:3000"
    
    # AWS General Settings
    AWS_REGION: str = "ap-south-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    
    # AWS Bedrock Settings
    BEDROCK_MODEL_ID: str = "meta.llama3-70b-instruct-v1:0"
    BEDROCK_MAX_TOKENS: int = 2048
    BEDROCK_TEMPERATURE: float = 0.7
    
    # AWS SageMaker Settings
    SAGEMAKER_ENDPOINT_NAME: Optional[str] = None
    
    # AWS DynamoDB Settings
    DYNAMODB_USERS_TABLE: str = "samvaad_users"
    DYNAMODB_CONTENT_TABLE: str = "samvaad_content"
    DYNAMODB_ENGAGEMENT_TABLE: str = "samvaad_engagement_scores"
    DYNAMODB_HISTORY_TABLE: str = "samvaad_publishing_history"
    DYNAMODB_SCHEDULED_TABLE: str = "samvaad_scheduled_posts"
    
    # AWS S3 Settings
    S3_BUCKET_NAME: str = "samvaad-ai-data"
    S3_DATASETS_PREFIX: str = "datasets/"
    S3_OUTPUTS_PREFIX: str = "generated-outputs/"
    S3_LOGS_PREFIX: str = "logs/"
    
    # AWS Cognito Settings
    COGNITO_USER_POOL_ID: Optional[str] = None
    COGNITO_CLIENT_ID: Optional[str] = None
    COGNITO_REGION: str = "ap-south-1"
    
    # AWS CloudWatch Settings
    CLOUDWATCH_LOG_GROUP: str = "/samvaad-ai/backend"
    CLOUDWATCH_METRICS_NAMESPACE: str = "SAMVAAD-AI"
    
    # Redis/ElastiCache Settings
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0
    REDIS_CACHE_TTL: int = 3600  # 1 hour default TTL
    
    # Step Functions Settings
    STEP_FUNCTION_ARN: Optional[str] = None
    
    # AI Provider Settings
    AI_PROVIDER: str = "auto"  # auto, bedrock, openai, template
    
    # OpenAI Settings (Fallback provider)
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-3.5-turbo"
    
    # JWT Settings
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 60  # seconds
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Platform-specific configurations
PLATFORM_CONFIGS = {
    "instagram": {
        "max_length": 2200,
        "max_hashtags": 30,
        "optimal_hashtags": 11,
        "supports_emojis": True,
        "supports_links": False,
        "content_types": ["image", "video", "carousel", "reel", "story"],
    },
    "twitter": {
        "max_length": 280,
        "max_hashtags": 5,
        "optimal_hashtags": 2,
        "supports_emojis": True,
        "supports_links": True,
        "content_types": ["tweet", "thread", "poll"],
    },
    "linkedin": {
        "max_length": 3000,
        "max_hashtags": 5,
        "optimal_hashtags": 3,
        "supports_emojis": True,
        "supports_links": True,
        "content_types": ["post", "article", "newsletter"],
    },
    "facebook": {
        "max_length": 63206,
        "max_hashtags": 10,
        "optimal_hashtags": 3,
        "supports_emojis": True,
        "supports_links": True,
        "content_types": ["post", "story", "reel", "event"],
    },
    "amazon": {
        "max_length": 2000,
        "max_hashtags": 0,
        "optimal_hashtags": 0,
        "supports_emojis": False,
        "supports_links": False,
        "content_types": ["product_description", "bullet_points", "a_plus_content"],
    },
}

# Supported languages for translation
SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi",
    "ta": "Tamil",
    "te": "Telugu",
    "bn": "Bengali",
    "gu": "Gujarati",
    "kn": "Kannada",
    "ml": "Malayalam",
    "pa": "Punjabi",
}

# Cultural context configurations for Indian festivals and events
CULTURAL_CONTEXTS = [
    "diwali",
    "holi",
    "eid",
    "christmas",
    "independence_day",
    "republic_day",
    "ganesh_chaturthi",
    "navratri",
    "durga_puja",
    "pongal",
    "onam",
    "baisakhi",
    "makar_sankranti",
    "raksha_bandhan",
    "janmashtami",
]

# Engagement scoring weights
ENGAGEMENT_WEIGHTS = {
    "timing": 0.20,
    "hashtags": 0.15,
    "content_quality": 0.30,
    "cultural_relevance": 0.20,
    "sentiment": 0.15,
}
