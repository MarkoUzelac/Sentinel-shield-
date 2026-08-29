import React, { useState, useEffect } from 'react';
import { AppSkinConfig, MmiAuditState } from '../types';
import { MmiAuditService, MmiInquiryRecord } from '../services/mmiAuditService';
import {
  PhoneCall,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Mic,
  MessageSquare,
  Radio,
  ExternalLink,
  Clock,
  Info,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface Props {
  skin: AppSkinConfig;
}

export const CallSecurityView: React.FC<Props> = ({ skin }) => {
  const [mmiState, setMmiState] = useState<{
    currentState: MmiAuditState;
    lastInquiry: MmiInquiryRecord | null;
  }>(MmiAuditService.getState());
  const { addToast } = useToast();

  useEffect(() => {
    const unsubscribe = MmiAuditService.subscribe((state) => {
      setMmiState(state);
    });
    return () => unsubscribe();
  }, []);

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

  const handleDispatchCode = async (code: string, label: string) => {
    addToast(`Dispatching MMI inquiry ${code} via system dialer...`, 'info');
    await MmiAuditService.dispatchMmiInquiry(code);
  };

  const { currentState, lastInquiry } = mmiState;
  const isDispatching =
    currentState === 'DISPATCH_REQUESTED' ||
    currentState === 'DIALER_OPENED' ||
    currentState === 'WAITING_FOR_OPERATOR_RESULT';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold font-mono tracking-widest uppercase px-2 py-0.5 rounded"
            style={{ backgroundColor: `${skin.primaryColor}22`, color: skin.primaryColor }}
          >
            CARRIER SS7 & MMI TELEMETRY
          </span>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold"
            style={{
              backgroundColor: 'rgba(255, 179, 0, 0.15)',
              color: '#FFB300',
              border: '1px solid rgba(255, 179, 0, 0.3)',
            }}
          >
            STATE: {currentState}
          </span>
        </div>
        <h2 className="text-xl font-black mt-1" style={{ color: skin.textPrimaryColor }}>
          Wiretap & Call Redirection Audit
        </h2>
        <p className="text-xs mt-0.5" style={{ color: skin.textSecondaryColor }}>
          Check and reset carrier-level call forwarding, conditional diversions, and SS7 routing status using standard GSM MMI service codes.
        </p>
      </div>

      {/* Live MMI State Machine Card */}
      <div
        className="p-5 rounded-2xl border space-y-3"
        style={{
          backgroundColor: skin.cardColor,
          borderColor: isDispatching ? skin.primaryColor : 'rgba(255, 179, 0, 0.45)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                isDispatching ? 'animate-spin' : ''
              }`}
              style={{
                backgroundColor: isDispatching ? `${skin.primaryColor}22` : 'rgba(255, 179, 0, 0.12)',
                borderColor: isDispatching ? skin.primaryColor : 'rgba(255, 179, 0, 0.4)',
                color: isDispatching ? skin.primaryColor : '#FFB300',
              }}
            >
              {isDispatching ? <RefreshCw className="w-5 h-5" /> : <PhoneCall className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold" style={{ color: skin.textPrimaryColor }}>
                  MMI Inquiry State Machine
                </h3>
                <span
                  className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase"
                  style={{
                    backgroundColor: isDispatching ? `${skin.primaryColor}22` : 'rgba(255, 179, 0, 0.2)',
                    color: isDispatching ? skin.primaryColor : '#FFB300',
                  }}
                >
                  {currentState}
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: skin.textSecondaryColor }}>
                {lastInquiry?.explanation || 'No inquiry dispatched in current session.'}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <button
              onClick={() => handleDispatchCode('*#21#', 'All Call Forwarding')}
              disabled={isDispatching}
              className="px-4 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: skin.primaryColor,
                color: skin.isDark ? '#000' : '#fff',
              }}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>{isDispatching ? 'Processing...' : 'Run inquiry (*#21#)'}</span>
            </button>
          </div>
        </div>

        {/* Explicit Audit Status Note */}
        <div
          className="p-3 rounded-xl border text-xs font-mono space-y-1"
          style={{ backgroundColor: skin.surfaceColor, borderColor: skin.borderColor }}
        >
          <div className="flex items-center justify-between text-amber-400 font-bold text-[11px]">
            <span>AUDIT STATUS: UNVERIFIED (CARRIER JURISDICTION)</span>
            {lastInquiry && (
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(lastInquiry.dispatchedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
          <p className="leading-relaxed" style={{ color: skin.textSecondaryColor }}>
            MMI audit: UNVERIFIED. Carrier inquiry dispatched. Operator result cannot be automatically verified on this device.
          </p>
        </div>

        {/* Zero-Slop Rules Card */}
        <div
          className="p-3 rounded-xl border space-y-1.5 text-[11px]"
          style={{ backgroundColor: `${skin.bgColor}99`, borderColor: `${skin.borderColor}55` }}
        >
          <span className="font-bold uppercase tracking-wider text-slate-400 block text-[10px]">
            Zero-Slop Verification Rules:
          </span>
          <ul className="list-disc list-inside space-y-1 font-mono" style={{ color: skin.textMutedColor }}>
            <li><code>ACTION_DIAL</code> success != carrier verification</li>
            <li>Dialer opened != MMI success</li>
            <li>MMI code dispatched != VERIFIED</li>
            <li>
              Android and web application sandboxes restrict third-party apps from intercepting raw USSD dialogue dialogs without carrier-level privileges.
            </li>
          </ul>
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
                onClick={() => handleDispatchCode(mmi.code, mmi.label)}
                disabled={isDispatching}
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
