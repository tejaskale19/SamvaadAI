"""
Retry utility with exponential backoff for AWS service calls
"""

import asyncio
import functools
import logging
import random
from typing import Callable, Tuple, Type, Any

logger = logging.getLogger(__name__)

# AWS transient error codes that are safe to retry
_RETRYABLE_CODES = frozenset({
    "ThrottlingException",
    "RequestThrottledException",
    "TooManyRequestsException",
    "ProvisionedThroughputExceededException",
    "TransactionConflictException",
    "RequestLimitExceeded",
    "ServiceUnavailable",
    "InternalServerError",
    "InternalFailure",
    "ServiceFailure",
    "SlowDown",
    "ModelTimeoutException",
})


def _is_retryable(exc: Exception) -> bool:
    """Return True if the exception looks like a transient AWS error."""
    from botocore.exceptions import ClientError, EndpointConnectionError
    if isinstance(exc, EndpointConnectionError):
        return True
    if isinstance(exc, ClientError):
        code = exc.response.get("Error", {}).get("Code", "")
        return code in _RETRYABLE_CODES
    return False


def with_retry(
    max_attempts: int = 3,
    base_delay: float = 0.5,
    max_delay: float = 10.0,
    jitter: bool = True,
    retryable_exceptions: Tuple[Type[Exception], ...] = (Exception,),
):
    """
    Decorator that adds exponential backoff retry logic to async functions.

    Args:
        max_attempts: Maximum number of total attempts (1 = no retry).
        base_delay: Starting delay in seconds.
        max_delay: Cap on the computed delay.
        jitter: Add ±20 % random jitter to prevent thundering-herd.
        retryable_exceptions: Exception types that trigger a retry.
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            last_exc: Exception | None = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return await func(*args, **kwargs)
                except retryable_exceptions as exc:
                    last_exc = exc
                    # If the error is a known non-retryable ClientError, re-raise immediately
                    from botocore.exceptions import ClientError
                    if isinstance(exc, ClientError) and not _is_retryable(exc):
                        raise
                    if attempt == max_attempts:
                        break
                    delay = min(base_delay * (2 ** (attempt - 1)), max_delay)
                    if jitter:
                        delay *= random.uniform(0.8, 1.2)
                    logger.warning(
                        "Retrying %s (attempt %d/%d) after %.2fs — %s: %s",
                        func.__name__, attempt, max_attempts, delay,
                        type(exc).__name__, exc,
                    )
                    await asyncio.sleep(delay)
            raise last_exc  # type: ignore[misc]
        return wrapper
    return decorator


async def run_in_thread(func: Callable, *args, **kwargs) -> Any:
    """
    Run a synchronous (blocking) function in the default thread-pool executor
    so it does not block the async event loop.

    Usage:
        result = await run_in_thread(sync_boto3_call, arg1, arg2)
    """
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, functools.partial(func, *args, **kwargs))
