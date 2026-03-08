"""
Rate-limiting FastAPI dependency for SAMVAAD AI.

Uses Redis sliding-window counters (already implemented in RedisService).
Falls back to allow-all when Redis is unavailable so the service stays up.
"""

import logging
from fastapi import Depends, HTTPException, Request, status

from services.redis_service import redis_service
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _client_identifier(request: Request) -> str:
    """
    Return a string that uniquely identifies the caller for rate-limit
    bucketing. Prefers the authenticated user-id written into request.state
    (set by get_current_user), falls back to the real client IP address.
    """
    user_id: str | None = getattr(request.state, "user_id", None)
    if user_id:
        return f"uid:{user_id}"
    # Respect X-Forwarded-For when behind a proxy / ALB
    forwarded = request.headers.get("x-forwarded-for")
    ip = forwarded.split(",")[0].strip() if forwarded else request.client.host
    return f"ip:{ip}"


def rate_limit(
    requests_per_window: int = None,
    window_seconds: int = None,
):
    """
    Returns a FastAPI dependency that enforces a sliding-window rate limit.

    Args:
        requests_per_window: Max requests allowed per window (defaults to settings).
        window_seconds: Window duration in seconds (defaults to settings).

    Usage:
        @router.post("", dependencies=[Depends(rate_limit(10, 60))])
        async def my_endpoint(...):
            ...
    """
    _limit = requests_per_window or settings.RATE_LIMIT_REQUESTS
    _window = window_seconds or settings.RATE_LIMIT_PERIOD

    async def _dependency(request: Request):
        identifier = _client_identifier(request)
        result = await redis_service.check_rate_limit(identifier, _limit, _window)

        if not result.get("allowed"):
            retry_after = result.get("retry_after", _window)
            logger.warning(
                "Rate limit exceeded",
                extra={
                    "identifier": identifier,
                    "limit": _limit,
                    "window": _window,
                    "retry_after": retry_after,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "rate_limit_exceeded",
                    "message": f"Too many requests. Retry after {retry_after}s.",
                    "retry_after": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )

        # Expose remaining quota in response headers via middleware
        request.state.rate_limit_remaining = result.get("remaining", _limit)

    return _dependency
