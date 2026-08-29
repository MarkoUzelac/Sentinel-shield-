import React, { useState } from 'react';
import { DarkWebBreach, AppSkinConfig } from '../types';
import { Search, ShieldAlert, ShieldCheck, Lock, Globe, Key, AlertTriangle, Info } from 'lucide-react';

interface Props {
  skin: AppSkinConfig;
}

export const DarkWebView: React.FC<Props> = ({ skin }) => {
  const [emailInput, setEmailInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [breaches, setBreaches] = useState<DarkWebBreach[]>([]);
  const [providerNote, setProviderNote] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!emailInput.trim() || isSearching) return;
    setIsSearching(true);
    setSearched(false);
    setProviderNote(null);

    try {
      const res = await fetch('/api/darkweb-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: emailInput.trim() }),
      });
      const data = await res.json();
      setBreaches(data.breaches || []);
      if (data.note) {
        setProviderNote(data.note);
      }
      setSearched(true);
    } catch (err) {
      console.error('Breach search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <span className="text-[10px] font-bold font-mono tracking-widest uppercase px-2 py-0.5 rounded" style={{ backgroundColor: `${skin.primaryColor}22`, color: skin.primaryColor }}>
          IDENTITY BREACH SURVEILLANCE
        </span>
        <h2 className="text-xl font-black mt-1" style={{ color: skin.textPrimaryColor }}>
          Dark Web & Credential Exposure Monitor
        </h2>
        <p className="text-xs mt-0.5" style={{ color: skin.textSecondaryColor }}>
          Search for leaked corporate credentials, compromised password hashes, and identity exposures across verified breach telemetry databases.
        </p>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl border space-y-3" style={{ backgroundColor: skin.cardColor, borderColor: skin.borderColor }}>
        <label className="text-xs font-bold" style={{ color: skin.textPrimaryColor }}>
          Email Address or Account Identity
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="user@example.com"
            className="flex-1 p-3 rounded-xl border text-xs font-mono outline-none"
            style={{
              backgroundColor: skin.surfaceColor,
              borderColor: skin.borderColor,
              color: skin.textPrimaryColor,
            }}
          />
          <button
            onClick={handleSearch}
            disabled={!emailInput.trim() || isSearching}
            className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: skin.primaryColor,
              color: skin.isDark ? '#000' : '#fff',
            }}
          >
            <Search className="w-4 h-4" />
            <span>{isSearching ? 'SEARCHING...' : 'CHECK BREACHES'}</span>
          </button>
        </div>
      </div>

      {/* Provider & Zero-Slop Standard Notice */}
      {providerNote && (
        <div className="p-4 rounded-2xl border flex items-start gap-3" style={{ backgroundColor: skin.cardColor, borderColor: 'rgba(255, 179, 0, 0.4)' }}>
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-amber-400">Open Source OSINT Intelligence</h4>
            <p style={{ color: skin.textSecondaryColor }}>{providerNote}</p>
          </div>
        </div>
      )}

      {/* Search Results */}
      {searched && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: skin.textPrimaryColor }}>
              SEARCH RESULTS ({breaches.length})
            </h3>
            <span className="text-[11px]" style={{ color: skin.textMutedColor }}>
              Target: {emailInput}
            </span>
          </div>

          {breaches.length === 0 ? (
            <div className="p-6 rounded-2xl border text-center space-y-2" style={{ backgroundColor: skin.cardColor, borderColor: skin.borderColor }}>
              <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold" style={{ color: skin.textPrimaryColor }}>
                No Known Breaches Found
              </h4>
              <p className="text-xs" style={{ color: skin.textSecondaryColor }}>
                This account was not found in verified public breach databases. Maintain strong unique passwords.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {breaches.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-2xl border space-y-2"
                  style={{
                    backgroundColor: skin.cardColor,
                    borderColor: b.riskLevel === 'HIGH' ? 'rgba(255, 51, 102, 0.5)' : skin.borderColor,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: skin.textPrimaryColor }}>
                      {b.domain}
                    </span>
                    <span
                      className="text-[10px] font-black px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: b.riskLevel === 'HIGH' ? 'rgba(255, 51, 102, 0.2)' : 'rgba(255, 179, 0, 0.2)',
                        color: b.riskLevel === 'HIGH' ? '#FF3366' : '#FFB300',
                      }}
                    >
                      {b.riskLevel} RISK
                    </span>
                  </div>
                  <p className="text-xs font-mono" style={{ color: skin.textMutedColor }}>
                    Breach Date: {b.breachDate}
                  </p>
                  <p className="text-xs" style={{ color: skin.textSecondaryColor }}>
                    {b.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {b.compromisedFields.map((f, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono px-2 py-0.5 rounded border"
                        style={{
                          backgroundColor: skin.surfaceColor,
                          borderColor: skin.borderColor,
                          color: skin.textPrimaryColor,
                        }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
