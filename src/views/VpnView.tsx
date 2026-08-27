import React, { useState, useEffect } from 'react';
import { VpnServer, VpnTunnelState, AppSkinConfig } from '../types';
import { VpnTunnelStore, VpnSessionStats } from '../services/vpnStore';
import { VPN_SERVERS } from '../data/jurisdictions';
import { VpnServerCard } from '../components/SecurityItemCards';
import { Network, ShieldCheck, ShieldAlert, Activity, Key, Upload, FileText, CheckCircle2, Lock, ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';

interface Props {
  skin: AppSkinConfig;
}

export const VpnView: React.FC<Props> = ({ skin }) => {
  const [vpnData, setVpnData] = useState(VpnTunnelStore.getState());
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configText, setConfigText] = useState(vpnData.customConfig || '');

  useEffect(() => {
    const unsubscribe = VpnTunnelStore.subscribe((data) => {
      setVpnData(data);
    });
    return () => unsubscribe();
  }, []);

  const { tunnelState, selectedServer, stats } = vpnData;
  const isConnected = tunnelState === 'Connected';
  const isTransitioning = tunnelState === 'Starting' || tunnelState === 'Verifying';

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleToggle = async () => {
    await VpnTunnelStore.toggleTunnel();
  };

  const handleSaveConfig = () => {
    VpnTunnelStore.saveCustomConfig(configText);
    setShowConfigModal(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setConfigText(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold font-mono tracking-widest uppercase px-2 py-0.5 rounded" style={{ backgroundColor: `${skin.primaryColor}22`, color: skin.primaryColor }}>
            WIREGUARD PROTOCOL KERNEL
          </span>
          <h2 className="text-xl font-black mt-1" style={{ color: skin.textPrimaryColor }}>
            Zero-Log VPN Tunnel
          </h2>
          <p className="text-xs mt-0.5" style={{ color: skin.textSecondaryColor }}>
            Post-quantum resistant ChaCha20-Poly1305 encrypted WireGuard tunnel routed through verified privacy jurisdictions.
          </p>
        </div>

        <button
          onClick={() => setShowConfigModal(true)}
          className="p-2 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer hover:bg-white/5"
          style={{ borderColor: skin.borderColor, color: skin.textPrimaryColor }}
        >
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">Import .conf</span>
        </button>
      </div>

      {/* Main Connection Hero Card */}
      <div
        className="p-6 rounded-3xl border transition-all relative overflow-hidden"
        style={{
          backgroundColor: skin.cardColor,
          borderColor: isConnected ? skin.primaryColor : skin.borderColor,
        }}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-all ${
                isConnected ? 'animate-pulse' : ''
              }`}
              style={{
                backgroundColor: isConnected ? `${skin.primaryColor}22` : skin.surfaceColor,
                borderColor: isConnected ? skin.primaryColor : skin.borderColor,
              }}
            >
              <Network
                className="w-8 h-8"
                style={{ color: isConnected ? skin.primaryColor : skin.textMutedColor }}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedServer.flagEmoji}</span>
                <h3 className="text-lg font-black" style={{ color: skin.textPrimaryColor }}>
                  {selectedServer.country}
                </h3>
              </div>
              <p className="text-xs font-mono" style={{ color: skin.textSecondaryColor }}>
                {selectedServer.city}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono"
                  style={{
                    backgroundColor: isConnected ? `${skin.primaryColor}22` : 'rgba(120,120,120,0.15)',
                    color: isConnected ? skin.primaryColor : skin.textMutedColor,
                    border: `1px solid ${isConnected ? skin.primaryColor : skin.borderColor}`,
                  }}
                >
                  {tunnelState}
                </span>
                {isConnected && stats.handshakeVerified && (
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Handshake Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Connect / Disconnect Action Button */}
          <button
            id="btn-toggle-vpn"
            onClick={handleToggle}
            disabled={isTransitioning}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2.5 shadow-lg cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: isConnected ? '#FF3366' : skin.primaryColor,
              color: isConnected ? '#FFFFFF' : (skin.isDark ? '#000000' : '#FFFFFF'),
            }}
          >
            {isTransitioning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying Tunnel...</span>
              </>
            ) : isConnected ? (
              <span>Disconnect Tunnel</span>
            ) : (
              <span>Connect WireGuard</span>
            )}
          </button>
        </div>

        {/* Live Tunnel Telemetry */}
        {isConnected && (
          <div className="mt-6 pt-5 border-t grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ borderColor: `${skin.borderColor}55` }}>
            <div className="p-3 rounded-xl" style={{ backgroundColor: skin.surfaceColor }}>
              <div className="text-[10px] flex items-center gap-1" style={{ color: skin.textMutedColor }}>
                <ArrowDown className="w-3 h-3 text-emerald-400" />
                <span>RX Traffic</span>
              </div>
              <div className="text-sm font-bold font-mono mt-1" style={{ color: skin.textPrimaryColor }}>
                {formatBytes(stats.rxBytes)}
              </div>
            </div>

            <div className="p-3 rounded-xl" style={{ backgroundColor: skin.surfaceColor }}>
              <div className="text-[10px] flex items-center gap-1" style={{ color: skin.textMutedColor }}>
                <ArrowUp className="w-3 h-3 text-cyan-400" />
                <span>TX Traffic</span>
              </div>
              <div className="text-sm font-bold font-mono mt-1" style={{ color: skin.textPrimaryColor }}>
                {formatBytes(stats.txBytes)}
              </div>
            </div>

            <div className="p-3 rounded-xl" style={{ backgroundColor: skin.surfaceColor }}>
              <div className="text-[10px]" style={{ color: skin.textMutedColor }}>
                Peer Endpoint
              </div>
              <div className="text-xs font-mono truncate mt-1" style={{ color: skin.textPrimaryColor }}>
                {stats.endpoint}
              </div>
            </div>

            <div className="p-3 rounded-xl" style={{ backgroundColor: skin.surfaceColor }}>
              <div className="text-[10px]" style={{ color: skin.textMutedColor }}>
                Latest Handshake
              </div>
              <div className="text-xs font-mono mt-1 text-emerald-400">
                {stats.lastHandshakeEpochMs ? `${Math.round((Date.now() - stats.lastHandshakeEpochMs) / 1000)}s ago` : 'Active'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Server Locations Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: skin.textPrimaryColor }}>
            AVAILABLE SECURE GATEWAYS ({VPN_SERVERS.length})
          </h3>
          <span className="text-[11px]" style={{ color: skin.textMutedColor }}>
            Select node for zero-log WireGuard tunnel
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {VPN_SERVERS.map((server) => (
            <VpnServerCard
              key={server.id}
              server={server}
              isSelected={selectedServer.id === server.id}
              isConnected={isConnected && selectedServer.id === server.id}
              onSelect={() => VpnTunnelStore.selectServer(server)}
              skin={skin}
            />
          ))}
        </div>
      </div>

      {/* WireGuard Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div
            className="w-full max-w-xl p-6 rounded-3xl border shadow-2xl space-y-4"
            style={{ backgroundColor: skin.bgColor, borderColor: skin.primaryColor }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: skin.textPrimaryColor }}>
                Custom WireGuard .conf Configuration
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-xs p-1 rounded hover:bg-white/10"
                style={{ color: skin.textMutedColor }}
              >
                ✕
              </button>
            </div>

            <p className="text-xs" style={{ color: skin.textSecondaryColor }}>
              Import custom zero-log WireGuard tunnels or edit cryptographic keys directly.
            </p>

            <div className="flex items-center gap-2">
              <label className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-white/5" style={{ borderColor: skin.borderColor, color: skin.textPrimaryColor }}>
                <Upload className="w-3.5 h-3.5" />
                <span>Upload .conf File</span>
                <input type="file" accept=".conf,.txt" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <textarea
              rows={8}
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              placeholder="[Interface]&#10;PrivateKey = ...&#10;Address = 10.0.0.2/32&#10;DNS = 1.1.1.1&#10;&#10;[Peer]&#10;PublicKey = ...&#10;Endpoint = ch1.sentinel-shield.net:51820&#10;AllowedIPs = 0.0.0.0/0"
              className="w-full p-3 rounded-xl border font-mono text-xs outline-none"
              style={{ backgroundColor: skin.cardColor, borderColor: skin.borderColor, color: skin.textPrimaryColor }}
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                style={{ color: skin.textMutedColor }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                style={{ backgroundColor: skin.primaryColor, color: skin.isDark ? '#000' : '#fff' }}
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
