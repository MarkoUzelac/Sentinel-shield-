import React, { useState } from 'react';
import { CapabilityEvidence, AppSkinConfig } from '../types';
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Clock,
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { ThreatSnapshotEngine } from '../services/threatSnapshotEngine';
import { MmiAuditService } from '../services/mmiAuditService';

interface Props {
  evidence: CapabilityEvidence;
  skin: AppSkinConfig;
  onNavigateTab?: (tab: string) => void;
}

export const CapabilityEvidenceCard: React.FC<Props> = ({ evidence, skin, onNavigateTab }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isExecutingAction, setIsExecutingAction] = useState(false);

  const now = Date.now();
  const isExpired = evidence.isStale || now >= evidence.expiresAtEpochMs;
  const effectiveStatus = isExpired && evidence.status === 'VERIFIED' ? 'UNVERIFIED' : evidence.status;

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
    FAILED: {
      color: '#FF3366',
      bg: 'rgba(255, 51, 102, 0.14)',
      border: 'rgba(255, 51, 102, 0.45)',
      icon: ShieldAlert,
      label: 'FAILED',
    },
  }[effectiveStatus] || {
    color: skin.textMutedColor,
    bg: 'rgba(120, 120, 120, 0.1)',
    border: 'rgba(120, 120, 120, 0.25)',
    icon: XCircle,
    label: 'UNAVAILABLE',
  };

  const IconComp = statusConfig.icon;

  const handleActionClick = async () => {
    if (!evidence.actionRequired) return;
    setIsExecutingAction(true);

    try {
      const action = evidence.actionRequired.action;
      if (action === 'REQUEST_PERMISSION') {
        await ThreatSnapshotEngine.requestGeolocationPermission();
      } else if (action === 'OPEN_SETTINGS') {
        if (typeof window !== 'undefined') {
          alert('Please open your browser or device Settings > Site Permissions > Location and grant access.');
        }
      } else if (action === 'RUN_MMI' || action === 'RETRY_MMI') {
        await MmiAuditService.dispatchMmiInquiry('*#21#');
      } else if (action === 'CONNECT_VPN' || action === 'OPEN_VPN') {
        if (onNavigateTab) {
          onNavigateTab('vpn');
        }
      } else {
        await ThreatSnapshotEngine.executeFullAudit();
      }
    } catch (err) {
      console.warn('Evidence action error:', err);
    } finally {
      setIsExecutingAction(false);
    }
  };

  const remainingSeconds = Math.max(0, Math.round((evidence.expiresAtEpochMs - now) / 1000));

  return (
    <div
      id={`evidence-card-${evidence.id.toLowerCase()}`}
      className="p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between"
      style={{
        backgroundColor: skin.cardColor,
        borderColor: isExpired ? '#FFB30088' : statusConfig.border,
      }}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
              style={{ backgroundColor: statusConfig.color }}
            />
            <h4 className="text-sm font-bold truncate" style={{ color: skin.textPrimaryColor }}>
              {evidence.title}
            </h4>
          </div>
          <span
            className="text-[10px] font-black tracking-wider px-2 py-0.5 rounded uppercase shrink-0 flex items-center gap-1 font-mono"
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

        {/* Source & Rule */}
        <div
          className="text-[11px] font-mono mb-2 flex items-center gap-1.5 flex-wrap"
          style={{ color: skin.textMutedColor }}
        >
          <span>
            Source: <strong style={{ color: skin.textSecondaryColor }}>{evidence.source}</strong>
          </span>
          {evidence.provenance && (
            <>
              <span>•</span>
              <span className="truncate" title={evidence.provenance.verificationRule}>
                Rule: {evidence.provenance.verificationRule}
              </span>
            </>
          )}
        </div>

        {/* Reason / Details */}
        <div
          className="p-2.5 rounded-xl text-xs mb-3 leading-relaxed border"
          style={{
            backgroundColor: skin.surfaceColor,
            borderColor: `${skin.borderColor}66`,
            color: skin.textPrimaryColor,
          }}
        >
          <span className="font-semibold block mb-0.5 text-[11px]" style={{ color: statusConfig.color }}>
            {effectiveStatus === 'UNAVAILABLE'
              ? 'Capability Unavailable'
              : effectiveStatus === 'UNVERIFIED'
              ? 'Unverified Runtime State'
              : effectiveStatus === 'FAILED'
              ? 'Negative Condition Detected'
              : 'Verified Runtime Proof'}
          </span>
          {evidence.reason || evidence.details}
        </div>

        {/* Action Button (e.g. Grant Permission, Run inquiry) */}
        {evidence.actionRequired && (
          <div className="mb-3">
            <button
              onClick={handleActionClick}
              disabled={isExecutingAction}
              className="w-full py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
              style={{
                backgroundColor: statusConfig.bg,
                color: statusConfig.color,
                border: `1px solid ${statusConfig.border}`,
              }}
            >
              {isExecutingAction ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
              <span>{evidence.actionRequired.label}</span>
            </button>
          </div>
        )}

        {/* Expandable Limitations & Raw Telemetry */}
        {showDetails && (
          <div className="space-y-2 mb-3 pt-1 text-[11px] font-mono">
            {evidence.limitations && evidence.limitations.length > 0 && (
              <div
                className="p-2.5 rounded-xl border space-y-1"
                style={{ backgroundColor: `${skin.surfaceColor}99`, borderColor: skin.borderColor }}
              >
                <span className="font-bold text-[10px] uppercase text-amber-400 block">
                  Limitations & Sandbox Boundaries:
                </span>
                <ul className="list-disc list-inside space-y-0.5" style={{ color: skin.textSecondaryColor }}>
                  {evidence.limitations.map((lim, idx) => (
                    <li key={idx}>{lim}</li>
                  ))}
                </ul>
              </div>
            )}

            {evidence.evidence && Object.keys(evidence.evidence).length > 0 && (
              <div
                className="p-2.5 rounded-xl border overflow-x-auto text-[10px]"
                style={{ backgroundColor: `${skin.bgColor}99`, borderColor: skin.borderColor }}
              >
                <span className="font-bold text-[10px] uppercase text-slate-400 block mb-1">
                  Raw Evidence Object:
                </span>
                <pre className="text-emerald-400 whitespace-pre-wrap break-all">
                  {JSON.stringify(evidence.evidence, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info & Details Toggle */}
      <div
        className="pt-2 border-t flex items-center justify-between text-[10px]"
        style={{ borderColor: `${skin.borderColor}55`, color: skin.textMutedColor }}
      >
        <div className="flex items-center gap-2 font-mono">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(evidence.lastCheckedEpochMs).toLocaleTimeString()}
          </span>
          <span>•</span>
          <span
            className="flex items-center gap-0.5"
            style={{ color: isExpired ? '#FFB300' : skin.textMutedColor }}
          >
            <Info className="w-3 h-3" />
            {isExpired ? 'TTL EXPIRED' : `TTL: ${remainingSeconds}s`}
          </span>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-0.5 font-bold hover:underline cursor-pointer"
          style={{ color: skin.textSecondaryColor }}
        >
          <span>{showDetails ? 'Hide details' : 'Inspect proof'}</span>
          {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
};
