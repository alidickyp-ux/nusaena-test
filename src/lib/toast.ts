// src/lib/toast.ts
import { toast as sonnerToast } from "sonner";

// Type definitions
type ToastType = "success" | "error" | "warning" | "info" | "loading";

interface ToastOptions {
  duration?: number;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  cancel?: {
    label: string;
    onClick: () => void;
  };
}

// Custom toast functions
export const toast = {
  success: (message: string, options?: ToastOptions) => {
    return sonnerToast.success(message, {
      duration: options?.duration || 4000,
      description: options?.description,
      action: options?.action,
      cancel: options?.cancel,
      icon: "✅",
    });
  },

  error: (message: string, options?: ToastOptions) => {
    return sonnerToast.error(message, {
      duration: options?.duration || 5000,
      description: options?.description,
      action: options?.action,
      cancel: options?.cancel,
      icon: "❌",
    });
  },

  warning: (message: string, options?: ToastOptions) => {
    return sonnerToast.warning(message, {
      duration: options?.duration || 4000,
      description: options?.description,
      action: options?.action,
      cancel: options?.cancel,
      icon: "⚠️",
    });
  },

  info: (message: string, options?: ToastOptions) => {
    return sonnerToast.info(message, {
      duration: options?.duration || 3000,
      description: options?.description,
      action: options?.action,
      cancel: options?.cancel,
      icon: "ℹ️",
    });
  },

  loading: (message: string, options?: ToastOptions) => {
    return sonnerToast.loading(message, {
      duration: options?.duration || 6000,
      description: options?.description,
    });
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    },
    options?: ToastOptions
  ) => {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: (data) => ({
        message: messages.success,
        description: options?.description,
        action: options?.action,
      }),
      error: (error) => ({
        message: messages.error,
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
      }),
      duration: options?.duration || 4000,
    });
  },

  dismiss: (id?: string | number) => {
    if (id) {
      sonnerToast.dismiss(id);
    } else {
      sonnerToast.dismiss();
    }
  },
};

// Helper untuk API error handling
export const handleApiError = (error: any, defaultMessage?: string) => {
  const message =
    error?.response?.data?.error ||
    error?.message ||
    defaultMessage ||
    "Terjadi kesalahan pada server";

  toast.error(message);
  return message;
};

// Helper untuk form submission
export const withToast = async (
  fn: () => Promise<any>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
): Promise<any | undefined> => {
  try {
    const result = await toast.promise(fn(), messages);
    return result;
  } catch (error) {
    handleApiError(error, messages.error);
    return undefined;
  }
};

// Default export untuk kompatibilitas
export default toast;