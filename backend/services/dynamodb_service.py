"""
DynamoDB Service for SAMVAAD AI
Handles all database operations for users, content, and analytics
"""

import asyncio
import boto3
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from botocore.exceptions import ClientError
from decimal import Decimal
import uuid

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _convert_floats_to_decimal(data):
    """Recursively convert float values to Decimal for DynamoDB compatibility."""
    if isinstance(data, float):
        return Decimal(str(data))
    elif isinstance(data, dict):
        return {k: _convert_floats_to_decimal(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [_convert_floats_to_decimal(i) for i in data]
    return data


def _strip_none_values(data):
    """Recursively remove None values from dicts (DynamoDB rejects them)."""
    if isinstance(data, dict):
        return {k: _strip_none_values(v) for k, v in data.items() if v is not None}
    elif isinstance(data, list):
        return [_strip_none_values(i) for i in data]
    return data


class DynamoDBService:
    """Service for DynamoDB database operations"""
    
    def __init__(self):
        """Initialize DynamoDB client"""
        self.client = boto3.client(
            "dynamodb",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        self.resource = boto3.resource(
            "dynamodb",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        
        # Table references
        self.users_table = settings.DYNAMODB_USERS_TABLE
        self.content_table = settings.DYNAMODB_CONTENT_TABLE
        self.engagement_table = settings.DYNAMODB_ENGAGEMENT_TABLE
        self.history_table = settings.DYNAMODB_HISTORY_TABLE
        self.scheduled_table = settings.DYNAMODB_SCHEDULED_TABLE
    
    # =========================================================================
    # USER OPERATIONS
    # =========================================================================
    
    async def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user"""
        try:
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            timestamp = datetime.utcnow().isoformat()
            
            item = {
                "user_id": user_id,
                "email": user_data["email"],
                "name": user_data["name"],
                "phone": user_data.get("phone"),
                "company": user_data.get("company"),
                "preferences": user_data.get("preferences", {}),
                "created_at": timestamp,
                "updated_at": timestamp,
                "is_active": True,
                "subscription_tier": "free",
            }
            
            table = self.resource.Table(self.users_table)
            await asyncio.to_thread(lambda: table.put_item(Item=item))
            
            return {"success": True, "user_id": user_id, "user": item}
            
        except ClientError as e:
            logger.error(f"DynamoDB create_user error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        try:
            table = self.resource.Table(self.users_table)
            response = await asyncio.to_thread(lambda: table.get_item(Key={"user_id": user_id}))
            return response.get("Item")
        except ClientError as e:
            logger.error(f"DynamoDB get_user error: {e}")
            return None
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        try:
            table = self.resource.Table(self.users_table)
            _email = email
            response = await asyncio.to_thread(lambda: table.scan(
                FilterExpression="email = :email",
                ExpressionAttributeValues={":email": _email}
            ))
            items = response.get("Items", [])
            return items[0] if items else None
        except ClientError as e:
            logger.error(f"DynamoDB get_user_by_email error: {e}")
            return None
    
    async def update_user(self, user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update user data"""
        try:
            table = self.resource.Table(self.users_table)
            
            update_expr_parts = []
            expr_attr_values = {}
            expr_attr_names = {}
            
            for key, value in updates.items():
                safe_key = f"#{key}"
                expr_attr_names[safe_key] = key
                expr_attr_values[f":{key}"] = value
                update_expr_parts.append(f"{safe_key} = :{key}")
            
            # Add updated_at
            expr_attr_names["#updated_at"] = "updated_at"
            expr_attr_values[":updated_at"] = datetime.utcnow().isoformat()
            update_expr_parts.append("#updated_at = :updated_at")
            
            _update_expr = "SET " + ", ".join(update_expr_parts)
            _names = expr_attr_names
            _values = expr_attr_values
            _uid = user_id
            response = await asyncio.to_thread(lambda: table.update_item(
                Key={"user_id": _uid},
                UpdateExpression=_update_expr,
                ExpressionAttributeNames=_names,
                ExpressionAttributeValues=_values,
                ReturnValues="ALL_NEW"
            ))
            
            return {"success": True, "user": response.get("Attributes")}
            
        except ClientError as e:
            logger.error(f"DynamoDB update_user error: {e}")
            return {"success": False, "error": str(e)}
    
    # =========================================================================
    # CONTENT OPERATIONS
    # =========================================================================
    
    async def save_content(self, content_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save generated content"""
        try:
            content_id = content_data.get("content_id") or f"content_{uuid.uuid4().hex[:12]}"
            timestamp = datetime.utcnow().isoformat()
            
            item = {
                "content_id": content_id,
                "user_id": content_data["user_id"],
                "prompt": content_data["prompt"],
                "platform": content_data["platform"],
                "variants": content_data["variants"],
                "selected_variant_id": content_data.get("selected_variant_id"),
                "status": content_data.get("status", "draft"),
                "metadata": content_data.get("metadata", {}),
                "created_at": timestamp,
                "updated_at": timestamp,
            }
            
            table = self.resource.Table(self.content_table)
            item = _strip_none_values(item)
            item = _convert_floats_to_decimal(item)
            await asyncio.to_thread(lambda: table.put_item(Item=item))
            
            return {"success": True, "content_id": content_id, "content": item}
            
        except Exception as e:
            logger.error(f"DynamoDB save_content error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_content(self, content_id: str) -> Optional[Dict[str, Any]]:
        """Get content by ID"""
        try:
            table = self.resource.Table(self.content_table)
            response = await asyncio.to_thread(lambda: table.get_item(Key={"content_id": content_id}))
            return response.get("Item")
        except ClientError as e:
            logger.error(f"DynamoDB get_content error: {e}")
            return None
    
    async def update_content(self, content_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update content"""
        try:
            table = self.resource.Table(self.content_table)
            
            update_expr_parts = []
            expr_attr_values = {}
            expr_attr_names = {}
            
            for key, value in updates.items():
                if value is None:
                    continue
                safe_key = f"#{key}"
                expr_attr_names[safe_key] = key
                expr_attr_values[f":{key}"] = _convert_floats_to_decimal(value)
                update_expr_parts.append(f"{safe_key} = :{key}")
            
            expr_attr_names["#updated_at"] = "updated_at"
            expr_attr_values[":updated_at"] = datetime.utcnow().isoformat()
            update_expr_parts.append("#updated_at = :updated_at")
            
            _update_expr = "SET " + ", ".join(update_expr_parts)
            _names = expr_attr_names
            _values = expr_attr_values
            _cid = content_id
            response = await asyncio.to_thread(lambda: table.update_item(
                Key={"content_id": _cid},
                UpdateExpression=_update_expr,
                ExpressionAttributeNames=_names,
                ExpressionAttributeValues=_values,
                ReturnValues="ALL_NEW"
            ))
            
            return {"success": True, "content": response.get("Attributes")}
            
        except ClientError as e:
            logger.error(f"DynamoDB update_content error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_user_content(
        self,
        user_id: str,
        status: Optional[str] = None,
        platform: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Get user's content history"""
        try:
            table = self.resource.Table(self.content_table)
            
            filter_expr = "user_id = :user_id"
            expr_attr_values = {":user_id": user_id}
            
            if status:
                filter_expr += " AND #status = :status"
                expr_attr_values[":status"] = status
            
            if platform:
                filter_expr += " AND platform = :platform"
                expr_attr_values[":platform"] = platform
            
            scan_kwargs = {
                "FilterExpression": filter_expr,
                "ExpressionAttributeValues": expr_attr_values,
            }
            
            if status:
                scan_kwargs["ExpressionAttributeNames"] = {"#status": "status"}
            
            response = await asyncio.to_thread(lambda: table.scan(**scan_kwargs))
            items = response.get("Items", [])
            
            # Sort by created_at descending
            items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            
            # Apply pagination
            paginated = items[offset:offset + limit]
            
            return {
                "items": paginated,
                "total": len(items),
                "limit": limit,
                "offset": offset,
                "has_more": offset + limit < len(items),
            }
            
        except ClientError as e:
            logger.error(f"DynamoDB get_user_content error: {e}")
            return {"items": [], "total": 0, "error": str(e)}
    
    # =========================================================================
    # ENGAGEMENT SCORES
    # =========================================================================
    
    async def save_engagement_score(self, score_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save engagement prediction score"""
        try:
            score_id = f"score_{uuid.uuid4().hex[:12]}"
            timestamp = datetime.utcnow().isoformat()
            
            item = {
                "score_id": score_id,
                "content_id": score_data["content_id"],
                "user_id": score_data["user_id"],
                "platform": score_data["platform"],
                "score": score_data["score"],
                "confidence": score_data["confidence"],
                "factors": score_data["factors"],
                "recommendations": score_data.get("recommendations", []),
                "created_at": timestamp,
            }
            
            table = self.resource.Table(self.engagement_table)
            await asyncio.to_thread(lambda: table.put_item(Item=item))
            
            return {"success": True, "score_id": score_id}
            
        except Exception as e:
            logger.error(f"DynamoDB save_engagement_score error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_user_engagement_scores(
        self,
        user_id: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get user's engagement scores"""
        try:
            table = self.resource.Table(self.engagement_table)
            _uid = user_id
            response = await asyncio.to_thread(lambda: table.scan(
                FilterExpression="user_id = :user_id",
                ExpressionAttributeValues={":user_id": _uid}
            ))
            items = response.get("Items", [])
            items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            return items[:limit]
        except ClientError as e:
            logger.error(f"DynamoDB get_user_engagement_scores error: {e}")
            return []
    
    # =========================================================================
    # PUBLISHING HISTORY
    # =========================================================================
    
    async def save_publishing_history(self, history_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save publishing history record"""
        try:
            history_id = f"history_{uuid.uuid4().hex[:12]}"
            timestamp = datetime.utcnow().isoformat()
            
            item = {
                "history_id": history_id,
                "content_id": history_data["content_id"],
                "user_id": history_data["user_id"],
                "platform": history_data["platform"],
                "published_at": history_data.get("published_at", timestamp),
                "status": history_data.get("status", "published"),
                "metrics": history_data.get("metrics", {}),
                "created_at": timestamp,
            }
            
            table = self.resource.Table(self.history_table)
            await asyncio.to_thread(lambda: table.put_item(Item=item))
            
            return {"success": True, "history_id": history_id}
            
        except ClientError as e:
            logger.error(f"DynamoDB save_publishing_history error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_publishing_history(
        self,
        user_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get user's publishing history"""
        try:
            table = self.resource.Table(self.history_table)
            
            filter_expr = "user_id = :user_id"
            expr_attr_values = {":user_id": user_id}
            
            if start_date:
                filter_expr += " AND published_at >= :start_date"
                expr_attr_values[":start_date"] = start_date
            
            if end_date:
                filter_expr += " AND published_at <= :end_date"
                expr_attr_values[":end_date"] = end_date
            
            _filter = filter_expr
            _vals = expr_attr_values
            response = await asyncio.to_thread(lambda: table.scan(
                FilterExpression=_filter,
                ExpressionAttributeValues=_vals
            ))
            
            items = response.get("Items", [])
            items.sort(key=lambda x: x.get("published_at", ""), reverse=True)
            return items[:limit]
            
        except ClientError as e:
            logger.error(f"DynamoDB get_publishing_history error: {e}")
            return []
    
    # =========================================================================
    # SCHEDULED POSTS
    # =========================================================================
    
    async def schedule_post(self, schedule_data: Dict[str, Any]) -> Dict[str, Any]:
        """Schedule a post for future publishing"""
        try:
            schedule_id = f"schedule_{uuid.uuid4().hex[:12]}"
            timestamp = datetime.utcnow().isoformat()
            
            item = {
                "schedule_id": schedule_id,
                "content_id": schedule_data["content_id"],
                "user_id": schedule_data["user_id"],
                "platform": schedule_data["platform"],
                "scheduled_time": schedule_data["scheduled_time"],
                "status": "pending",
                "created_at": timestamp,
            }
            
            table = self.resource.Table(self.scheduled_table)
            await asyncio.to_thread(lambda: table.put_item(Item=item))
            
            return {"success": True, "schedule_id": schedule_id}
            
        except ClientError as e:
            logger.error(f"DynamoDB schedule_post error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_scheduled_posts(
        self,
        user_id: str,
        status: str = "pending"
    ) -> List[Dict[str, Any]]:
        """Get user's scheduled posts"""
        try:
            table = self.resource.Table(self.scheduled_table)
            _uid, _status = user_id, status
            response = await asyncio.to_thread(lambda: table.scan(
                FilterExpression="user_id = :user_id AND #status = :status",
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues={
                    ":user_id": _uid,
                    ":status": _status
                }
            ))
            items = response.get("Items", [])
            items.sort(key=lambda x: x.get("scheduled_time", ""))
            return items
        except ClientError as e:
            logger.error(f"DynamoDB get_scheduled_posts error: {e}")
            return []
    
    async def create_scheduled_post(self, post_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a scheduled post entry"""
        try:
            schedule_id = post_data.get("publish_id", f"schedule_{uuid.uuid4().hex[:12]}")
            timestamp = datetime.utcnow().isoformat()
            
            item = {
                "schedule_id": schedule_id,
                "publish_id": post_data.get("publish_id"),
                "content_id": post_data["content_id"],
                "variant_id": post_data.get("variant_id"),
                "user_id": post_data["user_id"],
                "platform": post_data["platform"],
                "content": post_data.get("content"),
                "hashtags": post_data.get("hashtags", []),
                "execution_time": post_data.get("execution_time"),
                "scheduled_at": post_data.get("scheduled_at"),
                "status": post_data.get("status", "scheduled"),
                "created_at": timestamp,
            }
            
            table = self.resource.Table(self.scheduled_table)
            await asyncio.to_thread(lambda: table.put_item(Item=item))
            
            return {"success": True, "schedule_id": schedule_id}
            
        except ClientError as e:
            logger.error(f"DynamoDB create_scheduled_post error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_publishing_history_by_id(self, publish_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific publishing history record by ID"""
        try:
            table = self.resource.Table(self.history_table)
            _pid = publish_id
            response = await asyncio.to_thread(lambda: table.scan(
                FilterExpression="publish_id = :publish_id",
                ExpressionAttributeValues={":publish_id": _pid}
            ))
            items = response.get("Items", [])
            return items[0] if items else None
        except ClientError as e:
            logger.error(f"DynamoDB get_publishing_history_by_id error: {e}")
            return None
    
    async def update_publishing_history(
        self,
        publish_id: str,
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update a publishing history record"""
        try:
            # First find the record by publish_id
            existing = await self.get_publishing_history_by_id(publish_id)
            if not existing:
                return {"success": False, "error": "Record not found"}
            
            history_id = existing.get("history_id")
            table = self.resource.Table(self.history_table)
            
            update_expr_parts = []
            expr_attr_values = {}
            expr_attr_names = {}
            
            for key, value in updates.items():
                safe_key = f"#{key}"
                expr_attr_names[safe_key] = key
                expr_attr_values[f":{key}"] = value
                update_expr_parts.append(f"{safe_key} = :{key}")
            
            # Add updated_at
            expr_attr_names["#updated_at"] = "updated_at"
            expr_attr_values[":updated_at"] = datetime.utcnow().isoformat()
            update_expr_parts.append("#updated_at = :updated_at")
            
            _update_expr = "SET " + ", ".join(update_expr_parts)
            _names = expr_attr_names
            _values = expr_attr_values
            _hid = history_id
            response = await asyncio.to_thread(lambda: table.update_item(
                Key={"history_id": _hid},
                UpdateExpression=_update_expr,
                ExpressionAttributeNames=_names,
                ExpressionAttributeValues=_values,
                ReturnValues="ALL_NEW"
            ))
            
            return {"success": True, "record": response.get("Attributes")}
            
        except ClientError as e:
            logger.error(f"DynamoDB update_publishing_history error: {e}")
            return {"success": False, "error": str(e)}
    
    # =========================================================================
    # ANALYTICS
    # =========================================================================
    
    async def get_analytics_data(
        self,
        user_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get comprehensive analytics data for user"""
        try:
            # Get content statistics
            content_result = await self.get_user_content(user_id, limit=1000)
            content_items = content_result.get("items", [])
            
            # Get engagement scores
            engagement_scores = await self.get_user_engagement_scores(user_id, limit=100)
            
            # Get publishing history
            history = await self.get_publishing_history(user_id, start_date, end_date, limit=100)
            
            # Calculate statistics
            status_counts = {}
            platform_counts = {}
            
            for item in content_items:
                status = item.get("status", "unknown")
                platform = item.get("platform", "unknown")
                status_counts[status] = status_counts.get(status, 0) + 1
                platform_counts[platform] = platform_counts.get(platform, 0) + 1
            
            avg_engagement = 0
            if engagement_scores:
                avg_engagement = sum(s.get("score", 0) for s in engagement_scores) / len(engagement_scores)
            
            return {
                "total_content": len(content_items),
                "content_by_status": status_counts,
                "content_by_platform": platform_counts,
                "avg_engagement": round(avg_engagement, 1),
                "publishing_history": history,
                "engagement_scores": engagement_scores,
            }
            
        except Exception as e:
            logger.error(f"DynamoDB get_analytics_data error: {e}")
            return {
                "total_content": 0,
                "content_by_status": {},
                "content_by_platform": {},
                "avg_engagement": 0,
                "publishing_history": [],
                "engagement_scores": [],
                "error": str(e),
            }


# Create singleton instance
dynamodb_service = DynamoDBService()
