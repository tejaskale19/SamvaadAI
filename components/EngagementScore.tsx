import React from 'react';
import { TrendingUp, Clock, Hash, Sparkles, Globe, AlertTriangle, Target, Calendar, Users, Zap, Heart, BookOpen } from 'lucide-react';
import type { EngagementPrediction } from '../types';

interface EngagementScoreProps {
  prediction: EngagementPrediction;
  showDetails?: boolean;
}

function ScoreGauge({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 80) return { gradient: 'from-green-500 to-emerald-500', text: 'text-green-500' };
    if (score >= 60) return { gradient: 'from-yellow-500 to-orange-500', text: 'text-yellow-500' };
    return { gradient: 'from-red-500 to-pink-500', text: 'text-red-500' };
  };

  const { gradient, text } = getColor();
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="64"
          cy="64"
          r="45"
          stroke="currentColor"
          strokeWidth="10"
          fill="none"
          className="text-slate-200 dark:text-slate-700"
        />
        <circle
          cx="64"
          cy="64"
          r="45"
          stroke="url(#scoreGradient)"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
            transition: 'stroke-dashoffset 1s ease-in-out',
          }}
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" className={`${gradient.split(' ')[0].replace('from-', '')} stop-color-current`} style={{ stopColor: score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444' }} />
            <stop offset="100%" className={`${gradient.split(' ')[1].replace('to-', '')} stop-color-current`} style={{ stopColor: score >= 80 ? '#10b981' : score >= 60 ? '#f97316' : '#ec4899' }} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${text}`}>{score}</span>
        <span className="text-sm text-slate-500 dark:text-slate-400">/ 100</span>
      </div>
    </div>
  );
}

function FactorBar({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  const getColor = () => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </div>
        <span className="font-medium text-slate-700 dark:text-slate-300">{value}%</span>
      </div>
      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} rounded-full transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function EngagementScore({ prediction, showDetails = true }: EngagementScoreProps) {
  const confidencePercent = prediction.confidence < 1 
    ? Math.round(prediction.confidence * 100) 
    : prediction.confidence;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-orange-500" />
          <span>Engagement Prediction</span>
        </h3>
        <div className="flex items-center space-x-1 text-sm text-slate-500 dark:text-slate-400">
          <Target className="w-4 h-4" />
          <span>Confidence:</span>
          <span className="font-medium">{confidencePercent}%</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-around space-y-6 md:space-y-0">
        <ScoreGauge score={prediction.score} />
        
        {showDetails && (
          <div className="flex-1 max-w-xs space-y-4">
            <FactorBar label="Timing" value={prediction.factors.timing} icon={Clock} />
            <FactorBar label="Hashtags" value={prediction.factors.hashtags} icon={Hash} />
            <FactorBar label="Content Quality" value={prediction.factors.contentQuality} icon={Sparkles} />
            <FactorBar label="Cultural Relevance" value={prediction.factors.culturalRelevance} icon={Globe} />
            {prediction.factors.sentiment !== undefined && (
              <FactorBar label="Sentiment" value={prediction.factors.sentiment} icon={Heart} />
            )}
            {prediction.factors.readability !== undefined && (
              <FactorBar label="Readability" value={prediction.factors.readability} icon={BookOpen} />
            )}
          </div>
        )}
      </div>

      {/* Best Posting Time & Estimated Reach */}
      {(prediction.bestPostingTime || prediction.estimatedReach) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          {prediction.bestPostingTime && (
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                <span className="font-medium text-blue-700 dark:text-blue-300">Best Posting Time</span>
              </div>
              <p className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                {prediction.bestPostingTime}
              </p>
            </div>
          )}
          
          {prediction.estimatedReach && (
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-5 h-5 text-purple-500" />
                <span className="font-medium text-purple-700 dark:text-purple-300">Estimated Reach</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-purple-600 dark:text-purple-400">{prediction.estimatedReach.low}</span>
                <span className="text-slate-400">-</span>
                <span className="text-lg font-semibold text-purple-800 dark:text-purple-200">{prediction.estimatedReach.mid}</span>
                <span className="text-slate-400">-</span>
                <span className="text-sm text-purple-600 dark:text-purple-400">{prediction.estimatedReach.high}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Improvement Suggestions */}
      {prediction.improvementSuggestions && prediction.improvementSuggestions.length > 0 && (
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
          <h4 className="font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Improvement Suggestions</span>
          </h4>
          <div className="space-y-3">
            {prediction.improvementSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-lg p-3 border border-amber-200 dark:border-amber-800"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-amber-800 dark:text-amber-200">{suggestion.factor}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                    +{suggestion.potentialImprovement}% potential
                  </span>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-300">{suggestion.suggestion}</p>
                <div className="mt-2 flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Current:</span>
                  <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${suggestion.currentScore}%` }}
                    />
                  </div>
                  <span>{suggestion.currentScore}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {prediction.recommendations.length > 0 && (
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
          <h4 className="font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span>Quick Tips</span>
          </h4>
          <ul className="space-y-2">
            {prediction.recommendations.map((rec, index) => (
              <li
                key={index}
                className="flex items-start space-x-2 text-sm text-slate-600 dark:text-slate-400"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
