"""
Step Functions Service for SAMVAAD AI
Orchestrates the AI content generation workflow pipeline
"""

import boto3
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from botocore.exceptions import ClientError
import uuid

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class StepFunctionsService:
    """Service for AWS Step Functions workflow orchestration"""
    
    def __init__(self):
        """Initialize Step Functions client"""
        self.client = boto3.client(
            "stepfunctions",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        self.state_machine_arn = settings.STEP_FUNCTION_ARN
        self.enabled = bool(self.state_machine_arn)
        
        if not self.enabled:
            logger.warning("Step Functions ARN not configured. Using local workflow.")
    
    def get_workflow_definition(self) -> Dict[str, Any]:
        """
        Get the Step Functions state machine definition for SAMVAAD AI pipeline
        
        Workflow Steps:
        1. Prompt Input - Validate and prepare user prompt
        2. Content Generation - Generate content using Bedrock/Llama 3
        3. Platform Optimization - Optimize for target platform
        4. Translation - Translate to regional languages if needed
        5. Engagement Scoring - Predict engagement metrics
        6. Human Approval - Wait for user approval
        """
        return {
            "Comment": "SAMVAAD AI Content Generation Pipeline",
            "StartAt": "ValidateInput",
            "States": {
                "ValidateInput": {
                    "Type": "Task",
                    "Resource": "arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT}:function:samvaad-validate-input",
                    "Parameters": {
                        "prompt.$": "$.prompt",
                        "platform.$": "$.platform",
                        "user_id.$": "$.user_id",
                        "options.$": "$.options"
                    },
                    "ResultPath": "$.validation",
                    "Next": "GenerateContent",
                    "Catch": [{
                        "ErrorEquals": ["ValidationError"],
                        "ResultPath": "$.error",
                        "Next": "HandleError"
                    }]
                },
                "GenerateContent": {
                    "Type": "Task",
                    "Resource": "arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT}:function:samvaad-generate-content",
                    "Parameters": {
                        "prompt.$": "$.validation.cleaned_prompt",
                        "platform.$": "$.platform",
                        "cultural_context.$": "$.options.cultural_context",
                        "num_variants.$": "$.options.num_variants"
                    },
                    "ResultPath": "$.generated",
                    "Next": "OptimizeForPlatform",
                    "Retry": [{
                        "ErrorEquals": ["BedrockThrottling"],
                        "IntervalSeconds": 2,
                        "MaxAttempts": 3,
                        "BackoffRate": 2
                    }],
                    "Catch": [{
                        "ErrorEquals": ["States.ALL"],
                        "ResultPath": "$.error",
                        "Next": "HandleError"
                    }]
                },
                "OptimizeForPlatform": {
                    "Type": "Task",
                    "Resource": "arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT}:function:samvaad-optimize-platform",
                    "Parameters": {
                        "variants.$": "$.generated.variants",
                        "platform.$": "$.platform"
                    },
                    "ResultPath": "$.optimized",
                    "Next": "CheckTranslationNeeded"
                },
                "CheckTranslationNeeded": {
                    "Type": "Choice",
                    "Choices": [{
                        "Variable": "$.options.target_language",
                        "IsPresent": True,
                        "Next": "TranslateContent"
                    }],
                    "Default": "PredictEngagement"
                },
                "TranslateContent": {
                    "Type": "Task",
                    "Resource": "arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT}:function:samvaad-translate",
                    "Parameters": {
                        "variants.$": "$.optimized.variants",
                        "source_language": "en",
                        "target_language.$": "$.options.target_language"
                    },
                    "ResultPath": "$.translated",
                    "Next": "PredictEngagement"
                },
                "PredictEngagement": {
                    "Type": "Task",
                    "Resource": "arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT}:function:samvaad-predict-engagement",
                    "Parameters": {
                        "variants.$": "$.optimized.variants",
                        "platform.$": "$.platform",
                        "posting_time.$": "$.options.posting_time"
                    },
                    "ResultPath": "$.engagement",
                    "Next": "SaveDraft"
                },
                "SaveDraft": {
                    "Type": "Task",
                    "Resource": "arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT}:function:samvaad-save-draft",
                    "Parameters": {
                        "user_id.$": "$.user_id",
                        "content.$": "$.optimized",
                        "engagement.$": "$.engagement",
                        "platform.$": "$.platform",
                        "prompt.$": "$.prompt"
                    },
                    "ResultPath": "$.saved",
                    "Next": "AwaitApproval"
                },
                "AwaitApproval": {
                    "Type": "Task",
                    "Resource": "arn:aws:states:::sqs:sendMessage.waitForTaskToken",
                    "Parameters": {
                        "QueueUrl": "arn:aws:sqs:${AWS_REGION}:${AWS_ACCOUNT}:samvaad-approval-queue",
                        "MessageBody": {
                            "content_id.$": "$.saved.content_id",
                            "variants.$": "$.optimized.variants",
                            "engagement.$": "$.engagement",
                            "task_token.$": "$$.Task.Token"
                        }
                    },
                    "ResultPath": "$.approval",
                    "Next": "ProcessApproval",
                    "TimeoutSeconds": 604800,
                    "Catch": [{
                        "ErrorEquals": ["States.Timeout"],
                        "ResultPath": "$.error",
                        "Next": "HandleTimeout"
                    }]
                },
                "ProcessApproval": {
                    "Type": "Choice",
                    "Choices": [{
                        "Variable": "$.approval.action",
                        "StringEquals": "approve",
                        "Next": "ScheduleOrPublish"
                    }, {
                        "Variable": "$.approval.action",
                        "StringEquals": "reject",
                        "Next": "HandleRejection"
                    }],
                    "Default": "HandleRejection"
                },
                "ScheduleOrPublish": {
                    "Type": "Choice",
                    "Choices": [{
                        "Variable": "$.approval.schedule_time",
                        "IsPresent": True,
                        "Next": "SchedulePost"
                    }],
                    "Default": "PublishContent"
                },
                "SchedulePost": {
                    "Type": "Task",
                    "Resource": "arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT}:function:samvaad-schedule-post",
                    "Parameters": {
                        "content_id.$": "$.saved.content_id",
                        "schedule_time.$": "$.approval.schedule_time",
                        "platform.$": "$.platform"
                    },
                    "Next": "WorkflowComplete"
                },
                "PublishContent": {
                    "Type": "Task",
                    "Resource": "arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT}:function:samvaad-publish",
                    "Parameters": {
                        "content_id.$": "$.saved.content_id",
                        "platform.$": "$.platform"
                    },
                    "Next": "WorkflowComplete"
                },
                "HandleRejection": {
                    "Type": "Task",
                    "Resource": "arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT}:function:samvaad-handle-rejection",
                    "Parameters": {
                        "content_id.$": "$.saved.content_id",
                        "feedback.$": "$.approval.feedback"
                    },
                    "Next": "WorkflowComplete"
                },
                "HandleError": {
                    "Type": "Task",
                    "Resource": "arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT}:function:samvaad-handle-error",
                    "Parameters": {
                        "error.$": "$.error",
                        "execution_id.$": "$$.Execution.Id"
                    },
                    "Next": "WorkflowFailed"
                },
                "HandleTimeout": {
                    "Type": "Pass",
                    "Result": {
                        "status": "timeout",
                        "message": "Approval timed out after 7 days"
                    },
                    "ResultPath": "$.timeout",
                    "Next": "WorkflowComplete"
                },
                "WorkflowComplete": {
                    "Type": "Succeed"
                },
                "WorkflowFailed": {
                    "Type": "Fail",
                    "Error": "WorkflowError",
                    "Cause": "An error occurred in the content generation pipeline"
                }
            }
        }
    
    async def start_workflow(
        self,
        user_id: str,
        prompt: str,
        platform: str,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Start a new content generation workflow
        
        Args:
            user_id: User ID
            prompt: Content generation prompt
            platform: Target platform
            options: Additional options (cultural_context, target_language, etc.)
            
        Returns:
            Execution details
        """
        if not self.enabled:
            return await self._run_local_workflow(user_id, prompt, platform, options)
        
        try:
            execution_name = f"samvaad-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:8]}"
            
            workflow_input = {
                "user_id": user_id,
                "prompt": prompt,
                "platform": platform,
                "options": options or {},
                "started_at": datetime.utcnow().isoformat(),
            }
            
            response = self.client.start_execution(
                stateMachineArn=self.state_machine_arn,
                name=execution_name,
                input=json.dumps(workflow_input),
            )
            
            return {
                "success": True,
                "execution_arn": response["executionArn"],
                "execution_name": execution_name,
                "started_at": response["startDate"].isoformat(),
            }
            
        except ClientError as e:
            logger.error(f"Step Functions start error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_execution_status(self, execution_arn: str) -> Dict[str, Any]:
        """Get status of workflow execution"""
        if not self.enabled:
            return {"status": "local_mode", "message": "Step Functions not configured"}
        
        try:
            response = self.client.describe_execution(executionArn=execution_arn)
            
            result = {
                "success": True,
                "status": response["status"],
                "started_at": response["startDate"].isoformat(),
            }
            
            if response.get("stopDate"):
                result["stopped_at"] = response["stopDate"].isoformat()
            
            if response.get("output"):
                result["output"] = json.loads(response["output"])
            
            if response.get("error"):
                result["error"] = response["error"]
            
            return result
            
        except ClientError as e:
            logger.error(f"Step Functions describe error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_execution_history(self, execution_arn: str) -> Dict[str, Any]:
        """Get execution history with all state transitions"""
        if not self.enabled:
            return {"events": [], "message": "Step Functions not configured"}
        
        try:
            response = self.client.get_execution_history(
                executionArn=execution_arn,
                maxResults=100,
            )
            
            events = []
            for event in response.get("events", []):
                events.append({
                    "id": event["id"],
                    "type": event["type"],
                    "timestamp": event["timestamp"].isoformat(),
                })
            
            return {"success": True, "events": events}
            
        except ClientError as e:
            logger.error(f"Step Functions history error: {e}")
            return {"success": False, "error": str(e)}
    
    async def send_approval(
        self,
        task_token: str,
        action: str,
        variant_id: Optional[str] = None,
        feedback: Optional[str] = None,
        schedule_time: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send approval decision to waiting workflow
        
        Args:
            task_token: Task token from approval request
            action: 'approve' or 'reject'
            variant_id: Selected variant ID (if approved)
            feedback: Optional feedback
            schedule_time: Optional schedule time for publishing
        """
        if not self.enabled:
            return {"success": True, "message": "Approval processed (local mode)"}
        
        try:
            output = {
                "action": action,
                "variant_id": variant_id,
                "feedback": feedback,
                "schedule_time": schedule_time,
                "processed_at": datetime.utcnow().isoformat(),
            }
            
            if action == "approve":
                self.client.send_task_success(
                    taskToken=task_token,
                    output=json.dumps(output),
                )
            else:
                self.client.send_task_failure(
                    taskToken=task_token,
                    error="Rejected",
                    cause=feedback or "Content rejected by user",
                )
            
            return {"success": True, "action": action}
            
        except ClientError as e:
            logger.error(f"Step Functions approval error: {e}")
            return {"success": False, "error": str(e)}
    
    async def stop_execution(
        self,
        execution_arn: str,
        reason: str = "Stopped by user"
    ) -> Dict[str, Any]:
        """Stop a running workflow execution"""
        if not self.enabled:
            return {"success": True, "message": "Execution stopped (local mode)"}
        
        try:
            self.client.stop_execution(
                executionArn=execution_arn,
                cause=reason,
            )
            return {"success": True, "message": "Execution stopped"}
            
        except ClientError as e:
            logger.error(f"Step Functions stop error: {e}")
            return {"success": False, "error": str(e)}
    
    async def _run_local_workflow(
        self,
        user_id: str,
        prompt: str,
        platform: str,
        options: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Run workflow locally when Step Functions is not configured"""
        from .bedrock_service import bedrock_service
        from .engagement_service import engagement_service
        from .translate_service import translate_service
        from .dynamodb_service import dynamodb_service
        
        workflow_id = f"local_{uuid.uuid4().hex[:12]}"
        options = options or {}
        
        try:
            # Step 1: Generate content
            logger.info(f"[{workflow_id}] Step 1: Generating content")
            content_result = await bedrock_service.generate_content(
                prompt=prompt,
                platform=platform,
                cultural_context=options.get("cultural_context"),
                target_audience=options.get("target_audience"),
                num_variants=options.get("num_variants", 3),
            )
            
            if not content_result.get("success") and not content_result.get("variants"):
                return {"success": False, "error": "Content generation failed"}
            
            variants = content_result.get("variants", [])
            content_id = content_result.get("content_id", workflow_id)
            
            # Step 2: Translate if needed
            target_language = options.get("target_language")
            if target_language and target_language != "en":
                logger.info(f"[{workflow_id}] Step 2: Translating to {target_language}")
                for variant in variants:
                    trans_result = await translate_service.translate(
                        text=variant["content"],
                        target_language=target_language,
                    )
                    if trans_result.get("success"):
                        variant["translated_content"] = trans_result["translated_content"]
                        variant["translation_language"] = target_language
            
            # Step 3: Predict engagement
            logger.info(f"[{workflow_id}] Step 3: Predicting engagement")
            for variant in variants:
                content = variant.get("translated_content", variant["content"])
                engagement = await engagement_service.predict_engagement(
                    content=content,
                    platform=platform,
                    hashtags=variant.get("hashtags", []),
                )
                variant["engagement_score"] = engagement.get("score")
                variant["engagement_factors"] = engagement.get("factors")
                variant["recommendations"] = engagement.get("recommendations", [])
            
            # Sort variants by engagement score
            variants.sort(key=lambda x: x.get("engagement_score", 0), reverse=True)
            
            # Step 4: Save to database
            logger.info(f"[{workflow_id}] Step 4: Saving draft")
            save_result = await dynamodb_service.save_content({
                "content_id": content_id,
                "user_id": user_id,
                "prompt": prompt,
                "platform": platform,
                "variants": variants,
                "status": "pending",
                "metadata": {
                    "cultural_context": options.get("cultural_context"),
                    "target_language": target_language,
                    "workflow_id": workflow_id,
                }
            })
            
            return {
                "success": True,
                "workflow_id": workflow_id,
                "content_id": content_id,
                "variants": variants,
                "status": "pending_approval",
                "message": "Content generated and saved. Awaiting approval.",
                "is_local": True,
            }
            
        except Exception as e:
            logger.error(f"Local workflow error: {e}")
            return {"success": False, "error": str(e)}


# Create singleton instance
stepfunctions_service = StepFunctionsService()
