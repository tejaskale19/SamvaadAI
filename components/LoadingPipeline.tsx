import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Zap, Languages, BarChart3, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { PipelineStage } from '../context/AppContext';

interface LoadingPipelineProps {
  stage: PipelineStage;
  error?: string | null;
}

interface StageConfig {
  id: PipelineStage;
  label: string;
  labelHi: string;
  icon: React.ReactNode;
  color: string;
}

const stages: StageConfig[] = [
  {
    id: 'analyzing-prompt',
    label: 'Analyzing prompt',
    labelHi: 'प्रॉम्प्ट का विश्लेषण',
    icon: <Search className="w-5 h-5" />,
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'generating-content',
    label: 'Generating AI content',
    labelHi: 'AI सामग्री बना रहे हैं',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'from-orange-500 to-pink-500',
  },
  {
    id: 'optimizing-platform',
    label: 'Optimizing for platform',
    labelHi: 'प्लेटफॉर्म के लिए अनुकूलन',
    icon: <Zap className="w-5 h-5" />,
    color: 'from-yellow-500 to-orange-500',
  },
  {
    id: 'translating',
    label: 'Translating language',
    labelHi: 'भाषा अनुवाद',
    icon: <Languages className="w-5 h-5" />,
    color: 'from-blue-500 to-indigo-500',
  },
  {
    id: 'predicting-engagement',
    label: 'Predicting engagement',
    labelHi: 'सहभागिता की भविष्यवाणी',
    icon: <BarChart3 className="w-5 h-5" />,
    color: 'from-green-500 to-emerald-500',
  },
];

function getStageIndex(stage: PipelineStage): number {
  return stages.findIndex((s) => s.id === stage);
}

export default function LoadingPipeline({ stage, error }: LoadingPipelineProps) {
  const currentIndex = getStageIndex(stage);
  const isComplete = stage === 'complete';
  const isError = stage === 'error';

  if (stage === 'idle') {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-lg">
        {/* Current Stage Display */}
        <AnimatePresence mode="wait">
          {isComplete ? (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center py-4 space-y-3"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <p className="text-lg font-semibold text-slate-800 dark:text-white">
                Content Ready!
              </p>
            </motion.div>
          ) : isError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center py-4 space-y-3"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
              <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                {error || 'An error occurred'}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center py-4 space-y-3"
            >
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${stages[currentIndex]?.color || 'from-orange-500 to-pink-500'} flex items-center justify-center`}>
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-slate-800 dark:text-white">
                  {stages[currentIndex]?.label || 'Processing...'}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {stages[currentIndex]?.labelHi}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Steps */}
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            {stages.map((s, index) => {
              const isActive = index === currentIndex;
              const isCompleted = index < currentIndex || isComplete;
              const isPending = index > currentIndex && !isComplete;

              return (
                <div key={s.id} className="flex flex-col items-center flex-1">
                  {/* Step Icon */}
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isActive ? 1.1 : 1,
                      opacity: isPending ? 0.4 : 1,
                    }}
                    className={`relative w-10 h-10 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white'
                        : isActive
                        ? `bg-gradient-to-br ${s.color} text-white`
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {isCompleted && !isActive ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : isActive && !isComplete ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      s.icon
                    )}
                  </motion.div>

                  {/* Step Label */}
                  <span
                    className={`mt-2 text-xs text-center max-w-[60px] ${
                      isActive
                        ? 'text-slate-800 dark:text-white font-medium'
                        : isCompleted
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {s.label.split(' ')[0]}
                  </span>

                  {/* Connector Line */}
                  {index < stages.length - 1 && (
                    <div className="absolute top-5 left-[calc(50%+20px)] w-[calc(100%-40px)] h-0.5">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isCompleted
                            ? 'bg-green-400'
                            : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
