"""
Content Approval Route for SAMVAAD AI
POST /approve - Approve or reject generated content
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from datetime import datetime
from typing import Optional
import logging

from models.content_model import ApprovalRequest, ApprovalResponse, ContentStatus
from services.dynamodb_service import dynamodb_service
from services.stepfunctions_service import stepfunctions_service
from routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/approve", tags=["Content Approval"])


@router.post("", response_model=ApprovalResponse)
async def approve_content(
    request: ApprovalRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """
    Approve or reject generated content
    
    Actions:
    - approve: Mark content for publishing (immediate or scheduled)
    - reject: Reject content with optional feedback
    
    Features:
    - Select specific variant for publishing
    - Schedule for future publishing
    - Provide feedback for rejected content
    """
    user_id = user.get("user_id", "demo_user")
    
    try:
        logger.info(f"Approving content {request.content_id}, action={request.action}, variant={request.variant_id}")
        
        # Get existing content
        content = await dynamodb_service.get_content(request.content_id)
        
        if not content:
            logger.warning(f"Content not found in DynamoDB: {request.content_id}")
            raise HTTPException(
                status_code=404,
                detail=f"Content not found: {request.content_id}"
            )
        
        # Verify ownership
        if content.get("user_id") != user_id and user_id != "demo_user":
            raise HTTPException(
                status_code=403,
                detail="Not authorized to modify this content"
            )
        
        # Process approval/rejection
        if request.action == "approve":
            new_status = ContentStatus.SCHEDULED if request.schedule_time else ContentStatus.APPROVED
            
            updates = {
                "status": new_status.value,
                "selected_variant_id": request.variant_id,
                "approved_at": datetime.utcnow().isoformat(),
                "approved_by": user_id,
            }
            
            if request.schedule_time:
                updates["scheduled_time"] = request.schedule_time.isoformat()
                
                # Create scheduled post entry
                background_tasks.add_task(
                    schedule_post,
                    request.content_id,
                    user_id,
                    content.get("platform"),
                    request.schedule_time
                )
            
            if request.feedback:
                updates["approval_feedback"] = request.feedback
            
        else:  # reject
            new_status = ContentStatus.REJECTED
            updates = {
                "status": new_status.value,
                "rejected_at": datetime.utcnow().isoformat(),
                "rejected_by": user_id,
                "rejection_feedback": request.feedback,
            }
        
        # Update content in database
        result = await dynamodb_service.update_content(request.content_id, updates)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail="Failed to update content status"
            )
        
        return ApprovalResponse(
            content_id=request.content_id,
            status=new_status,
            approved_at=datetime.utcnow() if request.action == "approve" else None,
            scheduled_time=request.schedule_time,
            message=f"Content {'approved' if request.action == 'approve' else 'rejected'} successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Approval error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Approval failed: {str(e)}"
        )


@router.post("/workflow")
async def send_workflow_approval(
    task_token: str,
    action: str,
    variant_id: Optional[str] = None,
    feedback: Optional[str] = None,
    schedule_time: Optional[datetime] = None,
    user: dict = Depends(get_current_user)
):
    """
    Send approval decision for Step Functions workflow
    
    Used when content is generated through the workflow pipeline
    and is waiting for human approval
    """
    if action not in ["approve", "reject"]:
        raise HTTPException(
            status_code=400,
            detail="Action must be 'approve' or 'reject'"
        )
    
    result = await stepfunctions_service.send_approval(
        task_token=task_token,
        action=action,
        variant_id=variant_id,
        feedback=feedback,
        schedule_time=schedule_time.isoformat() if schedule_time else None,
    )
    
    if not result.get("success"):
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Failed to process approval")
        )
    
    return result


@router.get("/pending")
async def get_pending_approvals(
    limit: int = 20,
    user: dict = Depends(get_current_user)
):
    """Get all content pending approval for the user"""
    user_id = user.get("user_id", "demo_user")
    
    result = await dynamodb_service.get_user_content(
        user_id=user_id,
        status="pending",
        limit=limit
    )
    
    return {
        "items": result.get("items", []),
        "total": result.get("total", 0),
        "message": f"Found {result.get('total', 0)} items pending approval"
    }


@router.post("/{content_id}/select-variant")
async def select_variant(
    content_id: str,
    variant_id: str,
    user: dict = Depends(get_current_user)
):
    """Select a specific variant without approving yet"""
    user_id = user.get("user_id", "demo_user")
    
    content = await dynamodb_service.get_content(content_id)
    
    if not content:
        raise HTTPException(
            status_code=404,
            detail="Content not found"
        )
    
    # Verify variant exists
    variants = content.get("variants", [])
    variant_exists = any(v.get("variant_id") == variant_id for v in variants)
    
    if not variant_exists:
        raise HTTPException(
            status_code=400,
            detail=f"Variant not found: {variant_id}"
        )
    
    # Update selected variant
    result = await dynamodb_service.update_content(
        content_id,
        {"selected_variant_id": variant_id}
    )
    
    return {
        "success": result.get("success", False),
        "content_id": content_id,
        "selected_variant_id": variant_id,
    }


async def schedule_post(
    content_id: str,
    user_id: str,
    platform: str,
    schedule_time: datetime
):
    """Background task to schedule a post"""
    try:
        await dynamodb_service.schedule_post({
            "content_id": content_id,
            "user_id": user_id,
            "platform": platform,
            "scheduled_time": schedule_time.isoformat(),
        })
        logger.info(f"Post scheduled: {content_id} at {schedule_time}")
    except Exception as e:
        logger.error(f"Failed to schedule post: {e}")
