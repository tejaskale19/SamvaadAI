"""
Redis Service for SAMVAAD AI
Handles caching with Redis/ElastiCache for AI responses and predictions
"""

import redis
import json
import logging
import hashlib
from datetime import timedelta
from typing import Dict, Any, Optional, Union

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class RedisService:
    """Service for Redis caching operations"""
    
    def __init__(self):
        """Initialize Redis client"""
        self.enabled = True
        try:
            self.client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                password=settings.REDIS_PASSWORD,
                db=settings.REDIS_DB,
                decode_responses=True,
                socket_connect_timeout=5,
            )
            # Test connection
            self.client.ping()
            logger.info("Redis connection established")
        except redis.ConnectionError as e:
            logger.warning(f"Redis connection failed: {e}. Caching disabled.")
            self.enabled = False
            self.client = None
        except Exception as e:
            logger.warning(f"Redis initialization error: {e}. Caching disabled.")
            self.enabled = False
            self.client = None
        
        self.default_ttl = settings.REDIS_CACHE_TTL
        
        # Cache key prefixes
        self.prefixes = {
            "content": "samvaad:content:",
            "engagement": "samvaad:engagement:",
            "translation": "samvaad:translation:",
            "user": "samvaad:user:",
            "trends": "samvaad:trends:",
        }
    
    def _generate_cache_key(self, prefix: str, *args) -> str:
        """Generate a deterministic cache key"""
        key_data = ":".join(str(arg) for arg in args)
        hash_value = hashlib.md5(key_data.encode()).hexdigest()[:12]
        return f"{self.prefixes.get(prefix, 'samvaad:')}{hash_value}"
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.enabled:
            return None
        
        try:
            value = self.client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Redis get error: {e}")
            return None
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None
    ) -> bool:
        """Set value in cache"""
        if not self.enabled:
            return False
        
        try:
            ttl = ttl or self.default_ttl
            serialized = json.dumps(value, default=str)
            self.client.setex(key, ttl, serialized)
            return True
        except Exception as e:
            logger.error(f"Redis set error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete value from cache"""
        if not self.enabled:
            return False
        
        try:
            self.client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Redis delete error: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        if not self.enabled:
            return False
        
        try:
            return self.client.exists(key) > 0
        except Exception as e:
            logger.error(f"Redis exists error: {e}")
            return False
    
    async def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching pattern"""
        if not self.enabled:
            return 0
        
        try:
            keys = self.client.keys(pattern)
            if keys:
                return self.client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Redis clear_pattern error: {e}")
            return 0
    
    # =========================================================================
    # CONTENT CACHING
    # =========================================================================
    
    async def cache_generated_content(
        self,
        prompt: str,
        platform: str,
        content: Dict[str, Any],
        ttl: int = 3600
    ) -> bool:
        """Cache generated AI content"""
        key = self._generate_cache_key("content", prompt, platform)
        return await self.set(key, content, ttl)
    
    async def get_cached_content(
        self,
        prompt: str,
        platform: str
    ) -> Optional[Dict[str, Any]]:
        """Get cached AI content"""
        key = self._generate_cache_key("content", prompt, platform)
        return await self.get(key)
    
    # =========================================================================
    # ENGAGEMENT PREDICTION CACHING
    # =========================================================================
    
    async def cache_engagement_prediction(
        self,
        content_hash: str,
        platform: str,
        prediction: Dict[str, Any],
        ttl: int = 1800
    ) -> bool:
        """Cache engagement prediction"""
        key = self._generate_cache_key("engagement", content_hash, platform)
        return await self.set(key, prediction, ttl)
    
    async def get_cached_engagement(
        self,
        content_hash: str,
        platform: str
    ) -> Optional[Dict[str, Any]]:
        """Get cached engagement prediction"""
        key = self._generate_cache_key("engagement", content_hash, platform)
        return await self.get(key)
    
    def hash_content(self, content: str) -> str:
        """Generate hash for content caching"""
        return hashlib.md5(content.encode()).hexdigest()
    
    # =========================================================================
    # TRANSLATION CACHING
    # =========================================================================
    
    async def cache_translation(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        translation: Dict[str, Any],
        ttl: int = 86400  # 24 hours
    ) -> bool:
        """Cache translation result"""
        key = self._generate_cache_key("translation", text, source_lang, target_lang)
        return await self.set(key, translation, ttl)
    
    async def get_cached_translation(
        self,
        text: str,
        source_lang: str,
        target_lang: str
    ) -> Optional[Dict[str, Any]]:
        """Get cached translation"""
        key = self._generate_cache_key("translation", text, source_lang, target_lang)
        return await self.get(key)
    
    # =========================================================================
    # TRENDS CACHING
    # =========================================================================
    
    async def cache_trends(
        self,
        trend_type: str,
        platform: Optional[str],
        data: Dict[str, Any],
        ttl: int = 1800  # 30 minutes
    ) -> bool:
        """Cache trending data"""
        key = self._generate_cache_key("trends", trend_type, platform or "all")
        return await self.set(key, data, ttl)
    
    async def get_cached_trends(
        self,
        trend_type: str,
        platform: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Get cached trends"""
        key = self._generate_cache_key("trends", trend_type, platform or "all")
        return await self.get(key)
    
    # =========================================================================
    # SESSION MANAGEMENT
    # =========================================================================
    
    async def store_session(
        self,
        session_id: str,
        user_data: Dict[str, Any],
        ttl: int = 86400
    ) -> bool:
        """Store user session"""
        key = f"samvaad:session:{session_id}"
        return await self.set(key, user_data, ttl)
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get user session"""
        key = f"samvaad:session:{session_id}"
        return await self.get(key)
    
    async def invalidate_session(self, session_id: str) -> bool:
        """Invalidate user session"""
        key = f"samvaad:session:{session_id}"
        return await self.delete(key)
    
    # =========================================================================
    # RATE LIMITING
    # =========================================================================
    
    async def check_rate_limit(
        self,
        identifier: str,
        limit: int,
        window_seconds: int
    ) -> Dict[str, Any]:
        """Check and update rate limit"""
        if not self.enabled:
            return {"allowed": True, "remaining": limit}
        
        key = f"samvaad:ratelimit:{identifier}"
        
        try:
            current = self.client.get(key)
            
            if current is None:
                self.client.setex(key, window_seconds, 1)
                return {"allowed": True, "remaining": limit - 1}
            
            count = int(current)
            if count >= limit:
                ttl = self.client.ttl(key)
                return {
                    "allowed": False,
                    "remaining": 0,
                    "retry_after": ttl,
                }
            
            self.client.incr(key)
            return {"allowed": True, "remaining": limit - count - 1}
            
        except Exception as e:
            logger.error(f"Rate limit check error: {e}")
            return {"allowed": True, "remaining": limit}
    
    # =========================================================================
    # UTILITIES
    # =========================================================================
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not self.enabled:
            return {"enabled": False}
        
        try:
            info = self.client.info()
            return {
                "enabled": True,
                "connected_clients": info.get("connected_clients"),
                "used_memory": info.get("used_memory_human"),
                "total_keys": self.client.dbsize(),
                "uptime_days": info.get("uptime_in_days"),
            }
        except Exception as e:
            logger.error(f"Redis stats error: {e}")
            return {"enabled": True, "error": str(e)}
    
    async def flush_all(self) -> bool:
        """Clear all cached data (use with caution)"""
        if not self.enabled:
            return False
        
        try:
            self.client.flushdb()
            logger.info("Redis cache flushed")
            return True
        except Exception as e:
            logger.error(f"Redis flush error: {e}")
            return False


# Create singleton instance
redis_service = RedisService()
