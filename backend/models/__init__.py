"""
Models package for SAMVAAD AI
Contains Pydantic models for request/response validation
"""

from .content_model import (
    ContentRequest,
    ContentResponse,
    ContentVariant,
    TranslationRequest,
    TranslationResponse,
    EngagementRequest,
    EngagementResponse,
    ApprovalRequest,
    ApprovalResponse,
    Platform,
    ContentStatus,
)

from .user_model import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    UserPreferences,
)

__all__ = [
    # Content models
    "ContentRequest",
    "ContentResponse",
    "ContentVariant",
    "TranslationRequest",
    "TranslationResponse",
    "EngagementRequest",
    "EngagementResponse",
    "ApprovalRequest",
    "ApprovalResponse",
    "Platform",
    "ContentStatus",
    # User models
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "TokenResponse",
    "UserPreferences",
]
