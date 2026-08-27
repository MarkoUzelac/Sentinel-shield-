import React, { useState } from 'react';
import { AppSkinConfig, AppSkinId, AppLanguageCode, ScanLog } from '../types';
import { APP_SKINS } from '../data/themes';
import { APP_LANGUAGES } from '../data/translations';
import { ScanDatabase } from '../services/scanDatabase';
import { Star, ShieldCheck, Check, Key, Globe, Palette, History, Trash2, CheckCircle2 } from 'lucide-react';

interface Props {
  currentSkinId: AppSkinId;
  onSelectSkin: (id: AppSkinId) => void;
  currentLanguage: AppLanguageCode;
  onSelectLanguage: (lang: AppLanguageCode) => void;
  skin: AppSkinConfig;
}

export const VaultView: React.FC<Props> = ({
  currentSkinId,
  onSelectSkin,
  currentLanguage,
  onSelectLanguage,
  skin,
}) => {
  const [logs, setLogs] = useState<ScanLog[]>(ScanDatabase.getLogs());

  const handleClearLogs = () => {
    setLogs(ScanDatabase.clearLogs());
  };

  const proFeatures = [
    'Real-Time System & Hardware Security Guard',
    'Gemini AI Phishing & APK Malware Scanner',
    'Unlimited Zero-Log WireGuard VPN Tunnel',
    'Dark Web Identity Breach Continuous Monitor',
    '14-Eyes Privacy Haven Routing & Jurisdiction Vault',
    'Tactical RF & IMSI Base Station Radar Sweep',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <span className="text-[10px] font-bold font-mono tracking-widest uppercase px-2 py-0.5 rounded" style={{ backgroundColor: `${skin.primaryColor}22`, color: skin.primaryColor }}>
          LICENSE & THEME VAULT
        </span>
        <h2 className="text-xl font-black mt-1" style={{ color: skin.textPrimaryColor }}>
          Sentinel Pro License & Customization
        </h2>
        <p className="text-xs mt-0.5" style={{ color: skin.textSecondaryColor }}>
          Manage your lifetime cryptographic license certificate, UI visual themes, multi-language localization, and scan audit logs.
        </p>
      </div>

      {/* Active License Card */}
      <div
        id="license-vault-card"
        className="p-6 rounded-3xl border space-y-4 relative overflow-hidden"
        style={{
          backgroundColor: skin.cardColor,
          borderColor: skin.primaryColor,
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center border"
            style={{
              backgroundColor: `${skin.primaryColor}22`,
              borderColor: skin.primaryColor,
            }}
          >
            <Star className="w-6 h-6" style={{ color: skin.primaryColor }} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black" style={{ color: skin.textPrimaryColor }}>
                Sentinel Pro Lifetime Active
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                VERIFIED
              </span>
            </div>
            <div className="text-xs font-mono mt-0.5" style={{ color: skin.accentSecondary }}>
              Key: SENTINEL-PRO-2026-9981-XQ
            </div>
          </div>
        </div>

        <p className="text-xs" style={{ color: skin.textSecondaryColor }}>
          Unlimited Gemini AI Threat Audits, Zero-Log WireGuard VPN, Dark Web Surveillance, and priority Swiss node routing included.
        </p>

        <div className="pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-2" style={{ borderColor: `${skin.borderColor}55` }}>
          {proFeatures.map((feat, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs" style={{ color: skin.textPrimaryColor }}>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Skins & Themes Selector */}
      <div className="p-5 rounded-3xl border space-y-4" style={{ backgroundColor: skin.cardColor, borderColor: skin.borderColor }}>
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5" style={{ color: skin.primaryColor }} />
          <h3 className="text-sm font-bold" style={{ color: skin.textPrimaryColor }}>
            Visual Themes & Display Skins
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {Object.values(APP_SKINS).map((cand) => {
            const isSelected = cand.id === currentSkinId;
            return (
              <button
                key={cand.id}
                onClick={() => onSelectSkin(cand.id)}
                className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-left transition-all cursor-pointer hover:scale-[1.01]"
                style={{
                  backgroundColor: isSelected ? skin.surfaceColor : 'transparent',
                  borderColor: isSelected ? cand.primaryColor : skin.borderColor,
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cand.icon}</span>
                  <div>
                    <div className="text-xs font-bold" style={{ color: skin.textPrimaryColor }}>
                      {cand.displayName}
                    </div>
                    <div className="text-[10px]" style={{ color: skin.textMutedColor }}>
                      {cand.isDark ? 'Dark Tactical Mode' : 'Light Clean Mode'}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: cand.primaryColor, color: cand.isDark ? '#000' : '#fff' }}
                  >
                    ✓
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Language / Locale Selector */}
      <div className="p-5 rounded-3xl border space-y-4" style={{ backgroundColor: skin.cardColor, borderColor: skin.borderColor }}>
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5" style={{ color: skin.primaryColor }} />
          <h3 className="text-sm font-bold" style={{ color: skin.textPrimaryColor }}>
            Interface Language
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {APP_LANGUAGES.map((lang) => {
            const isSelected = lang.code === currentLanguage;
            return (
              <button
                key={lang.code}
                onClick={() => onSelectLanguage(lang.code)}
                className="p-3 rounded-2xl border flex items-center justify-between gap-2 text-xs font-bold cursor-pointer transition-all"
                style={{
                  backgroundColor: isSelected ? skin.surfaceColor : 'transparent',
                  borderColor: isSelected ? skin.primaryColor : skin.borderColor,
                  color: skin.textPrimaryColor,
                }}
              >
                <div className="flex items-center gap-2 truncate">
                  <span>{lang.flag}</span>
                  <span className="truncate">{lang.displayName}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: skin.primaryColor }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scan History Audit Log */}
      <div className="p-5 rounded-3xl border space-y-4" style={{ backgroundColor: skin.cardColor, borderColor: skin.borderColor }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5" style={{ color: skin.primaryColor }} />
            <h3 className="text-sm font-bold" style={{ color: skin.textPrimaryColor }}>
              Audit History Logs ({logs.length})
            </h3>
          </div>
          {logs.length > 0 && (
            <button
              onClick={handleClearLogs}
              className="text-xs flex items-center gap-1 text-rose-400 hover:underline cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        <div className="space-y-2">
          {logs.length === 0 ? (
            <p className="text-xs" style={{ color: skin.textMutedColor }}>
              No audit logs recorded yet.
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl border flex items-center justify-between gap-3 text-xs"
                style={{ backgroundColor: skin.surfaceColor, borderColor: skin.borderColor }}
              >
                <div className="min-w-0">
                  <div className="font-bold truncate" style={{ color: skin.textPrimaryColor }}>
                    {log.summary}
                  </div>
                  <div className="text-[10px] font-mono" style={{ color: skin.textMutedColor }}>
                    {log.scanDate}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold font-mono text-emerald-400">
                    {log.overallScore}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
