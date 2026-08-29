import React, { useEffect, useRef, useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, RefreshCw, Sparkles, Network, Radio, PhoneCall } from 'lucide-react';
import { AppSkinConfig } from '../types';

interface Props {
  score: number;
  isScanning: boolean;
  onStartAudit: () => void;
  onNavigateTab: (tab: string) => void;
  skin: AppSkinConfig;
}

export const ShieldGaugeCard: React.FC<Props> = ({
  score,
  isScanning,
  onStartAudit,
  onNavigateTab,
  skin,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showActionPanel, setShowActionPanel] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 220;
    const height = 220;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 88;
    const strokeWidth = 14;

    const startAngle = 0.75 * Math.PI; // 135 deg
    const totalSweep = 1.5 * Math.PI; // 270 deg

    // Background track arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + totalSweep);
    ctx.strokeStyle = skin.isDark ? '#141E14' : '#E2E8F0';
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Foreground progress arc
    const progressSweep = totalSweep * (score / 100);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + progressSweep);
    
    // Status color selection
    let strokeColor = skin.primaryColor;
    if (score < 70) strokeColor = '#FF3366';
    else if (score < 88) strokeColor = '#FFB300';

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Glow effect
    if (skin.isDark) {
      ctx.shadowColor = strokeColor;
      ctx.shadowBlur = 12;
    }
  }, [score, skin]);

  const statusConfig = {
    high: {
      text: 'SYSTEM SECURED',
      color: skin.primaryColor,
      bg: `${skin.primaryColor}18`,
      border: `${skin.primaryColor}55`,
      icon: ShieldCheck,
    },
    medium: {
      text: 'GUARDED WITH WARNINGS',
      color: '#FFB300',
      bg: 'rgba(255, 179, 0, 0.15)',
      border: 'rgba(255, 179, 0, 0.45)',
      icon: ShieldAlert,
    },
    low: {
      text: 'ACTION REQUIRED',
      color: '#FF3366',
      bg: 'rgba(255, 51, 102, 0.15)',
      border: 'rgba(255, 51, 102, 0.45)',
      icon: ShieldAlert,
    },
  }[score >= 90 ? 'high' : score >= 70 ? 'medium' : 'low'];

  const StatusIcon = statusConfig.icon;

  return (
    <div
      id="shield-gauge-card"
      className="p-6 rounded-3xl border transition-all duration-300 relative overflow-hidden"
      style={{
        backgroundColor: skin.cardColor,
        borderColor: `${skin.borderColor}99`,
      }}
    >
      <div className="flex flex-col items-center justify-center text-center">
        {/* Canvas Gauge */}
        <div className="relative w-[220px] h-[220px] flex items-center justify-center">
          <canvas
            ref={canvasRef}
            style={{ width: 220, height: 220 }}
            className="absolute inset-0 pointer-events-none"
          />
          <div className="flex flex-col items-center justify-center z-10 select-none">
            <Shield
              className="w-8 h-8 mb-1 transition-transform duration-300"
              style={{ color: statusConfig.color }}
            />
            <span
              className="text-4xl font-extrabold font-mono tracking-tight"
              style={{ color: skin.textPrimaryColor }}
            >
              {score}%
            </span>
            <span
              className="text-[10px] font-bold tracking-widest uppercase mt-0.5"
              style={{ color: skin.textMutedColor }}
            >
              PROTECTION SCORE
            </span>
          </div>
        </div>

        {/* Status Pill */}
        <button
          onClick={() => {
            if (score < 90) setShowActionPanel(!showActionPanel);
          }}
          className={`mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider transition-transform ${score < 90 ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`}
          style={{
            color: statusConfig.color,
            backgroundColor: statusConfig.bg,
            borderColor: statusConfig.border,
          }}
        >
          <StatusIcon className="w-4 h-4" />
          <span>{statusConfig.text}</span>
        </button>

        {/* Action Panel */}
        {showActionPanel && score < 90 && (
          <div className="mt-4 p-4 rounded-xl text-left border bg-black/40 backdrop-blur w-full max-w-sm animate-in fade-in zoom-in-95" style={{ borderColor: statusConfig.border }}>
            <h4 className="text-xs font-bold uppercase mb-2" style={{ color: statusConfig.color }}>
              Vulnerabilities Detected
            </h4>
            <ul className="text-[11px] space-y-2 mb-4" style={{ color: skin.textPrimaryColor }}>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: statusConfig.color }} />
                <span><strong style={{ color: skin.textPrimaryColor }}>Unsecured Network Traffic:</strong> Your connection may be exposed to ISP monitoring or local packet sniffing.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: statusConfig.color }} />
                <span><strong style={{ color: skin.textPrimaryColor }}>Missing Malware Scan:</strong> A deep system scan hasn't been run recently, leaving you vulnerable to zero-days.</span>
              </li>
            </ul>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => onNavigateTab('vpn')}
                className="w-full py-2 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 transition-colors"
                style={{ color: skin.textPrimaryColor }}
              >
                Enable WireGuard VPN
              </button>
              <button
                onClick={() => {
                  setShowActionPanel(false);
                  onStartAudit();
                }}
                className="w-full py-2 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 transition-colors"
                style={{ color: skin.textPrimaryColor }}
              >
                Run Deep Security Audit
              </button>
            </div>
          </div>
        )}

        {/* Audit Button */}
        <button
          id="btn-run-deep-audit"
          onClick={onStartAudit}
          disabled={isScanning}
          className="mt-6 w-full max-w-sm py-3.5 px-6 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2.5 shadow-lg cursor-pointer disabled:opacity-75"
          style={{
            backgroundColor: skin.primaryColor,
            color: skin.isDark ? '#000000' : '#FFFFFF',
          }}
        >
          <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'AUDITING SYSTEM...' : 'START DEEP SECURITY AUDIT'}</span>
        </button>
      </div>

      {/* Quick Launch Shortcuts */}
      <div className="mt-6 pt-5 border-t grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ borderColor: `${skin.borderColor}55` }}>
        <button
          id="btn-quick-ai"
          onClick={() => onNavigateTab('ai_scanner')}
          className="p-3 rounded-xl border text-left flex flex-col gap-1 transition-all hover:scale-[1.02] cursor-pointer"
          style={{ backgroundColor: skin.surfaceColor, borderColor: skin.borderColor }}
        >
          <Sparkles className="w-4 h-4" style={{ color: skin.accentSecondary }} />
          <span className="text-xs font-bold truncate" style={{ color: skin.textPrimaryColor }}>AI Scanner</span>
          <span className="text-[10px] truncate" style={{ color: skin.textMutedColor }}>URL & Package audit</span>
        </button>

        <button
          id="btn-quick-vpn"
          onClick={() => onNavigateTab('vpn')}
          className="p-3 rounded-xl border text-left flex flex-col gap-1 transition-all hover:scale-[1.02] cursor-pointer"
          style={{ backgroundColor: skin.surfaceColor, borderColor: skin.borderColor }}
        >
          <Network className="w-4 h-4" style={{ color: skin.primaryColor }} />
          <span className="text-xs font-bold truncate" style={{ color: skin.textPrimaryColor }}>WireGuard VPN</span>
          <span className="text-[10px] truncate" style={{ color: skin.textMutedColor }}>Zero-log Swiss node</span>
        </button>

        <button
          id="btn-quick-radar"
          onClick={() => onNavigateTab('radar')}
          className="p-3 rounded-xl border text-left flex flex-col gap-1 transition-all hover:scale-[1.02] cursor-pointer"
          style={{ backgroundColor: skin.surfaceColor, borderColor: skin.borderColor }}
        >
          <Radio className="w-4 h-4" style={{ color: '#FFB300' }} />
          <span className="text-xs font-bold truncate" style={{ color: skin.textPrimaryColor }}>IMSI Radar</span>
          <span className="text-[10px] truncate" style={{ color: skin.textMutedColor }}>RF & BLE detector</span>
        </button>

        <button
          id="btn-quick-calls"
          onClick={() => onNavigateTab('call_sec')}
          className="p-3 rounded-xl border text-left flex flex-col gap-1 transition-all hover:scale-[1.02] cursor-pointer"
          style={{ backgroundColor: skin.surfaceColor, borderColor: skin.borderColor }}
        >
          <PhoneCall className="w-4 h-4" style={{ color: '#00F0FF' }} />
          <span className="text-xs font-bold truncate" style={{ color: skin.textPrimaryColor }}>Calls & MMI</span>
          <span className="text-[10px] truncate" style={{ color: skin.textMutedColor }}>Carrier forward check</span>
        </button>
      </div>
    </div>
  );
};
