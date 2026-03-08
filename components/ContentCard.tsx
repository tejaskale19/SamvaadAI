import React, { useState } from 'react';
import { Copy, Check, Edit3, ThumbsUp, ThumbsDown, Sparkles } from 'lucide-react';
import type { ContentVariant } from '../types';

interface ContentCardProps {
  variant: ContentVariant;
  index: number;
  onApprove?: (variantId: string) => void;
  onReject?: (variantId: string) => void;
  onEdit?: (variantId: string, editedContent: string) => void;
  onSelect?: (variant: ContentVariant) => void;
  isSelected?: boolean;
  showActions?: boolean;
}

const toneColors = {
  professional: 'from-blue-500 to-indigo-500',
  casual: 'from-green-500 to-emerald-500',
  inspirational: 'from-purple-500 to-pink-500',
  humorous: 'from-yellow-500 to-orange-500',
};

const toneLabels = {
  professional: 'Professional',
  casual: 'Casual & Fun',
  inspirational: 'Inspirational',
  humorous: 'Humorous',
};

export default function ContentCard({
  variant,
  index,
  onApprove,
  onReject,
  onEdit,
  onSelect,
  isSelected = false,
  showActions = true,
}: ContentCardProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(variant.content);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(variant.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (onEdit && editedContent !== variant.content) {
      onEdit(variant.id, editedContent);
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`relative bg-white dark:bg-slate-800 rounded-2xl border-2 transition-all overflow-hidden ${
        isSelected
          ? 'border-orange-500 shadow-lg shadow-orange-500/20'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
      onClick={() => onSelect?.(variant)}
    >
      {/* Header */}
      <div className={`px-4 py-3 bg-gradient-to-r ${toneColors[variant.tone]} text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
              {index + 1}
            </span>
            <span className="font-semibold">{toneLabels[variant.tone]}</span>
          </div>
          {variant.engagementScore && (
            <div className="flex items-center space-x-1 bg-white/20 px-2 py-1 rounded-lg">
              <Sparkles className="w-4 h-4" />
              <span className="font-medium">{variant.engagementScore}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-48 p-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 resize-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            autoFocus
          />
        ) : (
          <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
            {variant.content}
          </div>
        )}

        {/* Hashtags */}
        {variant.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {variant.hashtags.map((tag, i) => (
              <span
                key={i}
                className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm"
              >
                {tag.startsWith('#') ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSaveEdit}
                    className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors dark:bg-green-900/30 dark:text-green-400"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedContent(variant.content);
                    }}
                    className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors dark:bg-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors dark:bg-slate-700 dark:text-slate-300"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={handleCopy}
                    className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors dark:bg-slate-700 dark:text-slate-300"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </>
              )}
            </div>

            {!isEditing && (
              <div className="flex items-center space-x-2">
                {onReject && (
                  <button
                    onClick={() => onReject(variant.id)}
                    className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors dark:bg-red-900/30 dark:text-red-400"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                )}
                {onApprove && (
                  <button
                    onClick={() => onApprove(variant.id)}
                    className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors dark:bg-green-900/30 dark:text-green-400"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>Approve</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
