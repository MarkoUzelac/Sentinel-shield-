import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Info,
  WifiOff,
  Clock,
  SearchX,
  X,
  ExternalLink,
} from 'lucide-react';
import { useToast, ToastMessage, ToastType } from '../context/ToastContext';
import { AppSkinConfig } from '../types';

interface Props {
  skin: AppSkinConfig;
}

export const ToastContainer: React.FC<Props> = ({ skin }) => {
  const { toasts, removeToast } = useToast();

  const renderIcon = (type: ToastType) => {
    switch (type) {
      case 'network_error':
        return <WifiOff className="w-5 h-5 text-rose-500 shrink-0" />;
      case 'rate_limit':
        return <Clock className="w-5 h-5 text-amber-400 shrink-0" />;
      case 'empty_results':
        return <SearchX className="w-5 h-5 text-cyan-400 shrink-0" />;
      case 'alert':
        return <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: skin.primaryColor }} />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-cyan-400 shrink-0" />;
    }
  };

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case 'network_error':
        return 'rgba(244, 63, 94, 0.6)';
      case 'rate_limit':
        return 'rgba(245, 158, 11, 0.6)';
      case 'empty_results':
        return 'rgba(56, 189, 248, 0.5)';
      case 'alert':
        return 'rgba(239, 68, 68, 0.6)';
      case 'warning':
        return 'rgba(234, 179, 8, 0.6)';
      case 'success':
        return skin.primaryColor;
      case 'info':
      default:
        return `${skin.primaryColor}88`;
    }
  };

  const getBadge = (toast: ToastMessage) => {
    switch (toast.type) {
      case 'network_error':
        return (
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase tracking-wider">
            MREŽNA GREŠKA
          </span>
        );
      case 'rate_limit':
        return (
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
            HTTP 429 KVOTA
          </span>
        );
      case 'empty_results':
        return (
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase tracking-wider">
            0 REZULTATA
          </span>
        );
      case 'alert':
        return (
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 uppercase tracking-wider">
            UPOZORENJE
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2.5 max-w-[380px] w-[calc(100vw-2rem)] pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const borderColor = getBorderColor(toast.type);
          const badge = getBadge(toast);

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 20, transition: { duration: 0.2 } }}
              className="flex flex-col gap-1 p-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl pointer-events-auto transition-all"
              style={{
                backgroundColor: 'rgba(12, 16, 24, 0.92)',
                borderColor,
                boxShadow: `0 10px 30px -10px ${borderColor}33`,
              }}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="mt-0.5">{renderIcon(toast.type)}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      {toast.title && (
                        <h4 className="text-xs font-mono font-bold text-white tracking-wide">
                          {toast.title}
                        </h4>
                      )}
                      {badge}
                    </div>
                    <p className="text-xs font-mono text-neutral-200 leading-snug break-words">
                      {toast.message}
                    </p>
                    {toast.suggestion && (
                      <p className="text-[11px] font-mono text-neutral-400 mt-1 flex items-start gap-1">
                        <span className="text-amber-400 shrink-0">💡</span>
                        <span>{toast.suggestion}</span>
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-1"
                  title="Zatvori obavijest"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
