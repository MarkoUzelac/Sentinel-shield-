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
import { ThreatSnapshotEngine } from './services/threatSnapshotEngine';
import { ScanDatabase } from './services/scanDatabase';
import { VpnTunnelStore } from './services/vpnStore';
import { ipLocationService } from './services/geo';
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
import { ToastProvider, useToast } from './context/ToastContext';
import { ToastContainer } from './components/ToastContainer';

const AppContent: React.FC = () => {
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
  
  const { addToast } = useToast();

  // Location state
  const [location, setLocation] = useState<DeviceLocationState>(() => ThreatSnapshotEngine.getSnapshot().location);

  // Initialization
  useEffect(() => {
    VpnTunnelStore.init();

    // Subscribe to ThreatSnapshotEngine for single source of truth
    const unsubscribe = ThreatSnapshotEngine.subscribe((snapshot) => {
      setLocation(snapshot.location);
      setEvidences(snapshot.evidences);
      setOverallScore(snapshot.overallScore);
      setThreats(snapshot.threats);
    });

    // Request geolocation through canonical evidence engine
    ThreatSnapshotEngine.requestGeolocationPermission();

    return () => unsubscribe();
  }, []);

  const skin: AppSkinConfig = getSkinById(currentSkinId);

  const handleOnboardingComplete = () => {
    localStorage.setItem('sentinel_onboarding_complete', 'true');
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreenView onComplete={handleOnboardingComplete} skin={skin} />;
  }

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

      {/* Universal Toast Notification Container */}
      <ToastContainer skin={skin} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;
