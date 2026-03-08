"""
Routes package for SAMVAAD AI
Contains all API endpoint routers
"""

from .generate import router as generate_router
from .translate import router as translate_router
from .predict import router as predict_router
from .approve import router as approve_router
from .history import router as history_router
from .auth import router as auth_router
from .analytics import router as analytics_router
from .trends import router as trends_router
from .publish import router as publish_router

__all__ = [
    "generate_router",
    "translate_router",
    "predict_router",
    "approve_router",
    "history_router",
    "auth_router",
    "analytics_router",
    "trends_router",
    "publish_router",
]
