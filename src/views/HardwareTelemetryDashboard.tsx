import React, { useState, useEffect } from 'react';
import { AppSkinConfig, HardwareTelemetryState, CapabilityAccessState } from '../types';
import { ThreatSnapshotEngine } from '../services/threatSnapshotEngine';
import { Radio, Bluetooth, MapPin, Cpu, Info, Shield, Lock, AlertTriangle, Server, Smartphone } from 'lucide-react';

interface Props {
  skin: AppSkinConfig;
}

export const HardwareTelemetryDashboard: React.FC<Props> = ({ skin }) => {
  const [hardwareState, setHardwareState] = useState<HardwareTelemetryState | undefined>(
    () => ThreatSnapshotEngine.getSnapshot().radar.hardwareTelemetry
  );
  
  const [isTestMode, setIsTestMode] = useState(
    () => ThreatSnapshotEngine.getSnapshot().radar.isTestMode
  );

  useEffect(() => {
    const unsubscribe = ThreatSnapshotEngine.subscribe((snap) => {
      setHardwareState(snap.radar.hardwareTelemetry);
      setIsTestMode(snap.radar.isTestMode);
    });
    return () => unsubscribe();
  }, []);

  if (!hardwareState) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-500 font-mono text-sm">
        INITIALIZING HARDWARE TELEMETRY SUBSYSTEM...
      </div>
    );
  }

  const getStatusBadge = (status: CapabilityAccessState) => {
    switch (status) {
      case 'LIVE':
        return {
          label: 'AVAILABLE',
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
          label: 'AVAILABLE (INFERRED)',
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
          label: 'UNAVAILABLE',
          color: '#94A3B8',
          bg: 'rgba(148, 163, 184, 0.12)',
          border: 'rgba(148, 163, 184, 0.25)',
        };
    }
  };

  const channels = [
    {
      id: 'cellular',
      title: 'Cellular Baseband',
      icon: Radio,
      iconColor: skin.primaryColor,
      data: hardwareState.cellular,
    },
    {
      id: 'ble',
      title: 'Bluetooth Low Energy',
      icon: Bluetooth,
      iconColor: skin.accentSecondary,
      data: hardwareState.ble,
    },
    {
      id: 'location',
      title: 'Spatial / GPS',
      icon: MapPin,
      iconColor: '#00F0FF',
      data: hardwareState.location,
    },
    {
      id: 'nativeRf',
      title: 'Native RF Bridge',
      icon: Cpu,
      iconColor: '#F59E0B',
      data: hardwareState.nativeRf,
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span
            className="text-[10px] font-bold font-mono tracking-widest uppercase px-2 py-0.5 rounded"
            style={{
              backgroundColor: `${skin.primaryColor}22`,
              color: skin.primaryColor,
              border: `1px solid ${skin.primaryColor}44`,
            }}
          >
            HARDWARE AUDIT
          </span>
        </div>
        <h2 className="text-xl font-black" style={{ color: skin.textPrimaryColor }}>
          Hardware Telemetry Dashboard
        </h2>
        <p className="text-xs mt-1" style={{ color: skin.textSecondaryColor }}>
          Real-time status indicators for device-level physical sensors and RF baseband interfaces.
        </p>
      </div>

      {/* Truthful Telemetry Mandate / Browser Limitations Panel */}
      <div 
        className="p-5 rounded-2xl border bg-black/40 relative overflow-hidden"
        style={{ borderColor: `${skin.borderColor}88` }}
      >
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Shield className="w-32 h-32" />
        </div>
        
        <div className="relative z-10 flex flex-col sm:flex-row gap-4">
          <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-700 shrink-0 self-start">
            <Lock className="w-6 h-6 text-cyan-400" />
          </div>
          
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                TRUTHFUL TELEMETRY MANDATE
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  ENFORCED
                </span>
              </h3>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Sentinel Shield Pro operates under a strict Zero-Fabrication policy. All telemetry displayed must originate from verifiable hardware interfaces, authorized native APIs, or explicitly declared backend providers.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-900/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-bold font-mono text-neutral-300">NATIVE ANDROID APP</span>
                </div>
                <p className="text-[10px] text-neutral-500 leading-relaxed font-mono">
                  Full baseband access, raw BLE sweeping, and unrestricted IMEI/IMSI auditing requires the Sentinel Shield Pro native Android APK utilizing <code className="text-emerald-400/70">TelephonyManager</code>.
                </p>
              </div>
              
              <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-900/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-bold font-mono text-neutral-300">BROWSER LIMITATIONS</span>
                </div>
                <p className="text-[10px] text-neutral-500 leading-relaxed font-mono">
                  When accessed via Web Browser, local RF capabilities are sandboxed. To maintain integrity, these capabilities will honestly report as <code className="text-amber-400/70">UNAVAILABLE</code> rather than displaying mock data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of 4 Channels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {channels.map((ch) => {
          const badge = getStatusBadge(ch.data.status);
          const Icon = ch.icon;

          return (
            <div
              key={ch.id}
              className="p-4 rounded-2xl border flex flex-col justify-between transition-all hover:bg-white/[0.02]"
              style={{
                backgroundColor: skin.surfaceColor,
                borderColor: `${skin.borderColor}66`,
              }}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                      <Icon className="w-4 h-4" style={{ color: ch.iconColor }} />
                    </div>
                    <span className="text-sm font-mono font-bold" style={{ color: skin.textPrimaryColor }}>
                      {ch.title}
                    </span>
                  </div>
                  <span
                    className="text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded shrink-0"
                    style={{
                      backgroundColor: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                    }}
                  >
                    {badge.label}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2">
                    <Server className="w-3.5 h-3.5 text-neutral-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-mono text-neutral-500 block uppercase">Hardware Source</span>
                      <span className="text-xs font-mono text-neutral-300">{ch.data.source}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs leading-relaxed" style={{ color: skin.textSecondaryColor }}>
                  {ch.data.details}
                </p>
              </div>

              {/* Explanatory limitations disclosure */}
              <div className="mt-4 pt-3 border-t" style={{ borderColor: `${skin.borderColor}44` }}>
                <div className="flex items-start gap-2 text-neutral-400">
                  <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-mono leading-relaxed">
                    <span className="text-cyan-400 font-bold mr-1">Constraint:</span>
                    {ch.data.limitations}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
