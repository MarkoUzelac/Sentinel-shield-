import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, MapPin, Bell, Lock, CheckCircle2, ChevronRight, Activity, AlertTriangle } from 'lucide-react';
import { AppSkinConfig } from '../types';

interface Props {
  onComplete: () => void;
  skin: AppSkinConfig;
}

export const SplashScreenView: React.FC<Props> = ({ onComplete, skin }) => {
  const [step, setStep] = useState(0);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [notificationsGranted, setNotificationsGranted] = useState<boolean | null>(null);
  const [initProgress, setInitProgress] = useState(0);

  // Step 0 -> 1 auto transition
  useEffect(() => {
    if (step === 0) {
      const timer = setTimeout(() => setStep(1), 2500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Step 2 (Initialization) progress
  useEffect(() => {
    if (step === 2) {
      const interval = setInterval(() => {
        setInitProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            setTimeout(onComplete, 500);
            return 100;
          }
          return p + Math.floor(Math.random() * 15) + 5;
        });
      }, 300);
      return () => clearInterval(interval);
    }
  }, [step, onComplete]);

  const requestLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => setLocationGranted(true),
        () => setLocationGranted(false),
        { enableHighAccuracy: true }
      );
    } else {
      setLocationGranted(false);
    }
  };

  const requestNotifications = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then(perm => {
        setNotificationsGranted(perm === 'granted');
      });
    } else {
      setNotificationsGranted(false);
    }
  };

  const handleContinue = () => {
    setStep(2);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-6 font-sans selection:bg-emerald-500 selection:text-black"
      style={{ backgroundColor: skin.bgColor, color: skin.textPrimaryColor }}
    >
      {/* Decorative background grid */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${skin.primaryColor} 1px, transparent 1px), linear-gradient(90deg, ${skin.primaryColor} 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step0"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10 flex flex-col items-center justify-center text-center max-w-sm"
          >
            <div className="relative mb-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border border-dashed opacity-20"
                style={{ borderColor: skin.primaryColor, margin: '-20px' }}
              />
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full blur-xl opacity-20"
                style={{ backgroundColor: skin.primaryColor }}
              />
              <Shield className="w-24 h-24 relative z-10" style={{ color: skin.primaryColor }} />
            </div>
            
            <h1 className="text-3xl font-black uppercase tracking-widest mb-2" style={{ color: skin.textPrimaryColor }}>
              Sentinel
            </h1>
            <p className="text-sm font-mono tracking-widest uppercase mb-8" style={{ color: skin.accentSecondary }}>
              Shield Pro Protocol
            </p>
            
            <div className="flex items-center gap-3 text-xs font-mono" style={{ color: skin.textMutedColor }}>
              <Activity className="w-4 h-4 animate-pulse" />
              <span>INITIALIZING SECURE KERNEL...</span>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 flex flex-col w-full max-w-md"
          >
            <div className="text-center mb-8">
              <Shield className="w-12 h-12 mx-auto mb-4" style={{ color: skin.primaryColor }} />
              <h2 className="text-xl font-bold mb-2">Privacy & Security Setup</h2>
              <p className="text-sm" style={{ color: skin.textMutedColor }}>
                To provide military-grade threat detection and tactical sweeps, Sentinel requires specific environmental access.
              </p>
            </div>

            <div className="space-y-4 mb-8">
              {/* Location Permission */}
              <div 
                className="p-4 rounded-xl border flex items-start gap-4 transition-colors"
                style={{ 
                  backgroundColor: skin.surfaceColor, 
                  borderColor: locationGranted ? skin.primaryColor : skin.borderColor 
                }}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${skin.primaryColor}22`, color: skin.primaryColor }}
                >
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold mb-1 flex items-center justify-between">
                    Geospatial Telemetry
                    {locationGranted && <CheckCircle2 className="w-4 h-4" style={{ color: skin.primaryColor }} />}
                  </h3>
                  <p className="text-xs mb-3 leading-relaxed" style={{ color: skin.textMutedColor }}>
                    Required for Tactical RF & IMSI Sweep mapping to locate localized anomalies and rogue base stations.
                  </p>
                  {locationGranted === null ? (
                    <button
                      onClick={requestLocation}
                      className="text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wider transition-colors"
                      style={{ backgroundColor: skin.primaryColor, color: skin.bgColor }}
                    >
                      Authorize GPS
                    </button>
                  ) : (
                    <span className="text-xs font-mono font-bold" style={{ color: locationGranted ? skin.primaryColor : skin.accentSecondary }}>
                      {locationGranted ? 'AUTHORIZED' : 'DENIED / UNAVAILABLE'}
                    </span>
                  )}
                </div>
              </div>

              {/* Notifications Permission */}
              <div 
                className="p-4 rounded-xl border flex items-start gap-4 transition-colors"
                style={{ 
                  backgroundColor: skin.surfaceColor, 
                  borderColor: notificationsGranted ? skin.primaryColor : skin.borderColor 
                }}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${skin.primaryColor}22`, color: skin.primaryColor }}
                >
                  <Bell className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold mb-1 flex items-center justify-between">
                    Real-Time Threat Alerts
                    {notificationsGranted && <CheckCircle2 className="w-4 h-4" style={{ color: skin.primaryColor }} />}
                  </h3>
                  <p className="text-xs mb-3 leading-relaxed" style={{ color: skin.textMutedColor }}>
                    Receive immediate push notifications when zero-day vulnerabilities or active network intrusions are detected.
                  </p>
                  {notificationsGranted === null ? (
                    <button
                      onClick={requestNotifications}
                      className="text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wider transition-colors"
                      style={{ backgroundColor: skin.primaryColor, color: skin.bgColor }}
                    >
                      Enable Alerts
                    </button>
                  ) : (
                    <span className="text-xs font-mono font-bold" style={{ color: notificationsGranted ? skin.primaryColor : skin.accentSecondary }}>
                      {notificationsGranted ? 'AUTHORIZED' : 'DENIED / UNAVAILABLE'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleContinue}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: skin.primaryColor, color: skin.bgColor }}
            >
              <span>Initialize System</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="mt-4 text-center flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" style={{ color: skin.textMutedColor }} />
              <span className="text-[10px] uppercase tracking-wider" style={{ color: skin.textMutedColor }}>
                End-to-end encrypted telemetry
              </span>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 flex flex-col items-center justify-center text-center w-full max-w-sm"
          >
            <Shield className="w-16 h-16 mb-6" style={{ color: skin.primaryColor }} />
            <h2 className="text-lg font-bold mb-8 uppercase tracking-widest">Activating Protocols</h2>
            
            <div className="w-full space-y-2">
              <div className="flex justify-between text-xs font-mono" style={{ color: skin.textMutedColor }}>
                <span>ENCRYPTING STATE</span>
                <span>{initProgress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${skin.primaryColor}22` }}>
                <motion.div 
                  className="h-full rounded-full"
                  style={{ backgroundColor: skin.primaryColor }}
                  animate={{ width: `${initProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            <div className="mt-8 text-[10px] font-mono opacity-50 uppercase tracking-widest" style={{ color: skin.textMutedColor }}>
              {initProgress < 30 && 'Verifying local certificates...'}
              {initProgress >= 30 && initProgress < 60 && 'Establishing wireguard tunnel...'}
              {initProgress >= 60 && initProgress < 90 && 'Loading AI heuristic engines...'}
              {initProgress >= 90 && 'System Ready.'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
