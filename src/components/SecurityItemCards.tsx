import React from 'react';
import { ThreatItem, VpnServer, AppSkinConfig } from '../types';
import { ShieldAlert, CheckCircle2, Lock, ArrowUpRight, Signal } from 'lucide-react';

interface ThreatAlertCardProps {
  threat: ThreatItem;
  onResolve: (id: string) => void;
  skin: AppSkinConfig;
}

export const ThreatAlertCard: React.FC<ThreatAlertCardProps> = ({
  threat,
  onResolve,
  skin,
}) => {
  const severityConfig = {
    CRITICAL: { color: '#FF1744', bg: 'rgba(255, 23, 68, 0.15)', border: 'rgba(255, 23, 68, 0.45)' },
    HIGH: { color: '#FF3366', bg: 'rgba(255, 51, 102, 0.15)', border: 'rgba(255, 51, 102, 0.45)' },
    MEDIUM: { color: '#FFB300', bg: 'rgba(255, 179, 0, 0.15)', border: 'rgba(255, 179, 0, 0.45)' },
    LOW: { color: '#00F0FF', bg: 'rgba(0, 240, 255, 0.15)', border: 'rgba(0, 240, 255, 0.45)' },
    SAFE: { color: skin.primaryColor, bg: `${skin.primaryColor}18`, border: `${skin.primaryColor}55` },
  }[threat.severity];

  return (
    <div
      id={`threat-alert-${threat.id}`}
      className="p-4 rounded-2xl border transition-all duration-200"
      style={{
        backgroundColor: skin.cardColor,
        borderColor: threat.isResolved ? `${skin.borderColor}66` : severityConfig.border,
        opacity: threat.isResolved ? 0.75 : 1,
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-black tracking-widest px-2.5 py-0.5 rounded uppercase"
            style={{
              color: severityConfig.color,
              backgroundColor: severityConfig.bg,
              border: `1px solid ${severityConfig.border}`,
            }}
          >
            {threat.severity} RISK
          </span>
          <span className="text-xs font-mono" style={{ color: skin.textMutedColor }}>
            {threat.category}
          </span>
        </div>
        {threat.isResolved ? (
          <span className="text-[11px] font-bold flex items-center gap-1" style={{ color: skin.primaryColor }}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            RESOLVED
          </span>
        ) : (
          <button
            onClick={() => onResolve(threat.id)}
            className="text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer hover:brightness-110"
            style={{
              backgroundColor: skin.surfaceColor,
              borderColor: skin.borderColor,
              color: skin.textPrimaryColor,
            }}
          >
            Resolve
          </button>
        )}
      </div>

      <h4 className="text-sm font-bold mb-1" style={{ color: skin.textPrimaryColor }}>
        {threat.title}
      </h4>

      <p className="text-xs leading-relaxed mb-3" style={{ color: skin.textSecondaryColor }}>
        {threat.description}
      </p>

      <div
        className="p-2.5 rounded-xl flex items-start gap-2 text-xs"
        style={{ backgroundColor: skin.surfaceColor, border: `1px solid ${skin.borderColor}55` }}
      >
        <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: skin.accentSecondary }} />
        <span style={{ color: skin.textPrimaryColor }}>
          <strong>Recommendation:</strong> {threat.recommendation}
        </span>
      </div>
    </div>
  );
};

interface VpnServerCardProps {
  server: VpnServer;
  isSelected: boolean;
  isConnected: boolean;
  onSelect: () => void;
  skin: AppSkinConfig;
}

export const VpnServerCard: React.FC<VpnServerCardProps> = ({
  server,
  isSelected,
  isConnected,
  onSelect,
  skin,
}) => {
  return (
    <div
      id={`vpn-server-${server.id}`}
      onClick={onSelect}
      className="p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 hover:scale-[1.01]"
      style={{
        backgroundColor: isSelected ? skin.surfaceColor : skin.cardColor,
        borderColor: isSelected ? skin.primaryColor : skin.borderColor,
      }}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <span className="text-2xl shrink-0">{server.flagEmoji}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold truncate" style={{ color: skin.textPrimaryColor }}>
              {server.country}
            </h4>
            {server.isPremium && (
              <span
                className="text-[9px] font-black px-1.5 py-0.5 rounded tracking-wider"
                style={{
                  backgroundColor: `${skin.accentSecondary}22`,
                  color: skin.accentSecondary,
                  border: `1px solid ${skin.accentSecondary}44`,
                }}
              >
                PRO
              </span>
            )}
            {server.privacyType === 'Privacy Haven' && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                HAVEN
              </span>
            )}
          </div>
          <p className="text-xs truncate font-mono" style={{ color: skin.textSecondaryColor }}>
            {server.city} • {server.protocol}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <div className="text-xs font-mono font-bold flex items-center justify-end gap-1" style={{ color: server.pingMs < 30 ? skin.primaryColor : '#FFB300' }}>
            <Signal className="w-3 h-3" />
            <span>{server.pingMs} ms</span>
          </div>
          <div className="text-[10px]" style={{ color: skin.textMutedColor }}>
            Rating: {server.jurisdictionScore || 80}/100
          </div>
        </div>
        <div
          className="w-5 h-5 rounded-full border flex items-center justify-center transition-all"
          style={{
            borderColor: isSelected ? skin.primaryColor : skin.borderColor,
            backgroundColor: isSelected ? `${skin.primaryColor}22` : 'transparent',
          }}
        >
          {isSelected && (
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: skin.primaryColor }} />
          )}
        </div>
      </div>
    </div>
  );
};
