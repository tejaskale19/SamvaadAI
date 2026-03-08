"""
Shared fixtures for SAMVAAD AI integration tests.

AWS service calls are patched so no real credentials are needed.
Redis and DynamoDB are replaced with in-memory fakes.
"""

from __future__ import annotations

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

# ── Patch heavy AWS/Redis services BEFORE importing the app ──────────────────

# Fake Redis that keeps data in a plain dict
class FakeRedis:
    def __init__(self):
        self._store: dict = {}

    async def get(self, key: str):
        return self._store.get(key)

    async def set(self, key: str, value, ttl: int = 300):
        self._store[key] = value

    async def delete(self, key: str):
        self._store.pop(key, None)

    async def exists(self, key: str) -> bool:
        return key in self._store

    async def expire(self, key: str, ttl: int):
        pass  # no-op in tests

    async def zadd(self, key, mapping):
        pass

    async def zremrangebyscore(self, key, min_score, max_score):
        pass

    async def zcard(self, key) -> int:
        return 0

    async def check_rate_limit(self, identifier: str, limit: int, window: int) -> bool:
        return True  # always allow in tests

    async def get_cached_content(self, *args, **kwargs):
        return None

    async def cache_generated_content(self, *args, **kwargs):
        pass

    async def get_cached_translation(self, *args, **kwargs):
        return None

    async def cache_translation(self, *args, **kwargs):
        pass

    async def get_cached_engagement(self, *args, **kwargs):
        return None

    async def cache_engagement_prediction(self, *args, **kwargs):
        pass


# Fake DynamoDB that does nothing (no real AWS)
class FakeDynamoDB:
    async def save_content(self, data):
        return {"success": True, "content_id": data.get("content_id", "test-id")}

    async def get_content(self, content_id):
        return None

    async def update_content(self, content_id, updates):
        return {"success": True}

    async def get_user_content(self, user_id, **kwargs):
        return {"items": [], "total": 0, "limit": 10, "offset": 0, "has_more": False}

    async def save_engagement_score(self, data):
        return {"success": True, "score_id": "score-test"}

    async def get_user_engagement_scores(self, user_id, **kwargs):
        return []

    async def save_publishing_history(self, data):
        return {"success": True, "history_id": "history-test"}

    async def get_publishing_history(self, *args, **kwargs):
        return []

    async def get_analytics_data(self, *args, **kwargs):
        return {
            "total_content": 0,
            "published": 0,
            "avg_engagement_score": 0,
            "platform_distribution": {},
            "content_by_status": {},
        }

    async def schedule_post(self, data):
        return {"success": True, "schedule_id": "sched-test"}

    async def get_scheduled_posts(self, *args, **kwargs):
        return []

    async def create_scheduled_post(self, data):
        return {"success": True}

    async def get_publishing_history_by_id(self, publish_id):
        return None

    async def update_publishing_history(self, *args, **kwargs):
        return {"success": False, "error": "not found"}

    @property
    def client(self):
        m = MagicMock()
        m.list_tables.return_value = {"TableNames": []}
        return m


# Fake AI provider service
DEMO_VARIANT = {
    "variant_id": "var_test001",
    "content": "Test content for Indian social media 🇮🇳 #SamvaadAI",
    "hashtags": ["#SamvaadAI", "#India"],
    "emojis": ["🇮🇳"],
    "approach": "Standard test variant",
    "engagement_score": 75,
    "is_selected": False,
}


class FakeAIProvider:
    async def generate_content(self, **kwargs):
        return {
            "success": True,
            "content_id": "content_test001",
            "platform": kwargs.get("platform", "instagram"),
            "provider": "demo",
            "variants": [DEMO_VARIANT],
            "metadata": {
                "model": "demo",
                "prompt": kwargs.get("prompt", ""),
                "cultural_context": kwargs.get("cultural_context"),
                "target_audience": kwargs.get("target_audience"),
            },
        }


@pytest.fixture(scope="session")
def client():
    """
    Return a synchronous TestClient with all AWS/Redis services replaced
    by lightweight in-memory fakes.  No real AWS credentials required.
    """
    fake_redis = FakeRedis()
    fake_db = FakeDynamoDB()
    fake_ai = FakeAIProvider()

    with (
        patch("services.redis_service.redis_service", fake_redis),
        patch("services.dynamodb_service.dynamodb_service", fake_db),
        patch("services.ai_provider_service.ai_provider_service", fake_ai),
    ):
        from main import app
        from routes.auth import get_current_user

        # Override auth so every request is treated as authenticated
        async def _mock_user():
            return {
                "user_id": "test_user_001",
                "email": "test@samvaad.ai",
                "name": "Test User",
            }

        app.dependency_overrides[get_current_user] = _mock_user

        with TestClient(app, raise_server_exceptions=True) as c:
            yield c

        app.dependency_overrides.clear()
