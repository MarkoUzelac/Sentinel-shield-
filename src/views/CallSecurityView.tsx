import React, { useState } from 'react';
import { AppSkinConfig } from '../types';
import { PhoneCall, ShieldAlert, ShieldCheck, ExternalLink, Keypad, Mic, MessageSquare, AlertCircle } from 'lucide-react';

interface Props {
  skin: AppSkinConfig;
}

export const CallSecurityView: React.FC<Props> = ({ skin }) => {
  const [activeCodeResult, setActiveCodeResult] = useState<{ code: string; label: string } | null>(null);

  const mmiCodes = [
    {
      code: '*#21#',
      label: 'All Call Forwarding (Unconditional)',
      description: 'Queries carrier HLR/VLR register for blanket call and SMS interception or redirection.',
    },
    {
      code: '*#62#',
      label: 'Forward When Unreachable / No Signal',
      description: 'Checks if unanswered incoming voice traffic is routed to unauthorized private numbers.',
    },
    {
      code: '*#67#',
      label: 'Forward When Busy / On Another Call',
      description: 'Inspects secondary destination diversion rules for active busy line states.',
    },
    {
      code: '*#61#',
      label: 'Forward When No Answer (Timeout)',
      description: 'Verifies carrier timer threshold and diversion destination.',
    },
    {
      code: '##002#',
      label: 'Universal Reset & Cancel All Forwarding',
      description: 'Clears all carrier conditional and unconditional redirection targets immediately.',
    },
  ];

  const handleDialCode = (code: string, label: string) => {
    setActiveCodeResult({ code, label });
    if (typeof window !== 'undefined') {
      window.location.href = `tel:${encodeURIComponent(code)}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <span className="text-[10px] font-bold font-mono tracking-widest uppercase px-2 py-0.5 rounded" style={{ backgroundColor: `${skin.primaryColor}22`, color: skin.primaryColor }}>
          CARRIER SS7 & MMI TELEMETRY
        </span>
        <h2 className="text-xl font-black mt-1" style={{ color: skin.textPrimaryColor }}>
          Wiretap & Call Redirection Audit
        </h2>
        <p className="text-xs mt-0.5" style={{ color: skin.textSecondaryColor }}>
          Check and reset carrier-level call forwarding, conditional diversions, and SS7 routing status using standard GSM MMI service codes.
        </p>
      </div>

      {/* Warning Notice Card */}
      <div
        className="p-4 rounded-2xl border flex items-start gap-3"
        style={{
          backgroundColor: skin.cardColor,
          borderColor: 'rgba(255, 179, 0, 0.4)',
        }}
      >
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <h4 className="font-bold text-amber-400">Carrier Verification Standard</h4>
          <p style={{ color: skin.textSecondaryColor }}>
            Clicking a code initiates an authentic operator MMI lookup via the device dialer. In accordance with zero-slop evidence verification, Sentinel audits the dial request while carrier network responses remain under operator jurisdiction.
          </p>
        </div>
      </div>

      {/* MMI Codes List */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: skin.textPrimaryColor }}>
          STANDARD CARRIER MMI CODES ({mmiCodes.length})
        </h3>

        <div className="space-y-3">
          {mmiCodes.map((mmi) => (
            <div
              key={mmi.code}
              className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
              style={{
                backgroundColor: skin.cardColor,
                borderColor: skin.borderColor,
              }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-mono font-black px-2 py-1 rounded"
                    style={{
                      backgroundColor: `${skin.primaryColor}22`,
                      color: skin.primaryColor,
                      border: `1px solid ${skin.primaryColor}44`,
                    }}
                  >
                    {mmi.code}
                  </span>
                  <h4 className="text-xs font-bold truncate" style={{ color: skin.textPrimaryColor }}>
                    {mmi.label}
                  </h4>
                </div>
                <p className="text-xs mt-1.5 leading-relaxed" style={{ color: skin.textSecondaryColor }}>
                  {mmi.description}
                </p>
              </div>

              <button
                onClick={() => handleDialCode(mmi.code, mmi.label)}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer hover:scale-105"
                style={{
                  backgroundColor: mmi.code === '##002#' ? '#FF3366' : skin.surfaceColor,
                  borderColor: skin.borderColor,
                  borderWidth: 1,
                  color: mmi.code === '##002#' ? '#fff' : skin.textPrimaryColor,
                }}
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Dial {mmi.code}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Local Hardware Privacy Sensors */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: skin.textPrimaryColor }}>
          LOCAL HARDWARE SENSORS & PRIVACY GUARDS
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl border" style={{ backgroundColor: skin.cardColor, borderColor: skin.borderColor }}>
            <div className="flex items-center gap-2 mb-1">
              <Mic className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold" style={{ color: skin.textPrimaryColor }}>Microphone Access Guard</h4>
            </div>
            <p className="text-xs" style={{ color: skin.textSecondaryColor }}>
              Monitors active background audio recording attempts and warns on non-foreground mic access.
            </p>
          </div>

          <div className="p-4 rounded-2xl border" style={{ backgroundColor: skin.cardColor, borderColor: skin.borderColor }}>
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold" style={{ color: skin.textPrimaryColor }}>Silent SMS / Type-0 Filter</h4>
            </div>
            <p className="text-xs" style={{ color: skin.textSecondaryColor }}>
              Identifies unrendered stealth SMS pings designed to pinpoint base station coordinates without user alert.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
