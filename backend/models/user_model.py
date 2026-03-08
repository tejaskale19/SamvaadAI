"""
User models for SAMVAAD AI
Defines request/response schemas for user authentication and management
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr


class UserPreferences(BaseModel):
    """User preferences configuration"""
    default_platform: Optional[str] = Field(None, description="Default platform for content")
    language: str = Field(default="en", description="Preferred language")
    timezone: str = Field(default="Asia/Kolkata", description="User timezone")
    theme: str = Field(default="light", description="UI theme preference")
    email_notifications: bool = Field(default=True, description="Email notification preference")
    default_tone: str = Field(default="professional", description="Default content tone")
    favorite_hashtags: List[str] = Field(default_factory=list, description="Frequently used hashtags")
    
    class Config:
        json_schema_extra = {
            "example": {
                "default_platform": "instagram",
                "language": "en",
                "timezone": "Asia/Kolkata",
                "theme": "dark",
                "email_notifications": True,
                "default_tone": "casual",
                "favorite_hashtags": ["#MadeInIndia", "#Startup"]
            }
        }


class UserCreate(BaseModel):
    """Request model for user registration"""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, max_length=128, description="User password")
    name: str = Field(..., min_length=2, max_length=100, description="User full name")
    phone: Optional[str] = Field(None, description="Phone number")
    company: Optional[str] = Field(None, description="Company name")
    preferences: Optional[UserPreferences] = Field(None, description="User preferences")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "SecurePass123!",
                "name": "Rahul Sharma",
                "phone": "+91-9876543210",
                "company": "Tech Startup India",
                "preferences": {
                    "default_platform": "instagram",
                    "language": "en",
                    "timezone": "Asia/Kolkata"
                }
            }
        }


class UserLogin(BaseModel):
    """Request model for user login"""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")
    remember_me: bool = Field(default=False, description="Extended session")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "SecurePass123!",
                "remember_me": True
            }
        }


class TokenResponse(BaseModel):
    """Response model for authentication tokens"""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: Optional[str] = Field(None, description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiry in seconds")
    
    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 1800
            }
        }


class UserResponse(BaseModel):
    """Response model for user data"""
    user_id: str = Field(..., description="Unique user identifier")
    email: str = Field(..., description="User email")
    name: str = Field(..., description="User name")
    phone: Optional[str] = Field(None, description="Phone number")
    company: Optional[str] = Field(None, description="Company name")
    preferences: UserPreferences = Field(default_factory=UserPreferences, description="User preferences")
    created_at: datetime = Field(..., description="Account creation timestamp")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    is_active: bool = Field(default=True, description="Account status")
    subscription_tier: str = Field(default="free", description="Subscription tier")
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user_abc123",
                "email": "user@example.com",
                "name": "Rahul Sharma",
                "phone": "+91-9876543210",
                "company": "Tech Startup India",
                "preferences": {
                    "default_platform": "instagram",
                    "language": "en"
                },
                "created_at": "2024-01-15T10:30:00Z",
                "last_login": "2024-11-01T08:00:00Z",
                "is_active": True,
                "subscription_tier": "pro"
            }
        }


class PasswordReset(BaseModel):
    """Request model for password reset"""
    email: EmailStr = Field(..., description="User email address")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com"
            }
        }


class PasswordResetConfirm(BaseModel):
    """Request model for password reset confirmation"""
    token: str = Field(..., description="Reset token from email")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")
    
    class Config:
        json_schema_extra = {
            "example": {
                "token": "reset_token_123",
                "new_password": "NewSecurePass123!"
            }
        }


class UserUpdate(BaseModel):
    """Request model for updating user profile"""
    name: Optional[str] = Field(None, min_length=2, max_length=100, description="User name")
    phone: Optional[str] = Field(None, description="Phone number")
    company: Optional[str] = Field(None, description="Company name")
    preferences: Optional[UserPreferences] = Field(None, description="User preferences")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Rahul K. Sharma",
                "company": "New Startup India",
                "preferences": {
                    "theme": "dark",
                    "default_tone": "casual"
                }
            }
        }


class AnalyticsOverview(BaseModel):
    """User analytics overview"""
    total_content_created: int = Field(default=0, description="Total content pieces created")
    content_approved: int = Field(default=0, description="Content approved")
    content_published: int = Field(default=0, description="Content published")
    avg_engagement_score: float = Field(default=0.0, description="Average engagement score")
    most_used_platform: Optional[str] = Field(None, description="Most frequently used platform")
    total_reach: int = Field(default=0, description="Total content reach")
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_content_created": 150,
                "content_approved": 120,
                "content_published": 100,
                "avg_engagement_score": 78.5,
                "most_used_platform": "instagram",
                "total_reach": 250000
            }
        }
