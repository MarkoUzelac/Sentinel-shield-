import React, { useState, useEffect } from 'react';
import { DeviceLocationState, SignalRadarItem, SignalRadarSnapshot, AppSkinConfig } from '../types';
import { SignalRadarEngine } from '../services/radarEngine';
import { TacticalRadarMap } from '../components/TacticalRadarMap';
import { Radio, AlertTriangle, Bluetooth, TowerControl, Wifi, Shield, RefreshCw, Layers } from 'lucide-react';

interface Props {
  location: DeviceLocationState;
  skin: AppSkinConfig;
}

export const RadarView: React.FC<Props> = ({ location, skin }) => {
  const [snapshot, setSnapshot] = useState<SignalRadarSnapshot>(SignalRadarEngine.getSnapshot());
  const [filter, setFilter] = useState<'ALL' | 'BLE' | 'CELLULAR' | 'WIFI'>('ALL');

  useEffect(() => {
    const unsubscribe = SignalRadarEngine.startScanning((snap) => {
      setSnapshot(snap);
    });
    return () => unsubscribe();
  }, []);

  const filteredSignals = snapshot.signals.filter((s) => {
    if (filter === 'ALL') return true;
    if (filter === 'BLE') return s.kind === 'BLE';
    if (filter === 'CELLULAR') return s.kind === 'CELLULAR';
    if (filter === 'WIFI') return s.kind === 'WIFI_NETWORK';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <span className="text-[10px] font-bold font-mono tracking-widest uppercase px-2 py-0.5 rounded" style={{ backgroundColor: `${skin.primaryColor}22`, color: skin.primaryColor }}>
          TACTICAL SIGNAL INTELLIGENCE
        </span>
        <h2 className="text-xl font-black mt-1" style={{ color: skin.textPrimaryColor }}>
          RF & IMSI Radar Sweep
        </h2>
        <p className="text-xs mt-0.5" style={{ color: skin.textSecondaryColor }}>
          Continuous runtime monitoring of Cellular Base Stations (eNodeB / gNodeB), BLE Beacons, and Wi-Fi Access Points.
        </p>
      </div>

      {/* Interactive Radar Canvas Map */}
      <TacticalRadarMap
        location={location}
        signals={snapshot.signals}
        skin={skin}
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl border flex flex-col justify-between" style={{ backgroundColor: skin.cardColor, borderColor: skin.borderColor }}>
          <div className="flex items-center justify-between text-xs" style={{ color: skin.textMutedColor }}>
            <span>Cell Towers</span>
            <TowerControl className="w-3.5 h-3.5" style={{ color: skin.primaryColor }} />
          </div>
          <div className="text-2xl font-black font-mono mt-2" style={{ color: skin.textPrimaryColor }}>
            {snapshot.cellularCount}
          </div>
          <span className="text-[10px]" style={{ color: skin.primaryColor }}>
            MCC {snapshot.signals.find((s) => s.mcc)?.mcc || 219} Active
          </span>
        </div>

        <div className="p-3.5 rounded-2xl border flex flex-col justify-between" style={{ backgroundColor: skin.cardColor, borderColor: skin.borderColor }}>
          <div className="flex items-center justify-between text-xs" style={{ color: skin.textMutedColor }}>
            <span>BLE Beacons</span>
            <Bluetooth className="w-3.5 h-3.5" style={{ color: skin.accentSecondary }} />
          </div>
          <div className="text-2xl font-black font-mono mt-2" style={{ color: skin.textPrimaryColor }}>
            {snapshot.bleCount}
          </div>
          <span className="text-[10px]" style={{ color: skin.accentSecondary }}>
            Tracking Scanned
          </span>
        </div>

        <div className="p-3.5 rounded-2xl border flex flex-col justify-between" style={{ backgroundColor: skin.cardColor, borderColor: skin.borderColor }}>
          <div className="flex items-center justify-between text-xs" style={{ color: skin.textMutedColor }}>
            <span>Wi-Fi Sockets</span>
            <Wifi className="w-3.5 h-3.5" style={{ color: '#00F0FF' }} />
          </div>
          <div className="text-2xl font-black font-mono mt-2" style={{ color: skin.textPrimaryColor }}>
            {snapshot.networkCount}
          </div>
          <span className="text-[10px]" style={{ color: '#00F0FF' }}>
            PMF Protected
          </span>
        </div>

        <div className="p-3.5 rounded-2xl border flex flex-col justify-between" style={{ backgroundColor: skin.cardColor, borderColor: skin.borderColor }}>
          <div className="flex items-center justify-between text-xs" style={{ color: skin.textMutedColor }}>
            <span>Anomaly Risk</span>
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: snapshot.anomalyCount > 0 ? '#FF3366' : skin.primaryColor }} />
          </div>
          <div className="text-2xl font-black font-mono mt-2" style={{ color: snapshot.anomalyCount > 0 ? '#FF3366' : skin.primaryColor }}>
            {snapshot.anomalyScore}%
          </div>
          <span className="text-[10px]" style={{ color: snapshot.anomalyCount > 0 ? '#FF3366' : skin.primaryColor }}>
            {snapshot.anomalyCount > 0 ? `${snapshot.anomalyCount} Flagged` : 'Zero Anomalies'}
          </span>
        </div>
      </div>

      {/* Signal Filters */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 p-1 rounded-xl border" style={{ backgroundColor: skin.cardColor, borderColor: skin.borderColor }}>
          {(['ALL', 'CELLULAR', 'BLE', 'WIFI'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className="px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              style={{
                backgroundColor: filter === tab ? skin.primaryColor : 'transparent',
                color: filter === tab ? (skin.isDark ? '#000' : '#fff') : skin.textMutedColor,
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <span className="text-[11px] font-mono" style={{ color: skin.textMutedColor }}>
          Showing {filteredSignals.length} items
        </span>
      </div>

      {/* Signals Table List */}
      <div className="space-y-2.5">
        {filteredSignals.map((item) => {
          const isFlagged = item.risk === 'HIGH' || item.risk === 'MEDIUM' || item.anomalyScore > 50;
          return (
            <div
              key={item.id}
              className="p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
              style={{
                backgroundColor: skin.cardColor,
                borderColor: isFlagged ? 'rgba(255, 51, 102, 0.45)' : skin.borderColor,
              }}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    backgroundColor: item.kind === 'BLE' ? `${skin.accentSecondary}22` : `${skin.primaryColor}22`,
                  }}
                >
                  {item.kind === 'BLE' ? (
                    <Bluetooth className="w-4 h-4" style={{ color: skin.accentSecondary }} />
                  ) : item.kind === 'CELLULAR' ? (
                    <TowerControl className="w-4 h-4" style={{ color: skin.primaryColor }} />
                  ) : (
                    <Wifi className="w-4 h-4" style={{ color: '#00F0FF' }} />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold truncate" style={{ color: skin.textPrimaryColor }}>
                      {item.label}
                    </h4>
                    {isFlagged && (
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40">
                        ANOMALY
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono" style={{ color: skin.textSecondaryColor }}>
                    {item.technology} {item.cellId ? `• CID: ${item.cellId}` : ''} {item.areaCode ? `• LAC: ${item.areaCode}` : ''}
                  </p>
                  <p className="text-[11px] mt-0.5 leading-tight" style={{ color: skin.textMutedColor }}>
                    {item.explanation}
                  </p>
                </div>
              </div>

              <div className="flex items-center sm:flex-col sm:items-end justify-between shrink-0 font-mono text-xs border-t sm:border-t-0 pt-2 sm:pt-0" style={{ borderColor: `${skin.borderColor}44` }}>
                <div className="font-bold flex items-center gap-1" style={{ color: isFlagged ? '#FF3366' : skin.primaryColor }}>
                  <Radio className="w-3 h-3" />
                  <span>{item.rssiDbm ? `${item.rssiDbm} dBm` : 'N/A'}</span>
                </div>
                <span className="text-[10px]" style={{ color: skin.textMutedColor }}>
                  {item.estimatedDistanceMeters ? `~${item.estimatedDistanceMeters}m` : 'Local Host'} • {item.persistenceSeconds}s
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
