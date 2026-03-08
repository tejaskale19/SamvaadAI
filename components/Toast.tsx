import toast, { Toaster } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

// Toast provider component
export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      gutter={12}
      containerClassName=""
      toastOptions={{
        duration: 4000,
        style: {
          background: 'transparent',
          boxShadow: 'none',
          padding: 0,
        },
      }}
    />
  );
}

// Custom toast styles
const baseToastStyles = "flex items-start space-x-3 p-4 rounded-xl shadow-lg border max-w-md";

// Success toast
export const showSuccessToast = (message: string, description?: string) => {
  toast.custom((t) => (
    <div
      className={`${baseToastStyles} bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 ${
        t.visible ? 'animate-enter' : 'animate-leave'
      }`}
    >
      <div className="flex-shrink-0">
        <CheckCircle className="w-5 h-5 text-green-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-green-800 dark:text-green-200">
          {message}
        </p>
        {description && (
          <p className="mt-1 text-sm text-green-600 dark:text-green-300">
            {description}
          </p>
        )}
      </div>
      <button
        onClick={() => toast.dismiss(t.id)}
        className="flex-shrink-0 text-green-400 hover:text-green-600 dark:hover:text-green-200"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  ));
};

// Error toast
export const showErrorToast = (message: string, description?: string) => {
  toast.custom((t) => (
    <div
      className={`${baseToastStyles} bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 ${
        t.visible ? 'animate-enter' : 'animate-leave'
      }`}
    >
      <div className="flex-shrink-0">
        <XCircle className="w-5 h-5 text-red-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-800 dark:text-red-200">
          {message}
        </p>
        {description && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-300">
            {description}
          </p>
        )}
      </div>
      <button
        onClick={() => toast.dismiss(t.id)}
        className="flex-shrink-0 text-red-400 hover:text-red-600 dark:hover:text-red-200"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  ));
};

// Warning toast
export const showWarningToast = (message: string, description?: string) => {
  toast.custom((t) => (
    <div
      className={`${baseToastStyles} bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 ${
        t.visible ? 'animate-enter' : 'animate-leave'
      }`}
    >
      <div className="flex-shrink-0">
        <AlertCircle className="w-5 h-5 text-yellow-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
          {message}
        </p>
        {description && (
          <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-300">
            {description}
          </p>
        )}
      </div>
      <button
        onClick={() => toast.dismiss(t.id)}
        className="flex-shrink-0 text-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-200"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  ));
};

// Info toast
export const showInfoToast = (message: string, description?: string) => {
  toast.custom((t) => (
    <div
      className={`${baseToastStyles} bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 ${
        t.visible ? 'animate-enter' : 'animate-leave'
      }`}
    >
      <div className="flex-shrink-0">
        <Info className="w-5 h-5 text-blue-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
          {message}
        </p>
        {description && (
          <p className="mt-1 text-sm text-blue-600 dark:text-blue-300">
            {description}
          </p>
        )}
      </div>
      <button
        onClick={() => toast.dismiss(t.id)}
        className="flex-shrink-0 text-blue-400 hover:text-blue-600 dark:hover:text-blue-200"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  ));
};

// Loading toast (returns promise for async operations)
export const showLoadingToast = (message: string) => {
  return toast.custom(
    (t) => (
      <div
        className={`${baseToastStyles} bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 ${
          t.visible ? 'animate-enter' : 'animate-leave'
        }`}
      >
        <div className="flex-shrink-0">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {message}
          </p>
        </div>
      </div>
    ),
    { duration: Infinity }
  );
};

// Dismiss a specific toast
export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

// Dismiss all toasts
export const dismissAllToasts = () => {
  toast.dismiss();
};

export default {
  success: showSuccessToast,
  error: showErrorToast,
  warning: showWarningToast,
  info: showInfoToast,
  loading: showLoadingToast,
  dismiss: dismissToast,
  dismissAll: dismissAllToasts,
};
