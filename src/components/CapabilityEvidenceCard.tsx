import React from 'react';
import { CapabilityEvidence } from '../types';
import { ShieldCheck, AlertTriangle, XCircle, Info, Clock } from 'lucide-react';
import { AppSkinConfig } from '../types';

interface Props {
  evidence: CapabilityEvidence;
  skin: AppSkinConfig;
}

export const CapabilityEvidenceCard: React.FC<Props> = ({ evidence, skin }) => {
  const isExpired = Date.now() >= evidence.expiresAtEpochMs;
  const effectiveStatus = isExpired ? 'UNVERIFIED' : evidence.status;

  const statusConfig = {
    VERIFIED: {
      color: skin.primaryColor,
      bg: `${skin.primaryColor}18`,
      border: `${skin.primaryColor}55`,
      icon: ShieldCheck,
      label: 'VERIFIED',
    },
    UNVERIFIED: {
      color: '#FFB300',
      bg: 'rgba(255, 179, 0, 0.12)',
      border: 'rgba(255, 179, 0, 0.4)',
      icon: AlertTriangle,
      label: isExpired ? 'EXPIRED (UNVERIFIED)' : 'UNVERIFIED',
    },
    UNAVAILABLE: {
      color: skin.textMutedColor,
      bg: 'rgba(120, 120, 120, 0.1)',
      border: 'rgba(120, 120, 120, 0.25)',
      icon: XCircle,
      label: 'UNAVAILABLE',
    },
  }[effectiveStatus];

  const IconComp = statusConfig.icon;

  return (
    <div
      id={`evidence-card-${evidence.id.toLowerCase()}`}
      className="p-4 rounded-xl border transition-all duration-200"
      style={{
        backgroundColor: skin.cardColor,
        borderColor: statusConfig.border,
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
            style={{ backgroundColor: statusConfig.color }}
          />
          <h4
            className="text-sm font-bold truncate"
            style={{ color: skin.textPrimaryColor }}
          >
            {evidence.title}
          </h4>
        </div>
        <span
          className="text-[10px] font-black tracking-wider px-2 py-0.5 rounded uppercase shrink-0 flex items-center gap-1"
          style={{
            color: statusConfig.color,
            backgroundColor: statusConfig.bg,
            border: `1px solid ${statusConfig.border}`,
          }}
        >
          <IconComp className="w-3 h-3" />
          {statusConfig.label}
        </span>
      </div>

      <div className="text-[11px] font-mono mb-1.5 flex items-center gap-1.5 flex-wrap" style={{ color: skin.textMutedColor }}>
        <span>Izvor: <strong style={{ color: skin.textSecondaryColor }}>{evidence.source}</strong></span>
        {evidence.provenance && (
          <>
            <span>•</span>
            <span className="truncate">Pravilo: {evidence.provenance.verificationRule}</span>
          </>
        )}
      </div>

      <p className="text-xs leading-relaxed" style={{ color: skin.textSecondaryColor }}>
        {evidence.details}
      </p>

      <div className="mt-2.5 pt-2 border-t flex items-center justify-between text-[10px]" style={{ borderColor: `${skin.borderColor}55`, color: skin.textMutedColor }}>
        <span className="flex items-center gap-1 font-mono">
          <Clock className="w-3 h-3" />
          Provjereno: {new Date(evidence.lastCheckedEpochMs).toLocaleTimeString()}
        </span>
        <span className="flex items-center gap-1 font-mono">
          <Info className="w-3 h-3" />
          TTL: 5m
        </span>
      </div>
    </div>
  );
};
