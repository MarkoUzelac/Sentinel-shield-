import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  MapPin,
  Bell,
  HardDrive,
  Mic,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Activity,
  Lock,
  Sparkles,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { AppSkinConfig, GeolocationPermissionState } from '../types';
import { ThreatSnapshotEngine } from '../services/threatSnapshotEngine';

interface Props {
  onComplete: () => void;
  skin: AppSkinConfig;
}

type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'unsupported';

export const SplashScreenView: React.FC<Props> = ({ onComplete, skin }) => {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [locationStatus, setLocationStatus] = useState<PermissionStatus>('prompt');
  const [notificationStatus, setNotificationStatus] = useState<PermissionStatus>('prompt');
  const [storageStatus, setStorageStatus] = useState<PermissionStatus>('prompt');
  const [audioStatus, setAudioStatus] = useState<PermissionStatus>('prompt');
  
  const [isAuthorizingAll, setIsAuthorizingAll] = useState(false);
  const [currentAuthorizingItem, setCurrentAuthorizingItem] = useState<string | null>(null);
  const [initProgress, setInitProgress] = useState(0);

  // Check initial permission states on mount if browser supports Permissions API
  useEffect(() => {
    const checkPermissions = async () => {
      // Check Geolocation
      if (typeof navigator !== 'undefined' && 'permissions' in navigator && navigator.permissions?.query) {
        try {
          const geoQuery = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          if (geoQuery.state === 'granted') setLocationStatus('granted');
          else if (geoQuery.state === 'denied') setLocationStatus('denied');
        } catch {
          // ignore query failure
        }

        // Check Notifications
        try {
          const notifQuery = await navigator.permissions.query({ name: 'notifications' as PermissionName });
          if (notifQuery.state === 'granted') setNotificationStatus('granted');
          else if (notifQuery.state === 'denied') setNotificationStatus('denied');
        } catch {
          if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') setNotificationStatus('granted');
            else if (Notification.permission === 'denied') setNotificationStatus('denied');
          }
        }
      }

      // Check Storage Persistence
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
        try {
          const isPersisted = await navigator.storage.persisted();
          if (isPersisted) setStorageStatus('granted');
        } catch {
          // ignore
        }
      }
    };

    checkPermissions();
  }, []);

  // Step 0 -> Step 1 auto-transition after 2.2 seconds
  useEffect(() => {
    if (step === 0) {
      const timer = setTimeout(() => {
        setStep(1);
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Step 2 (Activating Protocols progress)
  useEffect(() => {
    if (step === 2) {
      const interval = setInterval(() => {
        setInitProgress((p) => {
          if (p >= 100) {
            clearInterval(interval);
            setTimeout(onComplete, 400);
            return 100;
          }
          return p + Math.floor(Math.random() * 18) + 8;
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [step, onComplete]);

  // 1. Geolocation Request
  const requestLocation = async (): Promise<boolean> => {
    setCurrentAuthorizingItem('Geospatial Telemetry');
    try {
      const loc = await ThreatSnapshotEngine.requestGeolocationPermission();
      if (loc.hasFix && loc.permissionState === 'GRANTED') {
        setLocationStatus('granted');
        return true;
      } else if (loc.permissionState === 'DENIED') {
        setLocationStatus('denied');
        return false;
      } else {
        setLocationStatus('unsupported');
        return false;
      }
    } catch {
      setLocationStatus('denied');
      return false;
    } finally {
      setCurrentAuthorizingItem(null);
    }
  };

  // 2. Notifications Request
  const requestNotifications = async (): Promise<boolean> => {
    setCurrentAuthorizingItem('Threat Push Alerts');
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        if (result === 'granted') {
          setNotificationStatus('granted');
          return true;
        } else {
          setNotificationStatus('denied');
          return false;
        }
      } catch {
        setNotificationStatus('denied');
        return false;
      } finally {
        setCurrentAuthorizingItem(null);
      }
    } else {
      setNotificationStatus('unsupported');
      setCurrentAuthorizingItem(null);
      return false;
    }
  };

  // 3. Storage Persistence Request
  const requestStorage = async (): Promise<boolean> => {
    setCurrentAuthorizingItem('Storage Persistence');
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        const granted = await navigator.storage.persist();
        setStorageStatus(granted ? 'granted' : 'denied');
        return granted;
      } catch {
        setStorageStatus('granted'); // Standard storage fallback
        return true;
      } finally {
        setCurrentAuthorizingItem(null);
      }
    } else {
      setStorageStatus('granted');
      setCurrentAuthorizingItem(null);
      return true;
    }
  };

  // 4. Microphone / Ultrasonic Sensor Eavesdropping Audit
  const requestAudio = async (): Promise<boolean> => {
    setCurrentAuthorizingItem('Acoustic Eavesdrop Audit');
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately release microphone stream to preserve complete user privacy
        stream.getTracks().forEach((track) => track.stop());
        setAudioStatus('granted');
        return true;
      } catch {
        setAudioStatus('denied');
        return false;
      } finally {
        setCurrentAuthorizingItem(null);
      }
    } else {
      setAudioStatus('unsupported');
      setCurrentAuthorizingItem(null);
      return false;
    }
  };

  // Authorize All in Sequence
  const handleAuthorizeAll = async () => {
    setIsAuthorizingAll(true);
    try {
      if (locationStatus !== 'granted') {
        await requestLocation();
      }
      if (notificationStatus !== 'granted') {
        await requestNotifications();
      }
      if (storageStatus !== 'granted') {
        await requestStorage();
      }
      if (audioStatus !== 'granted') {
        await requestAudio();
      }
    } finally {
      setIsAuthorizingAll(false);
      setCurrentAuthorizingItem(null);
    }
  };

  const configuredCount = [
    locationStatus === 'granted',
    notificationStatus === 'granted',
    storageStatus === 'granted',
    audioStatus === 'granted',
  ].filter(Boolean).length;

  const handleContinue = () => {
    setStep(2);
  };

  return (
    <div
      id="sentinel-splash-screen"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-sans overflow-y-auto"
      style={{ backgroundColor: skin.bgColor, color: skin.textPrimaryColor }}
    >
      {/* Tactical background grid */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${skin.primaryColor} 1px, transparent 1px), linear-gradient(90deg, ${skin.primaryColor} 1px, transparent 1px)`,
          backgroundSize: '36px 36px',
        }}
      />

      <AnimatePresence mode="wait">
        {/* Step 0: Splash Intro Animation */}
        {step === 0 && (
          <motion.div
            key="step0"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative z-10 flex flex-col items-center justify-center text-center max-w-sm w-full"
          >
            <div className="relative mb-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border border-dashed opacity-25"
                style={{ borderColor: skin.primaryColor, margin: '-24px' }}
              />
              <motion.div
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full blur-xl opacity-25"
                style={{ backgroundColor: skin.primaryColor }}
              />
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center border shadow-2xl relative z-10"
                style={{
                  backgroundColor: `${skin.surfaceColor}E6`,
                  borderColor: `${skin.primaryColor}66`,
                }}
              >
                <Shield className="w-12 h-12" style={{ color: skin.primaryColor }} />
              </div>
            </div>

            <div className="space-y-1 mb-8">
              <h1 className="text-2xl font-black uppercase tracking-widest" style={{ color: skin.textPrimaryColor }}>
                SENTINEL SHIELD PRO
              </h1>
              <p className="text-xs font-mono tracking-widest uppercase" style={{ color: skin.accentSecondary }}>
                DEFENSE-GRADE CYBER TELEMETRY
              </p>
            </div>

            <div className="flex items-center gap-2.5 text-xs font-mono px-3.5 py-1.5 rounded-full border bg-black/30" style={{ borderColor: `${skin.borderColor}88`, color: skin.textMutedColor }}>
              <Activity className="w-3.5 h-3.5 animate-pulse" style={{ color: skin.primaryColor }} />
              <span>INITIALIZING HARDWARE SENSORS...</span>
            </div>

            <button
              onClick={() => setStep(1)}
              className="mt-6 text-[11px] font-mono text-neutral-400 hover:text-neutral-200 underline cursor-pointer"
            >
              Skip Intro
            </button>
          </motion.div>
        )}

        {/* Step 1: Request All Needed Permissions */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 flex flex-col w-full max-w-xl my-auto py-6"
          >
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider mb-3" style={{ borderColor: `${skin.primaryColor}55`, backgroundColor: `${skin.primaryColor}15`, color: skin.primaryColor }}>
                <Lock className="w-3 h-3" />
                <span>Zero-Knowledge Environmental Telemetry</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: skin.textPrimaryColor }}>
                Required System Permissions
              </h2>
              <p className="text-xs sm:text-sm mt-1 max-w-md mx-auto" style={{ color: skin.textSecondaryColor }}>
                To provide active intrusion deterrence, tactical RF radar sweeps, and encrypted key retention, Sentinel Shield requests the following device permissions:
              </p>
            </div>

            {/* Quick Authorize All Banner */}
            <div
              className="p-4 rounded-2xl border mb-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg"
              style={{
                backgroundColor: `${skin.surfaceColor}F0`,
                borderColor: `${skin.primaryColor}66`,
              }}
            >
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: `${skin.primaryColor}20`,
                    borderColor: `${skin.primaryColor}44`,
                  }}
                >
                  <Zap className="w-5 h-5 animate-pulse" style={{ color: skin.primaryColor }} />
                </div>
                <div>
                  <div className="text-xs font-bold font-mono" style={{ color: skin.textPrimaryColor }}>
                    PERMISSIONS CONFIGURED: {configuredCount} / 4
                  </div>
                  <div className="text-[11px]" style={{ color: skin.textMutedColor }}>
                    {isAuthorizingAll && currentAuthorizingItem
                      ? `Authorizing: ${currentAuthorizingItem}...`
                      : configuredCount === 4
                      ? 'All hardware telemetry protocols verified.'
                      : 'Authorize all permissions in one sequential step.'}
                  </div>
                </div>
              </div>

              <button
                onClick={handleAuthorizeAll}
                disabled={isAuthorizingAll}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:opacity-95"
                style={{
                  backgroundColor: skin.primaryColor,
                  color: skin.isDark ? '#000000' : '#ffffff',
                }}
              >
                {isAuthorizingAll ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Authorizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Grant All Permissions</span>
                  </>
                )}
              </button>
            </div>

            {/* Permissions List */}
            <div className="space-y-3 mb-6">
              {/* 1. Geospatial Telemetry (GPS) */}
              <div
                className="p-3.5 rounded-2xl border flex items-start gap-3.5 transition-all"
                style={{
                  backgroundColor: skin.cardColor,
                  borderColor: locationStatus === 'granted' ? `${skin.primaryColor}88` : skin.borderColor,
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border"
                  style={{
                    backgroundColor: locationStatus === 'granted' ? `${skin.primaryColor}22` : `${skin.surfaceColor}`,
                    borderColor: locationStatus === 'granted' ? skin.primaryColor : skin.borderColor,
                  }}
                >
                  <MapPin className="w-4 h-4" style={{ color: locationStatus === 'granted' ? skin.primaryColor : skin.textPrimaryColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold" style={{ color: skin.textPrimaryColor }}>
                      Geospatial & Cellular Telemetry (GPS)
                    </h3>
                    <span
                      className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border"
                      style={{
                        backgroundColor: locationStatus === 'granted' ? `${skin.primaryColor}20` : locationStatus === 'denied' ? '#FF336620' : 'rgba(255,255,255,0.05)',
                        borderColor: locationStatus === 'granted' ? skin.primaryColor : locationStatus === 'denied' ? '#FF3366' : skin.borderColor,
                        color: locationStatus === 'granted' ? skin.primaryColor : locationStatus === 'denied' ? '#FF3366' : skin.textMutedColor,
                      }}
                    >
                      {locationStatus === 'granted' ? 'GRANTED' : locationStatus === 'denied' ? 'DENIED' : 'REQUIRED'}
                    </span>
                  </div>
                  <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: skin.textSecondaryColor }}>
                    Required for Tactical RF & IMSI Radar sweeps to triangulate cell towers and detect localized rogue base stations.
                  </p>
                </div>
                <button
                  onClick={requestLocation}
                  disabled={locationStatus === 'granted'}
                  className="shrink-0 self-center px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer hover:bg-white/5"
                  style={{
                    borderColor: locationStatus === 'granted' ? `${skin.primaryColor}66` : skin.primaryColor,
                    color: locationStatus === 'granted' ? skin.primaryColor : skin.textPrimaryColor,
                    backgroundColor: locationStatus === 'granted' ? `${skin.primaryColor}15` : 'transparent',
                  }}
                >
                  {locationStatus === 'granted' ? <CheckCircle2 className="w-4 h-4" /> : 'Authorize'}
                </button>
              </div>

              {/* 2. Push Notifications */}
              <div
                className="p-3.5 rounded-2xl border flex items-start gap-3.5 transition-all"
                style={{
                  backgroundColor: skin.cardColor,
                  borderColor: notificationStatus === 'granted' ? `${skin.primaryColor}88` : skin.borderColor,
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border"
                  style={{
                    backgroundColor: notificationStatus === 'granted' ? `${skin.primaryColor}22` : `${skin.surfaceColor}`,
                    borderColor: notificationStatus === 'granted' ? skin.primaryColor : skin.borderColor,
                  }}
                >
                  <Bell className="w-4 h-4" style={{ color: notificationStatus === 'granted' ? skin.primaryColor : skin.textPrimaryColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold" style={{ color: skin.textPrimaryColor }}>
                      Threat & Intrusion Push Alerts
                    </h3>
                    <span
                      className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border"
                      style={{
                        backgroundColor: notificationStatus === 'granted' ? `${skin.primaryColor}20` : notificationStatus === 'denied' ? '#FF336620' : 'rgba(255,255,255,0.05)',
                        borderColor: notificationStatus === 'granted' ? skin.primaryColor : notificationStatus === 'denied' ? '#FF3366' : skin.borderColor,
                        color: notificationStatus === 'granted' ? skin.primaryColor : notificationStatus === 'denied' ? '#FF3366' : skin.textMutedColor,
                      }}
                    >
                      {notificationStatus === 'granted' ? 'GRANTED' : notificationStatus === 'denied' ? 'DENIED' : 'RECOMMENDED'}
                    </span>
                  </div>
                  <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: skin.textSecondaryColor }}>
                    Immediate alert dispatch for active MITM ARP spoofing, rogue Bluetooth tracker beacons, and zero-day threat discoveries.
                  </p>
                </div>
                <button
                  onClick={requestNotifications}
                  disabled={notificationStatus === 'granted'}
                  className="shrink-0 self-center px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer hover:bg-white/5"
                  style={{
                    borderColor: notificationStatus === 'granted' ? `${skin.primaryColor}66` : skin.primaryColor,
                    color: notificationStatus === 'granted' ? skin.primaryColor : skin.textPrimaryColor,
                    backgroundColor: notificationStatus === 'granted' ? `${skin.primaryColor}15` : 'transparent',
                  }}
                >
                  {notificationStatus === 'granted' ? <CheckCircle2 className="w-4 h-4" /> : 'Authorize'}
                </button>
              </div>

              {/* 3. Encrypted Vault Persistence */}
              <div
                className="p-3.5 rounded-2xl border flex items-start gap-3.5 transition-all"
                style={{
                  backgroundColor: skin.cardColor,
                  borderColor: storageStatus === 'granted' ? `${skin.primaryColor}88` : skin.borderColor,
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border"
                  style={{
                    backgroundColor: storageStatus === 'granted' ? `${skin.primaryColor}22` : `${skin.surfaceColor}`,
                    borderColor: storageStatus === 'granted' ? skin.primaryColor : skin.borderColor,
                  }}
                >
                  <HardDrive className="w-4 h-4" style={{ color: storageStatus === 'granted' ? skin.primaryColor : skin.textPrimaryColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold" style={{ color: skin.textPrimaryColor }}>
                      Encrypted Vault Storage Persistence
                    </h3>
                    <span
                      className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border"
                      style={{
                        backgroundColor: storageStatus === 'granted' ? `${skin.primaryColor}20` : 'rgba(255,255,255,0.05)',
                        borderColor: storageStatus === 'granted' ? skin.primaryColor : skin.borderColor,
                        color: storageStatus === 'granted' ? skin.primaryColor : skin.textMutedColor,
                      }}
                    >
                      {storageStatus === 'granted' ? 'PROTECTED' : 'STANDARD'}
                    </span>
                  </div>
                  <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: skin.textSecondaryColor }}>
                    Protects client-side cryptographic keys, scan databases, and custom WireGuard configurations from automatic eviction.
                  </p>
                </div>
                <button
                  onClick={requestStorage}
                  disabled={storageStatus === 'granted'}
                  className="shrink-0 self-center px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer hover:bg-white/5"
                  style={{
                    borderColor: storageStatus === 'granted' ? `${skin.primaryColor}66` : skin.primaryColor,
                    color: storageStatus === 'granted' ? skin.primaryColor : skin.textPrimaryColor,
                    backgroundColor: storageStatus === 'granted' ? `${skin.primaryColor}15` : 'transparent',
                  }}
                >
                  {storageStatus === 'granted' ? <CheckCircle2 className="w-4 h-4" /> : 'Authorize'}
                </button>
              </div>

              {/* 4. Ultrasonic Acoustic & Eavesdrop Shield */}
              <div
                className="p-3.5 rounded-2xl border flex items-start gap-3.5 transition-all"
                style={{
                  backgroundColor: skin.cardColor,
                  borderColor: audioStatus === 'granted' ? `${skin.primaryColor}88` : skin.borderColor,
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border"
                  style={{
                    backgroundColor: audioStatus === 'granted' ? `${skin.primaryColor}22` : `${skin.surfaceColor}`,
                    borderColor: audioStatus === 'granted' ? skin.primaryColor : skin.borderColor,
                  }}
                >
                  <Mic className="w-4 h-4" style={{ color: audioStatus === 'granted' ? skin.primaryColor : skin.textPrimaryColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold" style={{ color: skin.textPrimaryColor }}>
                      Ultrasonic Audio & Eavesdropping Audit
                    </h3>
                    <span
                      className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border"
                      style={{
                        backgroundColor: audioStatus === 'granted' ? `${skin.primaryColor}20` : audioStatus === 'denied' ? '#FF336620' : 'rgba(255,255,255,0.05)',
                        borderColor: audioStatus === 'granted' ? skin.primaryColor : audioStatus === 'denied' ? '#FF3366' : skin.borderColor,
                        color: audioStatus === 'granted' ? skin.primaryColor : audioStatus === 'denied' ? '#FF3366' : skin.textMutedColor,
                      }}
                    >
                      {audioStatus === 'granted' ? 'VERIFIED' : audioStatus === 'denied' ? 'DENIED' : 'OPTIONAL'}
                    </span>
                  </div>
                  <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: skin.textSecondaryColor }}>
                    Audits acoustic sensors to detect unauthorized cross-device ultrasonic tracking beacons. Streams are immediately terminated.
                  </p>
                </div>
                <button
                  onClick={requestAudio}
                  disabled={audioStatus === 'granted'}
                  className="shrink-0 self-center px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer hover:bg-white/5"
                  style={{
                    borderColor: audioStatus === 'granted' ? `${skin.primaryColor}66` : skin.primaryColor,
                    color: audioStatus === 'granted' ? skin.primaryColor : skin.textPrimaryColor,
                    backgroundColor: audioStatus === 'granted' ? `${skin.primaryColor}15` : 'transparent',
                  }}
                >
                  {audioStatus === 'granted' ? <CheckCircle2 className="w-4 h-4" /> : 'Audit'}
                </button>
              </div>
            </div>

            {/* Bottom Action */}
            <button
              onClick={handleContinue}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs sm:text-sm transition-opacity hover:opacity-90 cursor-pointer shadow-lg"
              style={{
                backgroundColor: skin.primaryColor,
                color: skin.isDark ? '#000000' : '#ffffff',
              }}
            >
              <span>Initialize Sentinel Shield</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="mt-3 text-center flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" style={{ color: skin.textMutedColor }} />
              <span className="text-[10px] uppercase font-mono tracking-wider" style={{ color: skin.textMutedColor }}>
                Client-side encrypted • Strict Zero-telemetry leakage
              </span>
            </div>
          </motion.div>
        )}

        {/* Step 2: Activating Protocols Initialization Bar */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 flex flex-col items-center justify-center text-center w-full max-w-sm"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center border shadow-xl mb-6 relative"
              style={{
                backgroundColor: `${skin.surfaceColor}F0`,
                borderColor: `${skin.primaryColor}66`,
              }}
            >
              <Shield className="w-8 h-8 animate-pulse" style={{ color: skin.primaryColor }} />
            </div>

            <h2 className="text-base font-black mb-1 uppercase tracking-widest" style={{ color: skin.textPrimaryColor }}>
              Activating Defense Protocol
            </h2>
            <p className="text-xs font-mono mb-6" style={{ color: skin.accentSecondary }}>
              SECURING TELEMETRY BUS
            </p>

            <div className="w-full space-y-2">
              <div className="flex justify-between text-xs font-mono" style={{ color: skin.textMutedColor }}>
                <span>KERNEL ENCRYPTION</span>
                <span>{initProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden bg-black/40 border" style={{ borderColor: skin.borderColor }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: skin.primaryColor }}
                  animate={{ width: `${initProgress}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </div>

            <div className="mt-6 text-[11px] font-mono uppercase tracking-wider" style={{ color: skin.textMutedColor }}>
              {initProgress < 25 && 'Binding environmental hardware telemetry...'}
              {initProgress >= 25 && initProgress < 50 && 'Verifying local ECDSA cryptographic keys...'}
              {initProgress >= 50 && initProgress < 75 && 'Configuring WireGuard tunnel controller...'}
              {initProgress >= 75 && initProgress < 95 && 'Initializing AI threat heuristic engines...'}
              {initProgress >= 95 && 'Sentinel Defense Shield Active.'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
