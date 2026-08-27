import React, { useState, useEffect, useCallback } from 'react';
import {
  ActiveTab,
  AppSkinId,
  AppSkinConfig,
  AppLanguageCode,
  CapabilityEvidence,
  ThreatItem,
  DeviceLocationState,
} from './types';
import { APP_SKINS, getSkinById } from './data/themes';
import { CapabilityEvidenceEngine } from './services/evidenceEngine';
import { ScanDatabase } from './services/scanDatabase';
import { VpnTunnelStore } from './services/vpnStore';
import { Navigation } from './components/Navigation';
import { DashboardView } from './views/DashboardView';
import { RadarView } from './views/RadarView';
import { VpnView } from './views/VpnView';
import { CallSecurityView } from './views/CallSecurityView';
import { AiScannerView } from './views/AiScannerView';
import { NetworkAuditView } from './views/NetworkAuditView';
import { DarkWebView } from './views/DarkWebView';
import { LegalView } from './views/LegalView';
import { VaultView } from './views/VaultView';
import { HelpModal } from './views/HelpModal';
import { AiAssistantModal } from './components/AiAssistantModal';
import { SplashScreenView } from './views/SplashScreenView';
import { AnimatePresence, motion } from 'motion/react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'alert';
}

export const App: React.FC = () => {
  // App state
  const [currentSkinId, setCurrentSkinId] = useState<AppSkinId>('phosphor');
  const [currentLanguage, setCurrentLanguage] = useState<AppLanguageCode>('en');
  const [activeTab, setActiveTab] = useState<ActiveTab>('shield');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(() => {
    return localStorage.getItem('sentinel_onboarding_complete') !== 'true';
  });

  // Evidences & threats
  const [evidences, setEvidences] = useState<CapabilityEvidence[]>(CapabilityEvidenceEngine.getEvidences());
  const [threats, setThreats] = useState<ThreatItem[]>(ScanDatabase.getThreats());
  const [overallScore, setOverallScore] = useState<number>(CapabilityEvidenceEngine.calculateOverallScore());
  
  // Toast state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'alert') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Location state
  const [location, setLocation] = useState<DeviceLocationState>({
    hasFix: false,
    latitude: null,
    longitude: null,
    accuracyMeters: null,
    coordinateLabel: 'Searching GPS constellation...',
    isLiveGps: false,
    timestamp: Date.now(),
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocation({
            hasFix: true,
            latitude: lat,
            longitude: lng,
            accuracyMeters: position.coords.accuracy,
            coordinateLabel: `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° W (LIVE_FIX)`,
            isLiveGps: true,
            timestamp: Date.now(),
          });
        },
        (error) => {
          console.warn('Geolocation failed, falling back to simulated fix.', error);
          setLocation({
            hasFix: true,
            latitude: 47.6062,
            longitude: -122.3321,
            accuracyMeters: 4.2,
            coordinateLabel: '47.6062° N, 122.3321° W (SEATTLE_MUNI)',
            isLiveGps: false,
            timestamp: Date.now(),
          });
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  const skin: AppSkinConfig = getSkinById(currentSkinId);

  const handleOnboardingComplete = () => {
    localStorage.setItem('sentinel_onboarding_complete', 'true');
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreenView onComplete={handleOnboardingComplete} skin={skin} />;
  }

  // Initialization
  useEffect(() => {
    VpnTunnelStore.init();

    // Geolocation API check
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            hasFix: true,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracyMeters: pos.coords.accuracy,
            coordinateLabel: `${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E`,
            timestampEpochMs: Date.now(),
          });
        },
        (err) => {
          console.warn('Geolocation fallback:', err.message);
          setLocation({
            hasFix: true,
            latitude: 45.815,
            longitude: 15.9819,
            accuracyMeters: 15,
            coordinateLabel: '45.8150° N, 15.9819° E (Zagreb Node)',
            timestampEpochMs: Date.now(),
          });
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  const handleRunFullAudit = async () => {
    await CapabilityEvidenceEngine.refreshAllEvidences();
    const updatedEvidences = CapabilityEvidenceEngine.getEvidences();
    setEvidences(updatedEvidences);
    const score = CapabilityEvidenceEngine.calculateOverallScore();
    setOverallScore(score);

    ScanDatabase.addLog({
      scanDate: new Date().toLocaleString(),
      overallScore: score,
      threatsFound: threats.filter((t) => !t.isResolved).length,
      summary: `Deep system audit completed with score ${score}%. All runtime evidence verified.`,
      resolved: threats.filter((t) => !t.isResolved).length === 0,
      timestamp: Date.now(),
    });
    
    addToast(`Deep system audit completed. Score: ${score}%`, 'success');
  };

  const handleResolveThreat = (id: string) => {
    const updated = ScanDatabase.resolveThreat(id);
    setThreats(updated);
    addToast('Security threat resolved and mitigated successfully.', 'success');
  };

  const handleAddThreat = (threat: ThreatItem) => {
    const updated = ScanDatabase.addThreat(threat);
    setThreats(updated);
    addToast('New security threat detected!', 'alert');
  };

  return (
    <div
      className="min-h-screen flex flex-col font-sans transition-colors duration-300 antialiased selection:bg-emerald-500 selection:text-black relative"
      style={{
        backgroundColor: skin.bgColor,
        color: skin.textPrimaryColor,
      }}
    >
      {/* Header & Drawer Navigation */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenAdvisor={() => setIsAdvisorOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        isDrawerOpen={isDrawerOpen}
        onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
        score={overallScore}
        language={currentLanguage}
        skin={skin}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 pb-24">
        {activeTab === 'shield' && (
          <DashboardView
            score={overallScore}
            evidences={evidences}
            threats={threats}
            onResolveThreat={handleResolveThreat}
            onRunAudit={handleRunFullAudit}
            onNavigateTab={(tab) => setActiveTab(tab as ActiveTab)}
            onOpenHelp={() => setIsHelpOpen(true)}
            skin={skin}
          />
        )}

        {activeTab === 'radar' && (
          <RadarView location={location} skin={skin} />
        )}

        {activeTab === 'vpn' && (
          <VpnView skin={skin} />
        )}

        {activeTab === 'call_sec' && (
          <CallSecurityView skin={skin} />
        )}

        {activeTab === 'ai_scanner' && (
          <AiScannerView
            threats={threats}
            onAddThreat={handleAddThreat}
            onResolveThreat={handleResolveThreat}
            onOpenAdvisorChat={() => setIsAdvisorOpen(true)}
            skin={skin}
          />
        )}

        {activeTab === 'network_audit' && (
          <NetworkAuditView skin={skin} />
        )}

        {activeTab === 'dark_web' && (
          <DarkWebView skin={skin} />
        )}

        {activeTab === 'legal' && (
          <LegalView skin={skin} />
        )}

        {activeTab === 'vault' && (
          <VaultView
            currentSkinId={currentSkinId}
            onSelectSkin={setCurrentSkinId}
            currentLanguage={currentLanguage}
            onSelectLanguage={setCurrentLanguage}
            skin={skin}
          />
        )}
      </main>

      {/* Interactive AI Cyber Advisor Modal */}
      <AiAssistantModal
        isOpen={isAdvisorOpen}
        onClose={() => setIsAdvisorOpen(false)}
        skin={skin}
      />

      {/* Capability Evidence Help Guide Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        skin={skin}
      />

      {/* Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md pointer-events-auto"
              style={{
                backgroundColor: skin.surfaceColor,
                borderColor: toast.type === 'alert' ? '#ef4444' : skin.primaryColor,
                color: skin.textPrimaryColor,
              }}
            >
              {toast.type === 'alert' ? (
                <ShieldAlert className="w-5 h-5 text-red-500" />
              ) : (
                <CheckCircle2
                  className="w-5 h-5"
                  style={{ color: skin.primaryColor }}
                />
              )}
              <span className="text-sm font-medium">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default App;
