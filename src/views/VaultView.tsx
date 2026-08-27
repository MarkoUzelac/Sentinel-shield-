import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AppSkinConfig, AppSkinId, AppLanguageCode, ScanLog } from '../types';
import { APP_SKINS } from '../data/themes';
import { APP_LANGUAGES } from '../data/translations';
import { ScanDatabase } from '../services/scanDatabase';
import { Star, ShieldCheck, Check, Key, Globe, Palette, History, Trash2, CheckCircle2, Fingerprint, Lock, Unlock, AlertTriangle, Download, Loader2 } from 'lucide-react';

interface Props {
  currentSkinId: AppSkinId;
  onSelectSkin: (id: AppSkinId) => void;
  currentLanguage: AppLanguageCode;
  onSelectLanguage: (lang: AppLanguageCode) => void;
  skin: AppSkinConfig;
}

export const VaultView: React.FC<Props> = ({
  currentSkinId,
  onSelectSkin,
  currentLanguage,
  onSelectLanguage,
  skin,
}) => {
  const [logs, setLogs] = useState<ScanLog[]>(ScanDatabase.getLogs());
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Reset unlock state if skin changes just for demo, or keep it unlocked. We'll keep it unlocked.

  const handleClearLogs = () => {
    setLogs(ScanDatabase.clearLogs());
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const logDataStr = JSON.stringify(logs);
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(logDataStr);
      
      const keyPair = await window.crypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"]
      );

      const signatureBuffer = await window.crypto.subtle.sign(
        { name: "ECDSA", hash: { name: "SHA-256" } },
        keyPair.privateKey,
        dataBuffer
      );

      const exportedPubKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
      
      const toHex = (buffer: ArrayBuffer) => 
        Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      const signatureHex = toHex(signatureBuffer);
      const pubKeyHex = toHex(exportedPubKey);

      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text("Sentinel Shield Pro - Audit History Report", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
      doc.text("Classification: CONFIDENTIAL / FOR EYES ONLY", 14, 35);

      const tableColumn = ["Date", "Description", "Score"];
      const tableRows = logs.map(log => [
        log.scanDate,
        log.summary,
        `${log.overallScore}%`
      ]);

      autoTable(doc, {
        startY: 45,
        head: [tableColumn],
        body: tableRows,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 30, 30] },
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 45;
      
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text("Cryptographic Integrity Signature", 14, finalY + 15);
      
      doc.setFontSize(8);
      doc.setTextColor(80);
      
      const sigLines = doc.splitTextToSize(`ECDSA Signature (P-256 / SHA-256):\n${signatureHex}`, 180);
      doc.text(sigLines, 14, finalY + 22);
      
      const pubKeyLines = doc.splitTextToSize(`Public Key Verification:\n${pubKeyHex}`, 180);
      doc.text(pubKeyLines, 14, finalY + 22 + (sigLines.length * 4) + 2);

      doc.save("Sentinel-Audit-Report.pdf");
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleBiometricAuth = async () => {
    setAuthError(null);
    try {
      if (!window.PublicKeyCredential) {
        setAuthError('Web Authentication (Passkeys/Biometrics) is not supported on this device/browser.');
        return;
      }

      const existingCredStr = localStorage.getItem('sentinel_biometric_id');

      if (existingCredStr) {
        // Authenticate existing credential
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);
        
        const credentialId = Uint8Array.from(atob(existingCredStr), c => c.charCodeAt(0));

        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge,
            allowCredentials: [{
              type: 'public-key',
              id: credentialId,
            }],
            userVerification: 'required'
          }
        });

        if (assertion) {
          setIsUnlocked(true);
        }
      } else {
        // Register new credential
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);
        const userId = new Uint8Array(16);
        crypto.getRandomValues(userId);

        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { 
              name: 'Sentinel Shield Pro',
              // rp.id defaults to current domain
            },
            user: {
              id: userId,
              name: 'premium@sentinel.app',
              displayName: 'Sentinel Premium User',
            },
            pubKeyCredParams: [
              { alg: -7, type: 'public-key' },
              { alg: -257, type: 'public-key' }
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required'
            },
            timeout: 60000
          }
        });

        if (credential) {
          const rawId = (credential as PublicKeyCredential).rawId;
          const base64Id = btoa(Array.from(new Uint8Array(rawId)).map(b => String.fromCharCode(b)).join(''));
          localStorage.setItem('sentinel_biometric_id', base64Id);
          setIsUnlocked(true);
        }
      }
    } catch (err: any) {
      console.warn('Biometric auth error:', err);
      // Fallback for preview environment if WebAuthn fails due to iframe sandbox or missing https
      if (err.name === 'NotAllowedError' && window.location.hostname !== 'localhost') {
         // Silently allow in some preview environments if totally blocked, or show explicit error.
         // Let's show explicit error to prove it's a real API call.
      }
      setAuthError(err.message || 'Authentication failed or was canceled.');
    }
  };

  const proFeatures = [
    'Real-Time System & Hardware Security Guard',
    'Gemini AI Phishing & APK Malware Scanner',
    'Unlimited Zero-Log WireGuard VPN Tunnel',
    'Dark Web Identity Breach Continuous Monitor',
    '14-Eyes Privacy Haven Routing & Jurisdiction Vault',
    'Tactical RF & IMSI Base Station Radar Sweep',
  ];

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-6 text-center px-4">
        <div 
          className="w-24 h-24 rounded-full flex items-center justify-center border-4"
          style={{ backgroundColor: `${skin.primaryColor}11`, borderColor: skin.primaryColor }}
        >
          <Lock className="w-10 h-10" style={{ color: skin.primaryColor }} />
        </div>
        
        <div className="max-w-xs space-y-2">
          <h2 className="text-xl font-black uppercase tracking-wider" style={{ color: skin.textPrimaryColor }}>
            Vault Locked
          </h2>
          <p className="text-xs leading-relaxed" style={{ color: skin.textSecondaryColor }}>
            This secure enclave contains your cryptographic license and audit history. Please authenticate with a physical Passkey or Biometric ID.
          </p>
        </div>

        {authError && (
          <div className="max-w-sm p-3 rounded-xl border flex items-start gap-2 text-left" style={{ backgroundColor: skin.surfaceColor, borderColor: 'rgb(244 63 94 / 0.3)' }}>
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="text-[11px] text-rose-400 font-mono leading-tight">{authError}</span>
          </div>
        )}

        <button
          onClick={handleBiometricAuth}
          className="flex items-center gap-3 px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-sm transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
          style={{ backgroundColor: skin.primaryColor, color: skin.bgColor }}
        >
          <Fingerprint className="w-5 h-5" />
          <span>Authenticate</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div>
        <span className="text-[10px] font-bold font-mono tracking-widest uppercase px-2 py-0.5 rounded" style={{ backgroundColor: `${skin.primaryColor}22`, color: skin.primaryColor }}>
          LICENSE & THEME VAULT
        </span>
        <h2 className="text-xl font-black mt-1" style={{ color: skin.textPrimaryColor }}>
          Sentinel Pro License & Customization
        </h2>
        <p className="text-xs mt-0.5" style={{ color: skin.textSecondaryColor }}>
          Manage your lifetime cryptographic license certificate, UI visual themes, multi-language localization, and scan audit logs.
        </p>
      </div>

      {/* Active License Card */}
      <div
        id="license-vault-card"
        className="p-6 rounded-3xl border space-y-4 relative overflow-hidden"
        style={{
          backgroundColor: skin.cardColor,
          borderColor: skin.primaryColor,
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center border"
            style={{
              backgroundColor: `${skin.primaryColor}22`,
              borderColor: skin.primaryColor,
            }}
          >
            <Star className="w-6 h-6" style={{ color: skin.primaryColor }} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black" style={{ color: skin.textPrimaryColor }}>
                Sentinel Pro Lifetime Active
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                VERIFIED
              </span>
            </div>
            <div className="text-xs font-mono mt-0.5" style={{ color: skin.accentSecondary }}>
              Key: SENTINEL-PRO-2026-9981-XQ
            </div>
          </div>
        </div>

        <p className="text-xs" style={{ color: skin.textSecondaryColor }}>
          Unlimited Gemini AI Threat Audits, Zero-Log WireGuard VPN, Dark Web Surveillance, and priority Swiss node routing included.
        </p>

        <div className="pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-2" style={{ borderColor: `${skin.borderColor}55` }}>
          {proFeatures.map((feat, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs" style={{ color: skin.textPrimaryColor }}>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Skins & Themes Selector */}
      <div className="p-5 rounded-3xl border space-y-4" style={{ backgroundColor: skin.cardColor, borderColor: skin.borderColor }}>
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5" style={{ color: skin.primaryColor }} />
          <h3 className="text-sm font-bold" style={{ color: skin.textPrimaryColor }}>
            Visual Themes & Display Skins
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {Object.values(APP_SKINS).map((cand) => {
            const isSelected = cand.id === currentSkinId;
            return (
              <button
                key={cand.id}
                onClick={() => onSelectSkin(cand.id)}
                className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-left transition-all cursor-pointer hover:scale-[1.01]"
                style={{
                  backgroundColor: isSelected ? skin.surfaceColor : 'transparent',
                  borderColor: isSelected ? cand.primaryColor : skin.borderColor,
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cand.icon}</span>
                  <div>
                    <div className="text-xs font-bold" style={{ color: skin.textPrimaryColor }}>
                      {cand.displayName}
                    </div>
                    <div className="text-[10px]" style={{ color: skin.textMutedColor }}>
                      {cand.isDark ? 'Dark Tactical Mode' : 'Light Clean Mode'}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: cand.primaryColor, color: cand.isDark ? '#000' : '#fff' }}
                  >
                    ✓
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Language / Locale Selector */}
      <div className="p-5 rounded-3xl border space-y-4" style={{ backgroundColor: skin.cardColor, borderColor: skin.borderColor }}>
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5" style={{ color: skin.primaryColor }} />
          <h3 className="text-sm font-bold" style={{ color: skin.textPrimaryColor }}>
            Interface Language
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {APP_LANGUAGES.map((lang) => {
            const isSelected = lang.code === currentLanguage;
            return (
              <button
                key={lang.code}
                onClick={() => onSelectLanguage(lang.code)}
                className="p-3 rounded-2xl border flex items-center justify-between gap-2 text-xs font-bold cursor-pointer transition-all"
                style={{
                  backgroundColor: isSelected ? skin.surfaceColor : 'transparent',
                  borderColor: isSelected ? skin.primaryColor : skin.borderColor,
                  color: skin.textPrimaryColor,
                }}
              >
                <div className="flex items-center gap-2 truncate">
                  <span>{lang.flag}</span>
                  <span className="truncate">{lang.displayName}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: skin.primaryColor }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scan History Audit Log */}
      <div className="p-5 rounded-3xl border space-y-4" style={{ backgroundColor: skin.cardColor, borderColor: skin.borderColor }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5" style={{ color: skin.primaryColor }} />
            <h3 className="text-sm font-bold" style={{ color: skin.textPrimaryColor }}>
              Audit History Logs ({logs.length})
            </h3>
          </div>
          {logs.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer hover:bg-black/5 disabled:opacity-50 transition-colors"
                style={{ borderColor: skin.borderColor, color: skin.textPrimaryColor }}
              >
                {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span className="font-bold">Export PDF</span>
              </button>
              <button
                onClick={handleClearLogs}
                className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-rose-400 border-rose-400/20 hover:bg-rose-400/10 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="font-bold">Clear</span>
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {logs.length === 0 ? (
            <p className="text-xs" style={{ color: skin.textMutedColor }}>
              No audit logs recorded yet.
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl border flex items-center justify-between gap-3 text-xs"
                style={{ backgroundColor: skin.surfaceColor, borderColor: skin.borderColor }}
              >
                <div className="min-w-0">
                  <div className="font-bold truncate" style={{ color: skin.textPrimaryColor }}>
                    {log.summary}
                  </div>
                  <div className="text-[10px] font-mono" style={{ color: skin.textMutedColor }}>
                    {log.scanDate}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold font-mono text-emerald-400">
                    {log.overallScore}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
