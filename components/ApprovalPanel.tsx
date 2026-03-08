import React, { useState } from 'react';
import { CheckCircle, XCircle, Edit3, MessageSquare, Send, Sparkles } from 'lucide-react';
import type { ContentVariant, ApprovalAction } from '../types';

interface ApprovalPanelProps {
  variant: ContentVariant;
  onApprove: (action: ApprovalAction) => void;
  isLoading?: boolean;
}

export default function ApprovalPanel({ variant, onApprove, isLoading = false }: ApprovalPanelProps) {
  const [action, setAction] = useState<'approve' | 'reject' | 'edit' | null>(null);
  const [editedContent, setEditedContent] = useState(variant.content);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    if (!action) return;

    const approvalAction: ApprovalAction = {
      contentId: variant.id.split('-')[0],
      variantId: variant.id,
      action,
      editedContent: action === 'edit' ? editedContent : undefined,
      feedback: feedback || undefined,
    };

    onApprove(approvalAction);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white">
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5" />
          <h3 className="font-semibold">Human Approval</h3>
        </div>
        <p className="text-sm text-green-100 mt-1">Review and approve AI-generated content</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Content Preview */}
        <div className="space-y-3">
          <h4 className="font-medium text-slate-700 dark:text-slate-300">Content to Review</h4>
          {action === 'edit' ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-48 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 resize-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
              {variant.content}
            </div>
          )}
        </div>

        {/* Action Selection */}
        <div className="space-y-3">
          <h4 className="font-medium text-slate-700 dark:text-slate-300">Select Action</h4>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setAction('approve')}
              className={`flex flex-col items-center space-y-2 p-4 rounded-xl border-2 transition-all ${
                action === 'approve'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-green-300'
              }`}
            >
              <CheckCircle className={`w-8 h-8 ${action === 'approve' ? 'text-green-500' : 'text-slate-400'}`} />
              <span className={`font-medium ${action === 'approve' ? 'text-green-700 dark:text-green-400' : 'text-slate-600 dark:text-slate-400'}`}>
                Approve
              </span>
            </button>

            <button
              onClick={() => setAction('edit')}
              className={`flex flex-col items-center space-y-2 p-4 rounded-xl border-2 transition-all ${
                action === 'edit'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
              }`}
            >
              <Edit3 className={`w-8 h-8 ${action === 'edit' ? 'text-blue-500' : 'text-slate-400'}`} />
              <span className={`font-medium ${action === 'edit' ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>
                Edit
              </span>
            </button>

            <button
              onClick={() => setAction('reject')}
              className={`flex flex-col items-center space-y-2 p-4 rounded-xl border-2 transition-all ${
                action === 'reject'
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-red-300'
              }`}
            >
              <XCircle className={`w-8 h-8 ${action === 'reject' ? 'text-red-500' : 'text-slate-400'}`} />
              <span className={`font-medium ${action === 'reject' ? 'text-red-700 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                Reject
              </span>
            </button>
          </div>
        </div>

        {/* Feedback */}
        <div className="space-y-3">
          <h4 className="font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-2">
            <MessageSquare className="w-4 h-4" />
            <span>Feedback (Optional)</span>
          </h4>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Add any feedback or notes..."
            rows={3}
            className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!action || isLoading}
          className="w-full flex items-center justify-center space-x-2 px-6 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? (
            <>
              <Sparkles className="w-5 h-5 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Submit Decision</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
