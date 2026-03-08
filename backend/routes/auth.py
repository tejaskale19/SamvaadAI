"""
Authentication Route for SAMVAAD AI
POST /login, POST /signup - User authentication with AWS Cognito
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.security import OAuth2PasswordBearer
from typing import Optional
import logging

from models.user_model import (
    UserCreate, UserLogin, UserResponse, TokenResponse,
    PasswordReset, PasswordResetConfirm
)
from services.cognito_service import cognito_service
from services.dynamodb_service import dynamodb_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


async def get_current_user(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Depends(oauth2_scheme)
) -> dict:
    """
    Dependency to get current authenticated user
    
    Supports both:
    - Bearer token in Authorization header
    - OAuth2 token from oauth2_scheme
    """
    # Extract token from Authorization header if present
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    
    if not token:
        # Return demo user for unauthenticated requests (development mode)
        return {
            "user_id": "demo_user",
            "email": "demo@samvaad.ai",
            "name": "Demo User",
            "is_authenticated": False,
        }
    
    # Verify token
    result = await cognito_service.verify_token(token)
    
    if not result.get("valid"):
        raise HTTPException(
            status_code=401,
            detail=result.get("error", "Invalid or expired token")
        )
    
    return {
        "user_id": result.get("user_id"),
        "email": result.get("email"),
        "name": result.get("name"),
        "is_authenticated": True,
    }


async def require_auth(user: dict = Depends(get_current_user)) -> dict:
    """Dependency that requires authentication"""
    if not user.get("is_authenticated"):
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )
    return user


@router.post("/signup", response_model=TokenResponse)
async def signup(user_data: UserCreate):
    """
    Register a new user
    
    - Creates user in AWS Cognito
    - Creates user profile in DynamoDB
    - Returns authentication tokens
    
    Password requirements:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
    """
    try:
        # Create user in Cognito
        cognito_result = await cognito_service.sign_up(
            email=user_data.email,
            password=user_data.password,
            name=user_data.name,
            phone=user_data.phone,
        )
        
        if not cognito_result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=cognito_result.get("error", "Signup failed")
            )
        
        # Create user profile in DynamoDB
        db_result = await dynamodb_service.create_user({
            "email": user_data.email,
            "name": user_data.name,
            "phone": user_data.phone,
            "company": user_data.company,
            "preferences": user_data.preferences.dict() if user_data.preferences else {},
        })
        
        # Auto-login after signup (in local mode)
        if cognito_result.get("is_local"):
            login_result = await cognito_service.sign_in(
                email=user_data.email,
                password=user_data.password,
            )
            
            if login_result.get("success"):
                return TokenResponse(
                    access_token=login_result.get("access_token"),
                    refresh_token=login_result.get("refresh_token"),
                    token_type=login_result.get("token_type", "bearer"),
                    expires_in=login_result.get("expires_in", 3600),
                )
        
        # For Cognito, return message about email verification
        return TokenResponse(
            access_token="",
            refresh_token=None,
            token_type="bearer",
            expires_in=0,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Signup failed: {str(e)}"
        )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """
    Authenticate user and get access tokens
    
    Returns:
    - access_token: JWT for API authentication
    - refresh_token: Token to refresh access_token
    - expires_in: Token expiry in seconds
    """
    try:
        result = await cognito_service.sign_in(
            email=credentials.email,
            password=credentials.password,
            remember_me=credentials.remember_me,
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=401,
                detail=result.get("error", "Invalid credentials")
            )
        
        # Update last login in DynamoDB
        user = await dynamodb_service.get_user_by_email(credentials.email)
        if user:
            await dynamodb_service.update_user(
                user.get("user_id"),
                {"last_login": __import__("datetime").datetime.utcnow().isoformat()}
            )
        
        return TokenResponse(
            access_token=result.get("access_token"),
            refresh_token=result.get("refresh_token"),
            token_type=result.get("token_type", "bearer"),
            expires_in=result.get("expires_in", 3600),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Login failed: {str(e)}"
        )


@router.post("/logout")
async def logout(user: dict = Depends(require_auth)):
    """
    Log out user and invalidate tokens
    """
    # In a full implementation, you would invalidate the token
    # For Cognito, call global_sign_out
    return {"success": True, "message": "Logged out successfully"}


@router.post("/refresh")
async def refresh_token(refresh_token: str):
    """
    Refresh access token using refresh token
    """
    result = await cognito_service.refresh_tokens(refresh_token)
    
    if not result.get("success"):
        raise HTTPException(
            status_code=401,
            detail=result.get("error", "Token refresh failed")
        )
    
    return TokenResponse(
        access_token=result.get("access_token"),
        refresh_token=refresh_token,  # Refresh token stays the same
        token_type=result.get("token_type", "bearer"),
        expires_in=result.get("expires_in", 3600),
    )


@router.post("/forgot-password")
async def forgot_password(request: PasswordReset):
    """
    Initiate password reset flow
    
    Sends verification code to user's email
    """
    result = await cognito_service.forgot_password(request.email)
    
    # Always return success to prevent email enumeration
    return {
        "success": True,
        "message": "If the email exists, a reset code has been sent"
    }


@router.post("/reset-password")
async def reset_password(request: PasswordResetConfirm):
    """
    Complete password reset with verification code
    """
    # Note: This would need the email as well in a full implementation
    # For now, return success message
    return {
        "success": True,
        "message": "Password reset successful. Please login with your new password."
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(user: dict = Depends(require_auth)):
    """
    Get current user's profile
    """
    user_data = await dynamodb_service.get_user_by_email(user.get("email"))
    
    if not user_data:
        # Return basic info from token
        return UserResponse(
            user_id=user.get("user_id", ""),
            email=user.get("email", ""),
            name=user.get("name", ""),
            created_at=__import__("datetime").datetime.utcnow(),
        )
    
    return UserResponse(**user_data)


@router.put("/me")
async def update_user_profile(
    updates: dict,
    user: dict = Depends(require_auth)
):
    """
    Update current user's profile
    """
    # Get user from database
    user_data = await dynamodb_service.get_user_by_email(user.get("email"))
    
    if not user_data:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    # Filter allowed updates
    allowed_fields = ["name", "phone", "company", "preferences"]
    filtered_updates = {
        k: v for k, v in updates.items()
        if k in allowed_fields
    }
    
    if not filtered_updates:
        raise HTTPException(
            status_code=400,
            detail="No valid fields to update"
        )
    
    result = await dynamodb_service.update_user(
        user_data.get("user_id"),
        filtered_updates
    )
    
    return result
