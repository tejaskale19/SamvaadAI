import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import ApprovalPanel from '../../components/ApprovalPanel';
import { approveContent, ApiError } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { showSuccessToast, showErrorToast } from '../../components/Toast';
import { CheckCircle, ArrowLeft, PartyPopper, Home } from 'lucide-react';
import type { ContentVariant, ApprovalAction } from '../../types';

export default function ApprovePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { 
    state, 
    setApprovalResult: setGlobalApprovalResult,
    resetWorkflow,
    saveContentToLocalHistory,
  } = useApp();

  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState('');
  const [isApproved, setIsApproved] = useState(false);
  const [approvalResult, setApprovalResult] = useState<ApprovalAction | null>(null);

  useEffect(() => {
    // Get content from context
    if (state.selectedVariant) {
      setContent(state.selectedVariant.content);
    } else {
      // No content to approve
      router.push('/generate');
    }
  }, [state.selectedVariant, router]);

  const handleApproval = async (action: ApprovalAction) => {
    setIsLoading(true);
    try {
      // Use the real content ID from generated content
      const fixedAction = {
        ...action,
        contentId: state.generatedContent?.id || action.contentId,
      };
      const result = await approveContent(fixedAction);
      setApprovalResult(result);
      setGlobalApprovalResult(result);
      setIsApproved(true);
      
      // Save to local history with correct status
      if (state.generatedContent && state.selectedVariant) {
        const historyStatus = (action.action === 'approve' || action.action === 'edit') ? 'approved' as const : 'rejected' as const;
        saveContentToLocalHistory(
          state.generatedContent,
          state.selectedVariant,
          state.localizedContent || undefined,
          historyStatus
        );
      }
      
      // Show appropriate toast
      if (action.action === 'approve') {
        showSuccessToast(t('toast.contentApproved'));
      } else if (action.action === 'edit') {
        showSuccessToast(t('toast.contentEdited'));
      } else {
        showSuccessToast(t('toast.contentRejected'));
      }
    } catch (error) {
      console.error('Approval error:', error);
      const errorMessage = error instanceof ApiError ? error.message : t('toast.errorApprove');
      showErrorToast(t('toast.errorApprove'), errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    resetWorkflow();
    router.push('/');
  };

  // Create a mock variant for the ApprovalPanel
  const mockVariant: ContentVariant = {
    id: state.selectedVariant?.id || 'variant-1',
    content: content,
    platform: state.selectedVariant?.platform || 'instagram',
    hashtags: state.selectedVariant?.hashtags || [],
    tone: state.selectedVariant?.tone || 'professional',
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center space-x-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <span>{t('approve.title')}</span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              {t('approve.subtitle')}
            </p>
          </div>
          {!isApproved && (
            <button
              onClick={() => router.push('/localize')}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('approve.backToLocalization')}</span>
            </button>
          )}
        </div>

        {/* Success State */}
        {isApproved && approvalResult && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                <PartyPopper className="w-10 h-10 text-white" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                  {approvalResult.action === 'approve' && t('approve.success.approved')}
                  {approvalResult.action === 'edit' && t('approve.success.edited')}
                  {approvalResult.action === 'reject' && t('approve.success.rejected')}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                  {approvalResult.action === 'approve' && t('approve.success.approvedDescription')}
                  {approvalResult.action === 'edit' && t('approve.success.editedDescription')}
                  {approvalResult.action === 'reject' && t('approve.success.rejectedDescription')}
                </p>
              </div>

              {approvalResult.feedback && (
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 text-left">
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('approve.feedbackLabel')}:</p>
                  <p className="text-slate-700 dark:text-slate-300">{approvalResult.feedback}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={handleCreateNew}
                  className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold"
                >
                  <Home className="w-5 h-5" />
                  <span>{t('approve.createNew')}</span>
                </button>
                <button
                  onClick={() => router.push('/analytics')}
                  className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                >
                  <span>{t('approve.viewAnalytics')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Approval Flow */}
        {!isApproved && content && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Content Preview */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
                {t('approve.englishVersion')}
              </h2>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {content}
                </div>
              </div>

              {state.localizedContent && (
                <>
                  <h2 className="text-xl font-semibold text-slate-800 dark:text-white mt-6">
                    {t('approve.hindiVersion')}
                  </h2>
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-200 dark:border-orange-800 p-6">
                    <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {state.localizedContent.translated}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Approval Panel */}
            <div>
              <ApprovalPanel
                variant={mockVariant}
                onApprove={handleApproval}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}

        {/* No Content */}
        {!content && !isApproved && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <CheckCircle className="w-16 h-16 text-slate-300 dark:text-slate-600" />
            <p className="text-lg text-slate-600 dark:text-slate-400">{t('approve.noContent')}</p>
            <button
              onClick={() => router.push('/generate')}
              className="px-6 py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors"
            >
              {t('localize.generateFirst')}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
