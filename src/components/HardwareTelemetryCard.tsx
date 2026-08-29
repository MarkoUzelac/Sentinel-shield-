import React, { useState } from 'react';
import {
  AppSkinConfig,
  CapabilityAccessState,
  HardwareTelemetryState,
  RadarState,
} from '../types';
import {
  Radio,
  Bluetooth,
  MapPin,
  Cpu,
  Info,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Beaker,
  Lock,
} from 'lucide-react';

interface Props {
  hardwareState: HardwareTelemetryState;
  radarState: RadarState;
  isTestMode: boolean;
  skin: AppSkinConfig;
  onRequestLocationPermission?: () => void;
  onToggleTestMode?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const HardwareTelemetryCard: React.FC<Props> = ({
  hardwareState,
  radarState,
  isTestMode,
  skin,
  onRequestLocationPermission,
  onToggleTestMode,
  onNavigateTab,
}) => {
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);

  const getStatusBadge = (status: CapabilityAccessState) => {
    switch (status) {
      case 'LIVE':
        return {
          label: 'LIVE HARDWARE',
          color: '#10B981',
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.35)',
        };
      case 'BACKUP_API':
        return {
          label: 'BACKUP / API',
          color: '#00F0FF',
          bg: 'rgba(0, 240, 255, 0.15)',
          border: 'rgba(0, 240, 255, 0.35)',
        };
      case 'INFERRED':
        return {
          label: 'INFERRED',
          color: '#F59E0B',
          bg: 'rgba(245, 158, 11, 0.15)',
          border: 'rgba(245, 158, 11, 0.35)',
        };
      case 'TEST':
        return {
          label: 'TEST (SANDBOX)',
          color: '#C084FC',
          bg: 'rgba(192, 132, 252, 0.15)',
          border: 'rgba(192, 132, 252, 0.35)',
        };
      case 'PERMISSION_REQUIRED':
        return {
          label: 'PERMISSION REQUIRED',
          color: '#F59E0B',
          bg: 'rgba(245, 158, 11, 0.15)',
          border: 'rgba(245, 158, 11, 0.35)',
        };
      case 'UNAVAILABLE':
      default:
        return {
          label: 'UNAVAILABLE (BROWSER)',
          color: '#94A3B8',
          bg: 'rgba(148, 163, 184, 0.12)',
          border: 'rgba(148, 163, 184, 0.25)',
        };
    }
  };

  const channels = [
    {
      id: 'cellular',
      title: 'Cellular Baseband Telemetry',
      icon: Radio,
      iconColor: skin.primaryColor,
      data: hardwareState.cellular,
    },
    {
      id: 'ble',
      title: 'Bluetooth Low Energy (BLE)',
      icon: Bluetooth,
      iconColor: skin.accentSecondary,
      data: hardwareState.ble,
    },
    {
      id: 'location',
      title: 'Spatial / GPS Telemetry',
      icon: MapPin,
      iconColor: '#00F0FF',
      data: hardwareState.location,
    },
    {
      id: 'nativeRf',
      title: 'Native Baseband Interface',
      icon: Cpu,
      iconColor: '#F59E0B',
      data: hardwareState.nativeRf,
    },
  ];

  return (
    <div
      className="p-5 rounded-2xl border space-y-4 transition-all"
      style={{
        backgroundColor: skin.cardColor,
        borderColor: skin.borderColor,
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3" style={{ borderColor: skin.borderColor }}>
        <div className="flex items-center gap-2.5">
          <div
            className="p-2 rounded-xl"
            style={{
              backgroundColor: `${skin.primaryColor}18`,
              border: `1px solid ${skin.primaryColor}40`,
            }}
          >
            <Radio className="w-4 h-4" style={{ color: skin.primaryColor }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: skin.textPrimaryColor }}>
                HARDWARE TELEMETRY STATUS
              </h3>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-neutral-400">
                TRUTHFUL AUDIT
              </span>
            </div>
            <p className="text-[11px]" style={{ color: skin.textSecondaryColor }}>
              Real-time RF capability state & browser sandbox boundary assessment.
            </p>
          </div>
        </div>

        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('radar')}
            className="self-start sm:self-auto px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer hover:bg-white/5 flex items-center gap-1.5"
            style={{ borderColor: skin.borderColor, color: skin.primaryColor }}
          >
            <span>Open Tactical Radar</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Grid of 4 Channels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {channels.map((ch) => {
          const badge = getStatusBadge(ch.data.status);
          const isExpanded = expandedChannel === ch.id;
          const Icon = ch.icon;

          return (
            <div
              key={ch.id}
              className="p-3.5 rounded-xl border flex flex-col justify-between transition-all"
              style={{
                backgroundColor: skin.surfaceColor,
                borderColor: `${skin.borderColor}88`,
              }}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color: ch.iconColor }} />
                    <span className="text-xs font-mono font-bold" style={{ color: skin.textPrimaryColor }}>
                      {ch.title}
                    </span>
                  </div>
                  <span
                    className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded shrink-0"
                    style={{
                      backgroundColor: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                    }}
                  >
                    {badge.label}
                  </span>
                </div>

                <div className="mt-2 text-[11px] font-mono" style={{ color: skin.textSecondaryColor }}>
                  <span className="text-neutral-500">Source:</span> {ch.data.source}
                </div>

                <p className="text-[11px] mt-1 leading-relaxed" style={{ color: skin.textMutedColor }}>
                  {ch.data.details}
                </p>
              </div>

              {/* Explanatory limitations disclosure */}
              <div className="mt-3 pt-2 border-t" style={{ borderColor: `${skin.borderColor}44` }}>
                <button
                  onClick={() => setExpandedChannel(isExpanded ? null : ch.id)}
                  className="w-full flex items-center justify-between text-[10px] font-mono text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1">
                    <Info className="w-3 h-3 text-cyan-400" />
                    <span>Technical Limitation Details</span>
                  </span>
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {isExpanded && (
                  <div className="mt-2 p-2.5 rounded-lg bg-black/40 border border-neutral-800 text-[10px] font-mono text-neutral-300 space-y-1.5 animate-fadeIn">
                    <p className="leading-relaxed">
                      <span className="text-amber-400 font-bold">Mandate Standard:</span> {ch.data.limitations}
                    </p>
                    {ch.data.status === 'PERMISSION_REQUIRED' && onRequestLocationPermission && (
                      <button
                        onClick={onRequestLocationPermission}
                        className="mt-1 px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all text-[10px] font-bold cursor-pointer"
                      >
                        Grant Runtime Permission
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Truthful Sandbox Disclaimer / Quick Action */}
      <div className="p-3 rounded-xl border bg-black/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono" style={{ borderColor: `${skin.borderColor}66` }}>
        <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
          <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            {isTestMode
              ? 'Test Evidence Active: Synthetic records loaded for pipeline validation.'
              : 'Zero Fake Telemetry Standard: Web sandboxes cannot forge hardware cell towers.'}
          </span>
        </div>

        {onToggleTestMode && (
          <button
            onClick={onToggleTestMode}
            className="px-2.5 py-1 rounded-lg border text-[10px] font-mono font-bold transition-all cursor-pointer hover:bg-purple-950/30 flex items-center gap-1.5"
            style={{ borderColor: isTestMode ? '#A855F7' : skin.borderColor, color: isTestMode ? '#D8B4FE' : skin.primaryColor }}
          >
            <Beaker className="w-3 h-3" />
            <span>{isTestMode ? 'Exit Test Sandbox' : 'Load Test Sandbox'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
