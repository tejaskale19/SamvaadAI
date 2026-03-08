"""
Amazon CloudWatch Logging Service for SAMVAAD AI
Centralized logging, metrics, and monitoring
"""

import boto3
import json
import logging
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from botocore.exceptions import ClientError
from functools import wraps

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class CloudWatchService:
    """Service for Amazon CloudWatch logging and metrics"""
    
    def __init__(self):
        """Initialize CloudWatch clients"""
        self.enabled = False
        self.log_group_name = getattr(settings, 'CLOUDWATCH_LOG_GROUP', '/samvaad-ai/backend')
        
        try:
            self.logs_client = boto3.client(
                "logs",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
            
            self.metrics_client = boto3.client(
                "cloudwatch",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
            
            # Try to create log group if it doesn't exist
            self._ensure_log_group()
            self.enabled = True
            logger.info(f"CloudWatch logging enabled: {self.log_group_name}")
            
        except Exception as e:
            logger.warning(f"CloudWatch initialization failed: {e}. Using local logging only.")
            self.enabled = False
        
        # Log stream names for different components
        self.log_streams = {
            "api": "api-requests",
            "generation": "content-generation",
            "translation": "translation",
            "engagement": "engagement-prediction",
            "auth": "authentication",
            "errors": "errors",
        }
        
        self.sequence_tokens = {}
    
    def _ensure_log_group(self):
        """Ensure the CloudWatch log group exists"""
        try:
            self.logs_client.create_log_group(
                logGroupName=self.log_group_name,
                tags={
                    "Application": "SAMVAAD-AI",
                    "Environment": settings.ENVIRONMENT,
                }
            )
            logger.info(f"Created CloudWatch log group: {self.log_group_name}")
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceAlreadyExistsException':
                pass  # Log group already exists
            else:
                raise
        
        # Create log streams
        for stream_name in self.log_streams.values():
            try:
                self.logs_client.create_log_stream(
                    logGroupName=self.log_group_name,
                    logStreamName=stream_name
                )
            except ClientError as e:
                if e.response['Error']['Code'] == 'ResourceAlreadyExistsException':
                    pass
    
    def _get_timestamp_ms(self) -> int:
        """Get current timestamp in milliseconds"""
        return int(time.time() * 1000)
    
    async def log_event(
        self,
        stream: str,
        message: str,
        level: str = "INFO",
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Log an event to CloudWatch
        
        Args:
            stream: Log stream key (api, generation, translation, etc.)
            message: Log message
            level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            metadata: Additional metadata to log
            
        Returns:
            Success status
        """
        if not self.enabled:
            # Fallback to local logging
            log_func = getattr(logger, level.lower(), logger.info)
            log_func(f"[{stream}] {message} | {metadata}")
            return True
        
        try:
            log_stream_name = self.log_streams.get(stream, "api-requests")
            
            log_entry = {
                "timestamp": datetime.utcnow().isoformat(),
                "level": level,
                "message": message,
                "environment": settings.ENVIRONMENT,
            }
            
            if metadata:
                log_entry["metadata"] = metadata
            
            log_events = [
                {
                    "timestamp": self._get_timestamp_ms(),
                    "message": json.dumps(log_entry, default=str)
                }
            ]
            
            kwargs = {
                "logGroupName": self.log_group_name,
                "logStreamName": log_stream_name,
                "logEvents": log_events,
            }
            
            # Include sequence token if we have one
            if log_stream_name in self.sequence_tokens:
                kwargs["sequenceToken"] = self.sequence_tokens[log_stream_name]
            
            response = self.logs_client.put_log_events(**kwargs)
            
            # Store the next sequence token
            self.sequence_tokens[log_stream_name] = response.get("nextSequenceToken")
            
            return True
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            
            if error_code == 'InvalidSequenceTokenException':
                # Get the correct token and retry
                expected_token = e.response['Error'].get('expectedSequenceToken')
                if expected_token:
                    self.sequence_tokens[log_stream_name] = expected_token
                    return await self.log_event(stream, message, level, metadata)
            
            logger.error(f"CloudWatch log error: {e}")
            return False
    
    async def log_api_request(
        self,
        endpoint: str,
        method: str,
        user_id: Optional[str],
        request_id: str,
        status_code: int,
        response_time_ms: float,
        error: Optional[str] = None
    ) -> bool:
        """Log API request to CloudWatch"""
        message = f"{method} {endpoint} - {status_code} ({response_time_ms:.2f}ms)"
        
        return await self.log_event(
            stream="api",
            message=message,
            level="ERROR" if status_code >= 500 else "INFO",
            metadata={
                "endpoint": endpoint,
                "method": method,
                "user_id": user_id,
                "request_id": request_id,
                "status_code": status_code,
                "response_time_ms": response_time_ms,
                "error": error,
            }
        )
    
    async def log_content_generation(
        self,
        user_id: str,
        prompt: str,
        platform: str,
        num_variants: int,
        success: bool,
        generation_time_ms: float,
        provider: str = "bedrock"
    ) -> bool:
        """Log content generation event"""
        return await self.log_event(
            stream="generation",
            message=f"Content generated for {platform}",
            level="INFO" if success else "ERROR",
            metadata={
                "user_id": user_id,
                "prompt_length": len(prompt),
                "platform": platform,
                "num_variants": num_variants,
                "success": success,
                "generation_time_ms": generation_time_ms,
                "provider": provider,
            }
        )
    
    async def log_translation(
        self,
        user_id: str,
        source_language: str,
        target_language: str,
        content_length: int,
        success: bool,
        translation_time_ms: float
    ) -> bool:
        """Log translation event"""
        return await self.log_event(
            stream="translation",
            message=f"Translation {source_language} -> {target_language}",
            level="INFO" if success else "ERROR",
            metadata={
                "user_id": user_id,
                "source_language": source_language,
                "target_language": target_language,
                "content_length": content_length,
                "success": success,
                "translation_time_ms": translation_time_ms,
            }
        )
    
    async def log_engagement_prediction(
        self,
        user_id: str,
        platform: str,
        engagement_score: float,
        model_version: str,
        prediction_time_ms: float
    ) -> bool:
        """Log engagement prediction event"""
        return await self.log_event(
            stream="engagement",
            message=f"Engagement predicted: {engagement_score}",
            level="INFO",
            metadata={
                "user_id": user_id,
                "platform": platform,
                "engagement_score": engagement_score,
                "model_version": model_version,
                "prediction_time_ms": prediction_time_ms,
            }
        )
    
    async def log_error(
        self,
        error_type: str,
        error_message: str,
        stack_trace: Optional[str] = None,
        user_id: Optional[str] = None,
        endpoint: Optional[str] = None
    ) -> bool:
        """Log error event"""
        return await self.log_event(
            stream="errors",
            message=f"[{error_type}] {error_message}",
            level="ERROR",
            metadata={
                "error_type": error_type,
                "error_message": error_message,
                "stack_trace": stack_trace,
                "user_id": user_id,
                "endpoint": endpoint,
            }
        )
    
    async def put_metric(
        self,
        metric_name: str,
        value: float,
        unit: str = "Count",
        dimensions: Optional[List[Dict[str, str]]] = None
    ) -> bool:
        """
        Put a custom metric to CloudWatch
        
        Args:
            metric_name: Name of the metric
            value: Metric value
            unit: Unit of measurement (Count, Seconds, Milliseconds, etc.)
            dimensions: List of dimension dicts with Name/Value keys
            
        Returns:
            Success status
        """
        if not self.enabled:
            logger.info(f"Metric: {metric_name} = {value} {unit}")
            return True
        
        try:
            metric_data = {
                "MetricName": metric_name,
                "Value": value,
                "Unit": unit,
                "Timestamp": datetime.utcnow(),
            }
            
            if dimensions:
                metric_data["Dimensions"] = dimensions
            else:
                metric_data["Dimensions"] = [
                    {"Name": "Application", "Value": "SAMVAAD-AI"},
                    {"Name": "Environment", "Value": settings.ENVIRONMENT},
                ]
            
            self.metrics_client.put_metric_data(
                Namespace="SAMVAAD-AI",
                MetricData=[metric_data]
            )
            
            return True
            
        except ClientError as e:
            logger.error(f"CloudWatch metric error: {e}")
            return False
    
    async def put_api_metrics(
        self,
        endpoint: str,
        response_time_ms: float,
        is_error: bool = False
    ) -> None:
        """Put API-related metrics"""
        dimensions = [
            {"Name": "Endpoint", "Value": endpoint},
            {"Name": "Environment", "Value": settings.ENVIRONMENT},
        ]
        
        await self.put_metric(
            metric_name="APILatency",
            value=response_time_ms,
            unit="Milliseconds",
            dimensions=dimensions
        )
        
        await self.put_metric(
            metric_name="APIRequestCount",
            value=1,
            unit="Count",
            dimensions=dimensions
        )
        
        if is_error:
            await self.put_metric(
                metric_name="APIErrorCount",
                value=1,
                unit="Count",
                dimensions=dimensions
            )
    
    async def put_generation_metrics(
        self,
        platform: str,
        generation_time_ms: float,
        provider: str
    ) -> None:
        """Put content generation metrics"""
        dimensions = [
            {"Name": "Platform", "Value": platform},
            {"Name": "Provider", "Value": provider},
        ]
        
        await self.put_metric(
            metric_name="ContentGenerationTime",
            value=generation_time_ms,
            unit="Milliseconds",
            dimensions=dimensions
        )
        
        await self.put_metric(
            metric_name="ContentGenerationCount",
            value=1,
            unit="Count",
            dimensions=dimensions
        )


# Global service instance
cloudwatch_service = CloudWatchService()


# Decorator for automatic request logging
def log_request(stream: str = "api"):
    """Decorator to automatically log requests to CloudWatch"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            request_id = f"req_{int(start_time * 1000)}"
            
            try:
                result = await func(*args, **kwargs)
                elapsed_ms = (time.time() - start_time) * 1000
                
                await cloudwatch_service.log_event(
                    stream=stream,
                    message=f"Function {func.__name__} completed",
                    level="INFO",
                    metadata={
                        "request_id": request_id,
                        "function": func.__name__,
                        "elapsed_ms": elapsed_ms,
                    }
                )
                
                return result
                
            except Exception as e:
                elapsed_ms = (time.time() - start_time) * 1000
                
                await cloudwatch_service.log_error(
                    error_type=type(e).__name__,
                    error_message=str(e),
                    endpoint=func.__name__,
                )
                
                raise
        
        return wrapper
    return decorator
