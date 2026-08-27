import React, { useState } from 'react';
import { ThreatItem, AppSkinConfig } from '../types';
import { ThreatAlertCard } from '../components/SecurityItemCards';
import { ScanDatabase } from '../services/scanDatabase';
import { Sparkles, Bot, Shield, AlertTriangle, CheckCircle, Search, HelpCircle } from 'lucide-react';

interface Props {
  threats: ThreatItem[];
  onAddThreat: (threat: ThreatItem) => void;
  onResolveThreat: (id: string) => void;
  onOpenAdvisorChat: () => void;
  skin: AppSkinConfig;
}

export const AiScannerView: React.FC<Props> = ({
  threats,
  onAddThreat,
  onResolveThreat,
  onOpenAdvisorChat,
  skin,
}) => {
  const [targetInput, setTargetInput] = useState('');
  const [category, setCategory] = useState<'URL / Phishing' | 'SMS / Email Text' | 'Sideload APK' | 'Weak Credentials' | 'App Permissions'>('URL / Phishing');
  const [isScanning, setIsScanning] = useState(false);
  const [latestScanResult, setLatestScanResult] = useState<ThreatItem | null>(null);

  const categories = [
    'URL / Phishing',
    'SMS / Email Text',
    'Sideload APK',
    'Weak Credentials',
    'App Permissions',
  ] as const;

  const handleRunScan = async () => {
    if (!targetInput.trim() || isScanning) return;
    setIsScanning(true);
    setLatestScanResult(null);

    try {
      const res = await fetch('/api/threat-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: targetInput,
          category,
        }),
      });
      const data = await res.json();
      const threat: ThreatItem = {
        id: data.id || `ai_${Date.now()}`,
        title: data.title || 'Security Evaluation',
        category: data.category || category,
        severity: data.severity || 'MEDIUM',
        description: data.description || 'Analysis completed.',
        recommendation: data.recommendation || 'Follow defense-in-depth principles.',
        timestamp: Date.now(),
        isResolved: data.severity === 'SAFE',
        runtimeBacked: data.runtimeBacked,
      };

      setLatestScanResult(threat);
      if (threat.severity !== 'SAFE') {
        onAddThreat(threat);
      }
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const sampleTargets: Record<string, string> = {
    'URL / Phishing': 'http://secure-login-account-update.bit.ly/verify?token=98213',
    'SMS / Email Text': 'URGENT: Your parcel delivery is held due to $1.99 customs unpaid fee. Click bit.ly/parcels-eu',
    'Sideload APK': 'com.modded.crypto.free-wallet.apk (SHA256: 7f3b890a...)',
    'Weak Credentials': 'Admin2026!Password',
    'App Permissions': 'android.permission.RECORD_AUDIO + android.permission.ACCESS_BACKGROUND_LOCATION',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold font-mono tracking-widest uppercase px-2 py-0.5 rounded" style={{ backgroundColor: `${skin.primaryColor}22`, color: skin.primaryColor }}>
            GEMINI 2.5 CYBER INTELLIGENCE
          </span>
          <h2 className="text-xl font-black mt-1" style={{ color: skin.textPrimaryColor }}>
            AI Threat & Phishing Scanner
          </h2>
          <p className="text-xs mt-0.5" style={{ color: skin.textSecondaryColor }}>
            Deep heuristics and server-side Gemini threat analysis for suspicious URLs, APK packages, malicious payload texts, and credential exposures.
          </p>
        </div>

        <button
          onClick={onOpenAdvisorChat}
          className="p-2.5 px-4 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer hover:scale-105 shadow-md"
          style={{
            backgroundColor: `${skin.accentSecondary}22`,
            borderColor: skin.accentSecondary,
            borderWidth: 1,
            color: skin.accentSecondary,
          }}
        >
          <Bot className="w-4 h-4" />
          <span>Ask Sentinel AI</span>
        </button>
      </div>

      {/* Target Category Selector */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider" style={{ color: skin.textMutedColor }}>
          TARGET CATEGORY
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategory(cat);
                setTargetInput(sampleTargets[cat] || '');
              }}
              className="p-2.5 rounded-xl border text-xs font-bold transition-all text-center truncate cursor-pointer"
              style={{
                backgroundColor: category === cat ? skin.primaryColor : skin.cardColor,
                borderColor: category === cat ? skin.primaryColor : skin.borderColor,
                color: category === cat ? (skin.isDark ? '#000' : '#fff') : skin.textSecondaryColor,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="p-4 rounded-2xl border space-y-3" style={{ backgroundColor: skin.cardColor, borderColor: skin.borderColor }}>
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold" style={{ color: skin.textPrimaryColor }}>
            Target Input Payload
          </label>
          <button
            onClick={() => setTargetInput(sampleTargets[category] || '')}
            className="text-[11px] hover:underline cursor-pointer"
            style={{ color: skin.accentSecondary }}
          >
            Insert Sample Payload
          </button>
        </div>

        <textarea
          rows={3}
          value={targetInput}
          onChange={(e) => setTargetInput(e.target.value)}
          placeholder={`Enter ${category.toLowerCase()} to inspect...`}
          className="w-full p-3 rounded-xl border font-mono text-xs outline-none"
          style={{
            backgroundColor: skin.surfaceColor,
            borderColor: skin.borderColor,
            color: skin.textPrimaryColor,
          }}
        />

        <button
          onClick={handleRunScan}
          disabled={!targetInput.trim() || isScanning}
          className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
          style={{
            backgroundColor: skin.primaryColor,
            color: skin.isDark ? '#000' : '#fff',
          }}
        >
          <Sparkles className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'EVALUATING WITH GEMINI AI...' : 'RUN AI THREAT SCAN'}</span>
        </button>
      </div>

      {/* Latest Result Card */}
      {latestScanResult && (
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: skin.textPrimaryColor }}>
            SCAN RESULT
          </h3>
          <ThreatAlertCard
            threat={latestScanResult}
            onResolve={onResolveThreat}
            skin={skin}
          />
        </div>
      )}

      {/* Historical Threats */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: skin.textPrimaryColor }}>
          IDENTIFIED THREATS ({threats.length})
        </h3>
        {threats.length === 0 ? (
          <div className="p-6 rounded-2xl border text-center text-xs" style={{ backgroundColor: skin.cardColor, borderColor: skin.borderColor, color: skin.textMutedColor }}>
            Zero recorded threat findings. Run an AI scan to analyze payloads.
          </div>
        ) : (
          <div className="space-y-3">
            {threats.map((t) => (
              <ThreatAlertCard
                key={t.id}
                threat={t}
                onResolve={onResolveThreat}
                skin={skin}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
