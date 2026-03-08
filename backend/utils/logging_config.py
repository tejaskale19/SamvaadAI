"""
Structured JSON logging configuration for SAMVAAD AI
Outputs JSON records compatible with AWS CloudWatch Insights.
"""

import json
import logging
import time
import traceback
from datetime import datetime, timezone
from typing import Any, Dict


class JsonFormatter(logging.Formatter):
    """
    Formats log records as newline-delimited JSON.

    Every record includes:
      timestamp  – ISO-8601 UTC
      level      – DEBUG / INFO / WARNING / ERROR / CRITICAL
      logger     – logger name (module path)
      message    – formatted message
      service    – "samvaad-ai-backend"
      environment – value from settings
      + optional exception / extra fields
    """

    def __init__(self, service: str = "samvaad-ai-backend", environment: str = "development"):
        super().__init__()
        self.service = service
        self.environment = environment

    def format(self, record: logging.LogRecord) -> str:
        payload: Dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "service": self.service,
            "environment": self.environment,
        }

        # Attach exception info if present
        if record.exc_info:
            payload["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]),
                "traceback": traceback.format_exception(*record.exc_info),
            }

        # Merge any extra fields the caller passed
        for key, value in record.__dict__.items():
            if key not in {
                "name", "msg", "args", "levelname", "levelno", "pathname",
                "filename", "module", "exc_info", "exc_text", "stack_info",
                "lineno", "funcName", "created", "msecs", "relativeCreated",
                "thread", "threadName", "processName", "process", "message",
                "taskName",
            } and not key.startswith("_"):
                payload[key] = value

        return json.dumps(payload, default=str)


def configure_logging(service: str = "samvaad-ai-backend", environment: str = "development") -> None:
    """
    Replace the root handler with a JSON formatter.
    Call once at application startup (before any loggers are created).
    """
    root = logging.getLogger()

    # Remove existing handlers to avoid duplicate output
    for handler in root.handlers[:]:
        root.removeHandler(handler)

    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter(service=service, environment=environment))
    root.addHandler(handler)
    root.setLevel(logging.INFO)

    # Suppress overly chatty third-party loggers in production
    logging.getLogger("botocore").setLevel(logging.WARNING)
    logging.getLogger("boto3").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
