import React from 'react';
import { ActiveTab, AppSkinConfig, AppLanguageCode } from '../types';
import { getTranslation } from '../data/translations';
import {
  Shield,
  Radio,
  Network,
  PhoneCall,
  Sparkles,
  Activity,
  Search,
  Gavel,
  Vault,
  Menu,
  X,
  Bot,
  HelpCircle,
  Star,
  CheckCircle2,
  Cpu,
} from 'lucide-react';

interface Props {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenAdvisor: () => void;
  onOpenHelp: () => void;
  isDrawerOpen: boolean;
  onToggleDrawer: () => void;
  score: number;
  language: AppLanguageCode;
  skin: AppSkinConfig;
}

export const Navigation: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  onOpenAdvisor,
  onOpenHelp,
  isDrawerOpen,
  onToggleDrawer,
  score,
  language,
  skin,
}) => {
  const bottomTabs = [
    { id: 'shield' as ActiveTab, icon: Shield, labelKey: 'tab_shield' },
    { id: 'radar' as ActiveTab, icon: Radio, labelKey: 'tab_radar' },
    { id: 'vpn' as ActiveTab, icon: Network, labelKey: 'tab_vpn' },
    { id: 'call_sec' as ActiveTab, icon: PhoneCall, labelKey: 'tab_call_sec' },
    { id: 'ai_scanner' as ActiveTab, icon: Sparkles, labelKey: 'tab_ai_scanner' },
    { id: 'vault' as ActiveTab, icon: Vault, labelKey: 'tab_vault' },
  ];

  const drawerMenuItems = [
    { id: 'shield' as ActiveTab, icon: Shield, label: 'Dashboard & Shield' },
    { id: 'radar' as ActiveTab, icon: Radio, label: 'RF & IMSI Radar' },
    { id: 'telemetry' as ActiveTab, icon: Cpu, label: 'Hardware Telemetry' },
    { id: 'vpn' as ActiveTab, icon: Network, label: 'WireGuard VPN' },
    { id: 'call_sec' as ActiveTab, icon: PhoneCall, label: 'Calls & MMI Audit' },
    { id: 'ai_scanner' as ActiveTab, icon: Sparkles, label: 'AI Threat Scanner' },
    { id: 'network_audit' as ActiveTab, icon: Activity, label: 'Network & Latency Audit' },
    { id: 'dark_web' as ActiveTab, icon: Search, label: 'Dark Web Exposure' },
    { id: 'legal' as ActiveTab, icon: Gavel, label: 'Legal Privacy Rights' },
    { id: 'vault' as ActiveTab, icon: Vault, label: 'License & Settings' },
  ];

  return (
    <>
      {/* Top App Bar */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-md transition-colors"
        style={{
          backgroundColor: `${skin.surfaceColor}E6`,
          borderColor: skin.borderColor,
        }}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleDrawer}
              className="p-2 rounded-xl border transition-colors cursor-pointer hover:bg-white/5"
              style={{ borderColor: skin.borderColor, color: skin.textPrimaryColor }}
              aria-label="Toggle Navigation Drawer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center border"
                style={{
                  backgroundColor: `${skin.primaryColor}22`,
                  borderColor: `${skin.primaryColor}55`,
                }}
              >
                <Shield className="w-4 h-4" style={{ color: skin.primaryColor }} />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tight" style={{ color: skin.textPrimaryColor }}>
                  SENTINEL SHIELD PRO
                </h1>
                <div className="text-[10px] font-mono leading-none" style={{ color: skin.accentSecondary }}>
                  LIFETIME VAULT ENCRYPTED
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Real-time score pill */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-mono font-bold"
              style={{
                backgroundColor: `${skin.primaryColor}18`,
                borderColor: `${skin.primaryColor}55`,
                color: skin.primaryColor,
              }}
            >
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: skin.primaryColor }} />
              <span>SCORE: {score}%</span>
            </div>

            {/* AI Advisor Button */}
            <button
              onClick={onOpenAdvisor}
              className="p-2 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer hover:scale-105"
              style={{
                backgroundColor: `${skin.accentSecondary}22`,
                borderColor: `${skin.accentSecondary}55`,
                color: skin.accentSecondary,
              }}
            >
              <Bot className="w-4 h-4" />
              <span className="hidden md:inline">AI Advisor</span>
            </button>
          </div>
        </div>
      </header>

      {/* Side Drawer Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={onToggleDrawer}
          />
          <div
            className="relative w-80 max-w-[85vw] h-full flex flex-col border-r z-10 shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-200"
            style={{
              backgroundColor: skin.bgColor,
              borderColor: skin.primaryColor,
            }}
          >
            {/* Drawer Header */}
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: skin.borderColor }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center border"
                  style={{ backgroundColor: `${skin.primaryColor}22`, borderColor: skin.primaryColor }}
                >
                  <Shield className="w-5 h-5" style={{ color: skin.primaryColor }} />
                </div>
                <div>
                  <h3 className="text-sm font-black" style={{ color: skin.textPrimaryColor }}>
                    Sentinel Shield Pro
                  </h3>
                  <div className="text-[11px] font-mono text-emerald-400">
                    Active License
                  </div>
                </div>
              </div>

              <button
                onClick={onToggleDrawer}
                className="p-1.5 rounded-lg border hover:bg-white/10 cursor-pointer"
                style={{ borderColor: skin.borderColor, color: skin.textPrimaryColor }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation items */}
            <div className="p-3 space-y-1 flex-1">
              {drawerMenuItems.map((item) => {
                const isSelected = activeTab === item.id;
                const IconComp = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      onToggleDrawer();
                    }}
                    className="w-full p-3 rounded-2xl flex items-center gap-3 text-xs font-bold transition-all text-left cursor-pointer"
                    style={{
                      backgroundColor: isSelected ? `${skin.primaryColor}22` : 'transparent',
                      color: isSelected ? skin.primaryColor : skin.textPrimaryColor,
                      border: isSelected ? `1px solid ${skin.primaryColor}55` : '1px solid transparent',
                    }}
                  >
                    <IconComp className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t space-y-2" style={{ borderColor: skin.borderColor, backgroundColor: skin.surfaceColor }}>
              <button
                onClick={() => {
                  onOpenHelp();
                  onToggleDrawer();
                }}
                className="w-full p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold cursor-pointer hover:bg-white/5"
                style={{ borderColor: skin.borderColor, color: skin.textSecondaryColor }}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Evidence Standard Guide</span>
              </button>

              <div className="text-center text-[10px] font-mono" style={{ color: skin.textMutedColor }}>
                Sentinel Shield Pro v2.8.0-Pro
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Tab Bar for Mobile & Quick Desktop Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md"
        style={{
          backgroundColor: `${skin.surfaceColor}F2`,
          borderColor: skin.borderColor,
        }}
      >
        <div className="max-w-xl mx-auto px-2 h-16 flex items-center justify-around">
          {bottomTabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            const IconComp = tab.icon;
            const label = getTranslation(tab.labelKey, language);

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className="flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer relative"
                style={{
                  color: isSelected ? skin.primaryColor : skin.textMutedColor,
                }}
              >
                <IconComp className={`w-5 h-5 transition-transform ${isSelected ? 'scale-110' : ''}`} />
                <span className="text-[10px] font-bold mt-1 tracking-tight truncate max-w-[64px]">
                  {label}
                </span>
                {isSelected && (
                  <div
                    className="absolute -bottom-1 w-6 h-0.5 rounded-full"
                    style={{ backgroundColor: skin.primaryColor }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
