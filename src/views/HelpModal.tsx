import React from 'react';
import { AppSkinConfig } from '../types';
import { X, ShieldCheck, AlertTriangle, XCircle, Info } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  skin: AppSkinConfig;
}

export const HelpModal: React.FC<Props> = ({ isOpen, onClose, skin }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div
        className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
        style={{ backgroundColor: skin.bgColor, borderColor: skin.primaryColor }}
      >
        <div className="p-4 border-b flex items-center justify-between" style={{ backgroundColor: skin.surfaceColor, borderColor: skin.borderColor }}>
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5" style={{ color: skin.primaryColor }} />
            <h3 className="text-sm font-bold" style={{ color: skin.textPrimaryColor }}>
              Capability Evidence Standard
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border hover:bg-white/10 cursor-pointer"
            style={{ borderColor: skin.borderColor, color: skin.textPrimaryColor }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed" style={{ color: skin.textSecondaryColor }}>
          <p>
            Sentinel Shield Pro complies strictly with zero-slop cryptographic evidence tracking. Unlike conventional security apps that show decorative green checkmarks for inactive features, Sentinel categorizes every capability into three explicit runtime states:
          </p>

          <div className="p-3.5 rounded-2xl border space-y-1.5" style={{ backgroundColor: skin.cardColor, borderColor: skin.primaryColor }}>
            <div className="flex items-center gap-2 font-bold" style={{ color: skin.primaryColor }}>
              <ShieldCheck className="w-4 h-4" />
              <span>VERIFIED</span>
            </div>
            <p>
              The security layer is backed by fresh, authenticated runtime measurements (e.g. active WireGuard post-start peer handshake, valid DoH certificate verification, or carrier MMI return).
            </p>
          </div>

          <div className="p-3.5 rounded-2xl border space-y-1.5" style={{ backgroundColor: skin.cardColor, borderColor: 'rgba(255, 179, 0, 0.4)' }}>
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span>UNVERIFIED</span>
            </div>
            <p>
              The feature is active or provisioned, but runtime telemetry cannot prove end-to-end immunity (e.g. observing cell towers does not prove the absence of an IMSI catcher, or an HTTPS reachability probe is successful but upstream TLS inspection is unknown).
            </p>
          </div>

          <div className="p-3.5 rounded-2xl border space-y-1.5" style={{ backgroundColor: skin.cardColor, borderColor: skin.borderColor }}>
            <div className="flex items-center gap-2 font-bold" style={{ color: skin.textMutedColor }}>
              <XCircle className="w-4 h-4" />
              <span>UNAVAILABLE</span>
            </div>
            <p>
              The underlying hardware sensor, telephony capability, or configuration profile is missing or turned off by the user.
            </p>
          </div>

          <p className="font-mono text-[11px]" style={{ color: skin.textMutedColor }}>
            Evidence Time-To-Live (TTL): 5 minutes. Telemetry automatically decays to UNVERIFIED once TTL expires until freshly refreshed.
          </p>
        </div>

        <div className="p-4 border-t flex justify-end" style={{ backgroundColor: skin.surfaceColor, borderColor: skin.borderColor }}>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
            style={{ backgroundColor: skin.primaryColor, color: skin.isDark ? '#000' : '#fff' }}
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
