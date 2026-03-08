import React, { createContext, useContext, useReducer, useCallback, ReactNode, useEffect } from 'react';
import type { 
  GeneratedContent, 
  ContentVariant, 
  LocalizedContent, 
  EngagementPrediction, 
  ApprovalAction,
  Platform 
} from '../types';
import { 
  getContentHistory as getLocalHistory, 
  saveContentToHistory as saveToLocalHistory,
  ContentHistoryItem 
} from '../services/localPersistence';

// Pipeline loading stages
export type PipelineStage = 
  | 'idle'
  | 'analyzing-prompt'
  | 'generating-content'
  | 'optimizing-platform'
  | 'translating'
  | 'predicting-engagement'
  | 'complete'
  | 'error';

// App State Interface
export interface AppState {
  // Content State
  currentPrompt: string;
  currentPlatform: Platform;
  generatedContent: GeneratedContent | null;
  selectedVariant: ContentVariant | null;
  localizedContent: LocalizedContent | null;
  engagementPrediction: EngagementPrediction | null;
  approvalResult: ApprovalAction | null;
  
  // Settings
  autoTranslate: boolean;
  interfaceLanguage: 'en' | 'hi';
  
  // UI State
  pipelineStage: PipelineStage;
  isLoading: boolean;
  error: string | null;
  
  // History (cached)
  contentHistory: GeneratedContent[];
  approvedContent: ApprovalAction[];
}

// Action Types
type AppAction =
  | { type: 'SET_PROMPT'; payload: { prompt: string; platform: Platform } }
  | { type: 'SET_PIPELINE_STAGE'; payload: PipelineStage }
  | { type: 'SET_GENERATED_CONTENT'; payload: GeneratedContent }
  | { type: 'SELECT_VARIANT'; payload: ContentVariant }
  | { type: 'SET_LOCALIZED_CONTENT'; payload: LocalizedContent }
  | { type: 'SET_ENGAGEMENT_PREDICTION'; payload: EngagementPrediction }
  | { type: 'SET_APPROVAL_RESULT'; payload: ApprovalAction }
  | { type: 'SET_AUTO_TRANSLATE'; payload: boolean }
  | { type: 'SET_INTERFACE_LANGUAGE'; payload: 'en' | 'hi' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_HISTORY'; payload: GeneratedContent[] }
  | { type: 'SET_APPROVED_CONTENT'; payload: ApprovalAction[] }
  | { type: 'RESET_WORKFLOW' }
  | { type: 'CLEAR_ERROR' };

// Initial State
const initialState: AppState = {
  currentPrompt: '',
  currentPlatform: 'instagram',
  generatedContent: null,
  selectedVariant: null,
  localizedContent: null,
  engagementPrediction: null,
  approvalResult: null,
  autoTranslate: false,
  interfaceLanguage: 'en',
  pipelineStage: 'idle',
  isLoading: false,
  error: null,
  contentHistory: [],
  approvedContent: [],
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_PROMPT':
      return {
        ...state,
        currentPrompt: action.payload.prompt,
        currentPlatform: action.payload.platform,
      };
    
    case 'SET_PIPELINE_STAGE':
      return {
        ...state,
        pipelineStage: action.payload,
        isLoading: action.payload !== 'idle' && action.payload !== 'complete' && action.payload !== 'error',
      };
    
    case 'SET_GENERATED_CONTENT':
      return {
        ...state,
        generatedContent: action.payload,
        selectedVariant: action.payload.variants[0] || null,
      };
    
    case 'SELECT_VARIANT':
      return {
        ...state,
        selectedVariant: action.payload,
      };
    
    case 'SET_LOCALIZED_CONTENT':
      return {
        ...state,
        localizedContent: action.payload,
      };
    
    case 'SET_ENGAGEMENT_PREDICTION':
      return {
        ...state,
        engagementPrediction: action.payload,
      };
    
    case 'SET_APPROVAL_RESULT':
      return {
        ...state,
        approvalResult: action.payload,
      };
    
    case 'SET_AUTO_TRANSLATE':
      return {
        ...state,
        autoTranslate: action.payload,
      };
    
    case 'SET_INTERFACE_LANGUAGE':
      return {
        ...state,
        interfaceLanguage: action.payload,
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        pipelineStage: action.payload ? 'error' : state.pipelineStage,
        isLoading: false,
      };
    
    case 'SET_HISTORY':
      return {
        ...state,
        contentHistory: action.payload,
      };
    
    case 'SET_APPROVED_CONTENT':
      return {
        ...state,
        approvedContent: action.payload,
      };
    
    case 'RESET_WORKFLOW':
      return {
        ...state,
        currentPrompt: '',
        generatedContent: null,
        selectedVariant: null,
        localizedContent: null,
        engagementPrediction: null,
        approvalResult: null,
        pipelineStage: 'idle',
        isLoading: false,
        error: null,
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
        pipelineStage: state.pipelineStage === 'error' ? 'idle' : state.pipelineStage,
      };
    
    default:
      return state;
  }
}

// Context Types
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // Helper actions
  setPrompt: (prompt: string, platform: Platform) => void;
  setPipelineStage: (stage: PipelineStage) => void;
  setGeneratedContent: (content: GeneratedContent) => void;
  selectVariant: (variant: ContentVariant) => void;
  setLocalizedContent: (content: LocalizedContent) => void;
  setEngagementPrediction: (prediction: EngagementPrediction) => void;
  setApprovalResult: (result: ApprovalAction) => void;
  setAutoTranslate: (enabled: boolean) => void;
  setInterfaceLanguage: (lang: 'en' | 'hi') => void;
  setError: (error: string | null) => void;
  resetWorkflow: () => void;
  clearError: () => void;
  
  // Local persistence
  saveContentToLocalHistory: (content: GeneratedContent, selectedVariant: ContentVariant, localizedContent?: LocalizedContent, status?: ContentHistoryItem['status']) => void;
  loadContentHistory: () => void;
}

// Create Context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider Component
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const setPrompt = useCallback((prompt: string, platform: Platform) => {
    dispatch({ type: 'SET_PROMPT', payload: { prompt, platform } });
  }, []);

  const setPipelineStage = useCallback((stage: PipelineStage) => {
    dispatch({ type: 'SET_PIPELINE_STAGE', payload: stage });
  }, []);

  const setGeneratedContent = useCallback((content: GeneratedContent) => {
    dispatch({ type: 'SET_GENERATED_CONTENT', payload: content });
  }, []);

  const selectVariant = useCallback((variant: ContentVariant) => {
    dispatch({ type: 'SELECT_VARIANT', payload: variant });
  }, []);

  const setLocalizedContent = useCallback((content: LocalizedContent) => {
    dispatch({ type: 'SET_LOCALIZED_CONTENT', payload: content });
  }, []);

  const setEngagementPrediction = useCallback((prediction: EngagementPrediction) => {
    dispatch({ type: 'SET_ENGAGEMENT_PREDICTION', payload: prediction });
  }, []);

  const setApprovalResult = useCallback((result: ApprovalAction) => {
    dispatch({ type: 'SET_APPROVAL_RESULT', payload: result });
  }, []);

  const setAutoTranslate = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_AUTO_TRANSLATE', payload: enabled });
  }, []);

  const setInterfaceLanguage = useCallback((lang: 'en' | 'hi') => {
    dispatch({ type: 'SET_INTERFACE_LANGUAGE', payload: lang });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const resetWorkflow = useCallback(() => {
    dispatch({ type: 'RESET_WORKFLOW' });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Save content to local history (localStorage)
  const saveContentToLocalHistory = useCallback((
    content: GeneratedContent, 
    selectedVariant: ContentVariant,
    localizedContent?: LocalizedContent,
    status: ContentHistoryItem['status'] = 'draft'
  ) => {
    const historyItem: ContentHistoryItem = {
      id: content.id,
      prompt: content.prompt,
      platform: selectedVariant.platform,
      selectedContent: selectedVariant.content,
      hashtags: selectedVariant.hashtags,
      translatedContent: localizedContent?.translated,
      language: localizedContent?.language,
      status,
      createdAt: content.timestamp,
      updatedAt: new Date().toISOString(),
      engagementScore: selectedVariant.engagementScore,
      userId: content.userId,
    };
    saveToLocalHistory(historyItem);
  }, []);

  // Load content history from localStorage
  const loadContentHistory = useCallback(() => {
    const history = getLocalHistory();
    // Convert to GeneratedContent format for backwards compatibility
    const contentHistory: GeneratedContent[] = history.map(item => ({
      id: item.id,
      prompt: item.prompt,
      variants: [{
        id: `${item.id}-variant`,
        content: item.selectedContent,
        platform: item.platform as Platform,
        hashtags: item.hashtags,
        tone: 'professional',
        engagementScore: item.engagementScore,
      }],
      timestamp: item.createdAt,
      status: item.status,
      userId: item.userId,
    }));
    dispatch({ type: 'SET_HISTORY', payload: contentHistory });
  }, []);

  // Load history on mount
  useEffect(() => {
    loadContentHistory();
  }, [loadContentHistory]);

  const value: AppContextType = {
    state,
    dispatch,
    setPrompt,
    setPipelineStage,
    setGeneratedContent,
    selectVariant,
    setLocalizedContent,
    setEngagementPrediction,
    setApprovalResult,
    setAutoTranslate,
    setInterfaceLanguage,
    setError,
    resetWorkflow,
    clearError,
    saveContentToLocalHistory,
    loadContentHistory,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Custom Hook
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Export context for advanced use cases
export { AppContext };
