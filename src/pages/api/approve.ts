import type { NextApiRequest, NextApiResponse } from 'next';
import type { ApprovalAction } from '../../../types';
import { getUserIdFromRequest } from '../../../utils/auth';

// In-memory storage for demo (in production, use DynamoDB)
const approvedContentStore: ApprovalAction[] = [];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApprovalAction | ApprovalAction[] | { error: string }>
) {
  if (req.method === 'GET') {
    // Return all approved content
    return res.status(200).json(approvedContentStore);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { contentId, variantId, action, editedContent, feedback } = req.body;

    if (!contentId || !variantId || !action) {
      return res.status(400).json({ error: 'contentId, variantId, and action are required' });
    }

    if (!['approve', 'reject', 'edit'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve, reject, or edit' });
    }

    // Extract user ID from JWT token if authenticated
    const userId = getUserIdFromRequest(req);

    const approvalAction: ApprovalAction = {
      contentId,
      variantId,
      action,
      editedContent: action === 'edit' ? editedContent : undefined,
      feedback,
      approvedAt: new Date().toISOString(),
      userId: userId || undefined,
    };

    // Store the approval action
    // Remove any existing action for this variant
    const existingIndex = approvedContentStore.findIndex(
      a => a.contentId === contentId && a.variantId === variantId
    );
    if (existingIndex > -1) {
      approvedContentStore[existingIndex] = approvalAction;
    } else {
      approvedContentStore.push(approvalAction);
    }

    // In production: Save to DynamoDB
    // await dynamoDB.put({ TableName: 'Approvals', Item: approvalAction });

    // In production: If approved, trigger Step Functions workflow for publishing
    // if (action === 'approve') {
    //   await stepFunctions.startExecution({ ... });
    // }

    res.status(200).json(approvalAction);
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ error: 'Failed to process approval' });
  }
}
