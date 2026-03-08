"""
Cognito Service for SAMVAAD AI
Handles user authentication with AWS Cognito
"""

import boto3
import hmac
import hashlib
import base64
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from botocore.exceptions import ClientError
import jwt

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class CognitoService:
    """Service for AWS Cognito authentication"""
    
    def __init__(self):
        """Initialize Cognito client"""
        self.client = boto3.client(
            "cognito-idp",
            region_name=settings.COGNITO_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        self.user_pool_id = settings.COGNITO_USER_POOL_ID
        self.client_id = settings.COGNITO_CLIENT_ID
        
        # Fallback to local JWT if Cognito not configured
        self.use_local_auth = not (self.user_pool_id and self.client_id)
        if self.use_local_auth:
            logger.warning("Cognito not configured, using local JWT authentication")
    
    def _get_secret_hash(self, username: str) -> str:
        """Generate secret hash for Cognito authentication"""
        # This is only needed if your User Pool has a client secret
        # For apps without client secret, this is not required
        return ""
    
    async def sign_up(
        self,
        email: str,
        password: str,
        name: str,
        phone: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Register a new user
        
        Args:
            email: User email address
            password: User password
            name: User full name
            phone: Optional phone number
            
        Returns:
            Signup result with user_id
        """
        if self.use_local_auth:
            return await self._local_signup(email, password, name, phone)
        
        try:
            user_attributes = [
                {"Name": "email", "Value": email},
                {"Name": "name", "Value": name},
            ]
            
            if phone:
                user_attributes.append({"Name": "phone_number", "Value": phone})
            
            response = self.client.sign_up(
                ClientId=self.client_id,
                Username=email,
                Password=password,
                UserAttributes=user_attributes,
            )
            
            return {
                "success": True,
                "user_id": response.get("UserSub"),
                "confirmed": response.get("UserConfirmed", False),
                "message": "User registered successfully. Please verify your email.",
            }
            
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            error_message = e.response.get("Error", {}).get("Message", str(e))
            
            logger.error(f"Cognito signup error: {error_code} - {error_message}")
            
            if error_code == "UsernameExistsException":
                return {"success": False, "error": "Email already registered"}
            elif error_code == "InvalidPasswordException":
                return {"success": False, "error": "Password does not meet requirements"}
            else:
                return {"success": False, "error": error_message}
    
    async def sign_in(
        self,
        email: str,
        password: str,
        remember_me: bool = False
    ) -> Dict[str, Any]:
        """
        Authenticate a user
        
        Args:
            email: User email
            password: User password
            remember_me: Extended session
            
        Returns:
            Authentication result with tokens
        """
        if self.use_local_auth:
            return await self._local_signin(email, password, remember_me)
        
        try:
            response = self.client.initiate_auth(
                ClientId=self.client_id,
                AuthFlow="USER_PASSWORD_AUTH",
                AuthParameters={
                    "USERNAME": email,
                    "PASSWORD": password,
                },
            )
            
            auth_result = response.get("AuthenticationResult", {})
            
            return {
                "success": True,
                "access_token": auth_result.get("AccessToken"),
                "refresh_token": auth_result.get("RefreshToken"),
                "id_token": auth_result.get("IdToken"),
                "token_type": auth_result.get("TokenType", "Bearer"),
                "expires_in": auth_result.get("ExpiresIn", 3600),
            }
            
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            error_message = e.response.get("Error", {}).get("Message", str(e))
            
            logger.error(f"Cognito signin error: {error_code} - {error_message}")
            
            if error_code == "NotAuthorizedException":
                return {"success": False, "error": "Invalid email or password"}
            elif error_code == "UserNotConfirmedException":
                return {"success": False, "error": "Please verify your email first"}
            elif error_code == "UserNotFoundException":
                return {"success": False, "error": "User not found"}
            else:
                return {"success": False, "error": error_message}
    
    async def verify_token(self, token: str) -> Dict[str, Any]:
        """
        Verify a JWT token
        
        Args:
            token: JWT access or ID token
            
        Returns:
            Token verification result with user info
        """
        if self.use_local_auth:
            return self._verify_local_token(token)
        
        try:
            # For Cognito tokens, use get_user to verify
            response = self.client.get_user(AccessToken=token)
            
            user_attributes = {
                attr["Name"]: attr["Value"]
                for attr in response.get("UserAttributes", [])
            }
            
            return {
                "valid": True,
                "username": response.get("Username"),
                "email": user_attributes.get("email"),
                "name": user_attributes.get("name"),
                "user_id": user_attributes.get("sub"),
            }
            
        except ClientError as e:
            logger.error(f"Token verification error: {e}")
            return {"valid": False, "error": "Invalid or expired token"}
    
    async def refresh_tokens(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access tokens using refresh token"""
        if self.use_local_auth:
            return {"success": False, "error": "Token refresh not supported in local mode"}
        
        try:
            response = self.client.initiate_auth(
                ClientId=self.client_id,
                AuthFlow="REFRESH_TOKEN_AUTH",
                AuthParameters={
                    "REFRESH_TOKEN": refresh_token,
                },
            )
            
            auth_result = response.get("AuthenticationResult", {})
            
            return {
                "success": True,
                "access_token": auth_result.get("AccessToken"),
                "id_token": auth_result.get("IdToken"),
                "token_type": auth_result.get("TokenType", "Bearer"),
                "expires_in": auth_result.get("ExpiresIn", 3600),
            }
            
        except ClientError as e:
            logger.error(f"Token refresh error: {e}")
            return {"success": False, "error": "Failed to refresh token"}
    
    async def sign_out(self, access_token: str) -> Dict[str, Any]:
        """Sign out user (invalidate tokens)"""
        if self.use_local_auth:
            return {"success": True, "message": "Signed out successfully"}
        
        try:
            self.client.global_sign_out(AccessToken=access_token)
            return {"success": True, "message": "Signed out successfully"}
        except ClientError as e:
            logger.error(f"Sign out error: {e}")
            return {"success": False, "error": str(e)}
    
    async def forgot_password(self, email: str) -> Dict[str, Any]:
        """Initiate forgot password flow"""
        if self.use_local_auth:
            return {"success": True, "message": "Password reset email sent (demo mode)"}
        
        try:
            self.client.forgot_password(
                ClientId=self.client_id,
                Username=email,
            )
            return {
                "success": True,
                "message": "Password reset code sent to your email"
            }
        except ClientError as e:
            logger.error(f"Forgot password error: {e}")
            return {"success": False, "error": str(e)}
    
    async def confirm_forgot_password(
        self,
        email: str,
        code: str,
        new_password: str
    ) -> Dict[str, Any]:
        """Confirm password reset with verification code"""
        if self.use_local_auth:
            return {"success": True, "message": "Password reset successful (demo mode)"}
        
        try:
            self.client.confirm_forgot_password(
                ClientId=self.client_id,
                Username=email,
                ConfirmationCode=code,
                Password=new_password,
            )
            return {"success": True, "message": "Password reset successful"}
        except ClientError as e:
            logger.error(f"Confirm forgot password error: {e}")
            return {"success": False, "error": str(e)}
    
    # =========================================================================
    # LOCAL AUTHENTICATION FALLBACK
    # =========================================================================
    
    async def _local_signup(
        self,
        email: str,
        password: str,
        name: str,
        phone: Optional[str]
    ) -> Dict[str, Any]:
        """Local signup when Cognito is not configured"""
        import uuid
        
        user_id = f"local_{uuid.uuid4().hex[:12]}"
        
        return {
            "success": True,
            "user_id": user_id,
            "confirmed": True,
            "message": "User registered successfully (local mode)",
            "is_local": True,
        }
    
    async def _local_signin(
        self,
        email: str,
        password: str,
        remember_me: bool
    ) -> Dict[str, Any]:
        """Local signin when Cognito is not configured"""
        import uuid
        
        # Generate local JWT token
        expiry = timedelta(days=7) if remember_me else timedelta(hours=1)
        
        payload = {
            "sub": f"local_{uuid.uuid4().hex[:12]}",
            "email": email,
            "name": email.split("@")[0],
            "exp": datetime.utcnow() + expiry,
            "iat": datetime.utcnow(),
        }
        
        token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        
        return {
            "success": True,
            "access_token": token,
            "refresh_token": None,
            "token_type": "Bearer",
            "expires_in": int(expiry.total_seconds()),
            "is_local": True,
        }
    
    def _verify_local_token(self, token: str) -> Dict[str, Any]:
        """Verify locally generated JWT token"""
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            return {
                "valid": True,
                "user_id": payload.get("sub"),
                "email": payload.get("email"),
                "name": payload.get("name"),
            }
        except jwt.ExpiredSignatureError:
            return {"valid": False, "error": "Token has expired"}
        except jwt.InvalidTokenError as e:
            return {"valid": False, "error": f"Invalid token: {e}"}


# Create singleton instance
cognito_service = CognitoService()
