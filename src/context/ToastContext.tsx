import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { GeocodingErrorDetail } from '../services/geo/types';

export type ToastType =
  | 'success'
  | 'alert'
  | 'warning'
  | 'info'
  | 'rate_limit'
  | 'network_error'
  | 'empty_results';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  suggestion?: string;
  statusCode?: number;
  code?: string;
  durationMs?: number;
  timestamp: number;
}

export interface ToastOptions {
  type?: ToastType;
  title?: string;
  message: string;
  suggestion?: string;
  statusCode?: number;
  code?: string;
  durationMs?: number;
}

export interface ToastContextValue {
  toasts: ToastMessage[];
  addToast: (options: string | ToastOptions, fallbackType?: ToastType) => string;
  addGeocodingErrorToast: (error: GeocodingErrorDetail) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const addToast = useCallback((options: string | ToastOptions, fallbackType: ToastType = 'info'): string => {
    const id = Math.random().toString(36).substring(2, 9);
    const timestamp = Date.now();

    let toastItem: ToastMessage;

    if (typeof options === 'string') {
      toastItem = {
        id,
        message: options,
        type: fallbackType,
        timestamp,
        durationMs: fallbackType === 'alert' || fallbackType === 'network_error' || fallbackType === 'rate_limit' ? 6000 : 4000,
      };
    } else {
      const type = options.type || fallbackType;
      toastItem = {
        id,
        message: options.message,
        title: options.title,
        type,
        suggestion: options.suggestion,
        statusCode: options.statusCode,
        code: options.code,
        timestamp,
        durationMs: options.durationMs || (type === 'alert' || type === 'network_error' || type === 'rate_limit' ? 6000 : 4000),
      };
    }

    setToasts((prev) => [...prev, toastItem]);

    if (toastItem.durationMs && toastItem.durationMs > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toastItem.durationMs);
    }

    return id;
  }, [removeToast]);

  const addGeocodingErrorToast = useCallback((error: GeocodingErrorDetail): string => {
    let type: ToastType = 'alert';
    let title = 'Greška pri pretrazi';

    switch (error.code) {
      case 'NETWORK_ERROR':
        type = 'network_error';
        title = 'MREŽNA GREŠKA (NETWORK OFFLINE)';
        break;
      case 'RATE_LIMIT_EXCEEDED':
        type = 'rate_limit';
        title = 'OGRANIČENJE UPITA (HTTP 429)';
        break;
      case 'EMPTY_RESULTS':
        type = 'empty_results';
        title = 'NEMA PRONAĐENIH LOKACIJA';
        break;
      case 'TIMEOUT':
        type = 'warning';
        title = 'ZAHTJEV ISTEKAO (TIMEOUT)';
        break;
      case 'UNAUTHORIZED':
        type = 'alert';
        title = 'NEAUTORIZIRAN PRISTUP API-JU';
        break;
      default:
        type = 'alert';
        title = 'GREŠKA GEOKODIRANJA';
        break;
    }

    return addToast({
      type,
      title,
      message: error.userFriendlyMessage,
      suggestion: error.suggestion,
      statusCode: error.statusCode,
      code: error.code,
      durationMs: 6500,
    });
  }, [addToast]);

  const contextValue = useMemo(
    () => ({
      toasts,
      addToast,
      addGeocodingErrorToast,
      removeToast,
      clearToasts,
    }),
    [toasts, addToast, addGeocodingErrorToast, removeToast, clearToasts]
  );

  return <ToastContext.Provider value={contextValue}>{children}</ToastContext.Provider>;
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
