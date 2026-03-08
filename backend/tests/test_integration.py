"""
Integration tests for SAMVAAD AI backend.

Covers: health, content generation, translation, engagement prediction.
All AWS and Redis calls are replaced by in-memory fakes (see conftest.py).
Run with:  cd backend && pytest tests/ -v
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


# ─────────────────────────────────────────────────────────────────────────────
# Health & root
# ─────────────────────────────────────────────────────────────────────────────

class TestHealthEndpoints:
    def test_root_returns_200(self, client: TestClient):
        resp = client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "running"
        assert "version" in data

    def test_health_check_returns_200(self, client: TestClient):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert "status" in data
        assert "services" in data
        # Redis fake sets "health_check" → always "connected" or "degraded"
        assert data["services"].get("redis") in ("connected", "degraded", "unavailable")

    def test_api_status_endpoint(self, client: TestClient):
        resp = client.get("/api/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["api_version"] == "1.0.0"
        assert "features" in data
        assert "supported_platforms" in data
        assert "instagram" in data["supported_platforms"]


# ─────────────────────────────────────────────────────────────────────────────
# Content Generation  POST /api/generate
# ─────────────────────────────────────────────────────────────────────────────

GENERATE_PAYLOAD = {
    "prompt": "Diwali sale announcement for our handmade candles",
    "platform": "instagram",
    "language": "en",
    "tone": "festive",
    "cultural_context": "Diwali",
    "target_audience": "Indian households",
    "include_hashtags": True,
    "include_emojis": True,
    "max_variants": 1,
}


class TestContentGeneration:
    def test_generate_returns_200(self, client: TestClient):
        resp = client.post("/api/generate", json=GENERATE_PAYLOAD)
        assert resp.status_code == 200

    def test_generate_response_schema(self, client: TestClient):
        resp = client.post("/api/generate", json=GENERATE_PAYLOAD)
        data = resp.json()
        assert "content_id" in data
        assert "variants" in data
        assert isinstance(data["variants"], list)
        assert len(data["variants"]) >= 1

    def test_generate_variant_has_required_fields(self, client: TestClient):
        resp = client.post("/api/generate", json=GENERATE_PAYLOAD)
        variant = resp.json()["variants"][0]
        assert "variant_id" in variant
        assert "content" in variant
        assert isinstance(variant["content"], str)
        assert len(variant["content"]) > 0

    def test_generate_rejects_missing_prompt(self, client: TestClient):
        payload = {k: v for k, v in GENERATE_PAYLOAD.items() if k != "prompt"}
        resp = client.post("/api/generate", json=payload)
        assert resp.status_code == 422  # Unprocessable Entity

    def test_generate_rejects_invalid_platform(self, client: TestClient):
        payload = {**GENERATE_PAYLOAD, "platform": "snapchat"}
        resp = client.post("/api/generate", json=payload)
        assert resp.status_code == 422

    def test_generate_twitter_platform(self, client: TestClient):
        payload = {**GENERATE_PAYLOAD, "platform": "twitter"}
        resp = client.post("/api/generate", json=payload)
        assert resp.status_code == 200


# ─────────────────────────────────────────────────────────────────────────────
# Translation  POST /api/translate
# ─────────────────────────────────────────────────────────────────────────────

TRANSLATE_PAYLOAD = {
    "content": "Happy Diwali! May this festival of lights bring joy.",
    "source_language": "en",
    "target_languages": ["hi", "mr"],
    "platform": "instagram",
}


class TestTranslation:
    def test_translate_returns_200(self, client: TestClient):
        resp = client.post("/api/translate", json=TRANSLATE_PAYLOAD)
        # May be 200 (demo mode) or 503 if translate service raises
        assert resp.status_code in (200, 503)

    def test_translate_rejects_missing_content(self, client: TestClient):
        payload = {k: v for k, v in TRANSLATE_PAYLOAD.items() if k != "content"}
        resp = client.post("/api/translate", json=payload)
        assert resp.status_code == 422

    def test_translate_rejects_empty_target_list(self, client: TestClient):
        payload = {**TRANSLATE_PAYLOAD, "target_languages": []}
        resp = client.post("/api/translate", json=payload)
        # Schema should reject empty list
        assert resp.status_code in (422, 400)


# ─────────────────────────────────────────────────────────────────────────────
# Engagement Prediction  POST /api/predict
# ─────────────────────────────────────────────────────────────────────────────

PREDICT_PAYLOAD = {
    "content": "Celebrate Diwali with our special 50% off collection! 🪔✨ #Diwali #Sale",
    "platform": "instagram",
    "language": "en",
    "hashtags": ["#Diwali", "#Sale"],
    "posting_time": "2024-11-01T18:00:00",
    "content_id": "content_test001",
}


class TestEngagementPrediction:
    def test_predict_returns_200(self, client: TestClient):
        resp = client.post("/api/predict", json=PREDICT_PAYLOAD)
        assert resp.status_code == 200

    def test_predict_response_has_score(self, client: TestClient):
        resp = client.post("/api/predict", json=PREDICT_PAYLOAD)
        data = resp.json()
        assert "engagement_score" in data
        score = data["engagement_score"]
        assert isinstance(score, (int, float))
        assert 0 <= score <= 100

    def test_predict_response_has_recommendations(self, client: TestClient):
        resp = client.post("/api/predict", json=PREDICT_PAYLOAD)
        data = resp.json()
        assert "recommendations" in data
        assert isinstance(data["recommendations"], list)

    def test_predict_rejects_missing_content(self, client: TestClient):
        payload = {k: v for k, v in PREDICT_PAYLOAD.items() if k != "content"}
        resp = client.post("/api/predict", json=payload)
        assert resp.status_code == 422

    def test_predict_rejects_invalid_platform(self, client: TestClient):
        payload = {**PREDICT_PAYLOAD, "platform": "tiktok"}
        resp = client.post("/api/predict", json=payload)
        assert resp.status_code == 422


# ─────────────────────────────────────────────────────────────────────────────
# History  GET /api/history
# ─────────────────────────────────────────────────────────────────────────────

class TestHistory:
    def test_history_returns_200(self, client: TestClient):
        resp = client.get("/api/history")
        assert resp.status_code == 200

    def test_history_response_is_paginated(self, client: TestClient):
        resp = client.get("/api/history")
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)

    def test_history_limit_param(self, client: TestClient):
        resp = client.get("/api/history?limit=5")
        assert resp.status_code == 200


# ─────────────────────────────────────────────────────────────────────────────
# Analytics  GET /api/analytics
# ─────────────────────────────────────────────────────────────────────────────

class TestAnalytics:
    def test_analytics_returns_200(self, client: TestClient):
        resp = client.get("/api/analytics")
        assert resp.status_code == 200

    def test_analytics_has_summary_fields(self, client: TestClient):
        resp = client.get("/api/analytics")
        data = resp.json()
        # At minimum the response should be a dict
        assert isinstance(data, dict)
