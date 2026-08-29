import React from 'react';
import { AppSkinConfig, BasebandTelemetryState } from '../types';
import { Cpu, Radio, ShieldAlert, CheckCircle2, AlertCircle, Info, Lock } from 'lucide-react';

interface Props {
  baseband: BasebandTelemetryState;
  isTestMode: boolean;
  skin: AppSkinConfig;
}

export const BasebandTelemetrySection: React.FC<Props> = ({
  baseband,
  isTestMode,
  skin,
}) => {
  const isAvailable = baseband.status !== 'UNAVAILABLE';

  const fields = [
    { label: 'Radio Access Tech (RAT)', value: baseband.rat, isCode: true },
    { label: 'Mobile Country Code (MCC)', value: baseband.mcc !== null ? String(baseband.mcc) : 'UNAVAILABLE' },
    { label: 'Mobile Network Code (MNC)', value: baseband.mnc !== null ? String(baseband.mnc) : 'UNAVAILABLE' },
    { label: 'Tracking Area Code (TAC / LAC)', value: baseband.tacOrLac !== null ? String(baseband.tacOrLac) : 'UNAVAILABLE' },
    { label: 'Cell Identity (CID / ECI)', value: baseband.cidOrEci !== null ? String(baseband.cidOrEci) : 'UNAVAILABLE' },
    { label: 'Physical Cell ID (PCI)', value: baseband.pci !== null ? String(baseband.pci) : 'UNAVAILABLE' },
    { label: 'Channel / (E)ARFCN', value: baseband.arfcnOrEarfcn !== null ? String(baseband.arfcnOrEarfcn) : 'UNAVAILABLE' },
    { label: 'Signal Strength (dBm)', value: baseband.signalStrengthDbm !== null ? `${baseband.signalStrengthDbm} dBm` : 'UNAVAILABLE' },
    { label: 'Arbitrary Strength Unit (ASU)', value: baseband.asu !== null ? String(baseband.asu) : 'UNAVAILABLE' },
    { label: 'Registration Status', value: baseband.registeredState },
    { label: 'Roaming Status', value: baseband.roamingState },
    { label: 'Data Connection State', value: baseband.dataConnectionState },
  ];

  return (
    <div
      className="p-5 rounded-2xl border space-y-4"
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
            <Cpu className="w-4 h-4" style={{ color: skin.primaryColor }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: skin.textPrimaryColor }}>
                CELLULAR BASEBAND & MODEM TELEMETRY
              </h3>
              <span
                className="text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase"
                style={{
                  backgroundColor: isTestMode
                    ? 'rgba(168, 85, 247, 0.15)'
                    : isAvailable
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'rgba(148, 163, 184, 0.15)',
                  color: isTestMode ? '#D8B4FE' : isAvailable ? '#10B981' : '#94A3B8',
                  border: `1px solid ${isTestMode ? 'rgba(168, 85, 247, 0.3)' : isAvailable ? 'rgba(16, 185, 129, 0.3)' : 'rgba(148, 163, 184, 0.3)'}`,
                }}
              >
                {isTestMode ? 'TEST SANDBOX' : isAvailable ? 'LIVE HARDWARE' : 'UNAVAILABLE (BROWSER)'}
              </span>
            </div>
            <p className="text-[11px]" style={{ color: skin.textSecondaryColor }}>
              Low-level Physical Layer (L1) & Radio Resource Control (RRC) parameters.
            </p>
          </div>
        </div>
      </div>

      {/* Browser Limitation Notice when UNAVAILABLE */}
      {!isAvailable && (
        <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/60 flex items-start gap-3">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs font-mono">
            <div className="font-bold text-neutral-200">
              Browser Security Sandbox Limitation
            </div>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              Browser security model does not expose raw cellular baseband telemetry. Direct access to baseband modems (Qualcomm, MediaTek, Exynos) is restricted to native Android privileged runtime bridges (<code className="text-cyan-300">TelephonyManager.getAllCellInfo()</code>).
            </p>
          </div>
        </div>
      )}

      {/* Field Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {fields.map((f, idx) => {
          const isUnavail = f.value === 'UNAVAILABLE';
          return (
            <div
              key={idx}
              className="p-3 rounded-xl border flex flex-col justify-between"
              style={{
                backgroundColor: skin.surfaceColor,
                borderColor: `${skin.borderColor}66`,
              }}
            >
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-tight truncate" title={f.label}>
                {f.label}
              </span>
              <span
                className={`text-xs font-mono font-bold mt-1.5 truncate ${
                  isUnavail
                    ? 'text-neutral-500 italic'
                    : isTestMode
                    ? 'text-purple-300'
                    : 'text-emerald-400'
                }`}
                title={f.value}
              >
                {f.value}
              </span>
            </div>
          );
        })}
      </div>

      {/* Audit Source Footer */}
      <div className="flex items-center justify-between text-[10px] font-mono pt-1 text-neutral-500">
        <span>Standard: 3GPP TS 36.331 / TS 38.331 Baseband Protocol</span>
        <span>Status: {baseband.statusReason}</span>
      </div>
    </div>
  );
};
