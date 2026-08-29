import React, { useState, useEffect } from 'react';
import { DeviceLocationState, SignalRadarItem, SignalRadarSnapshot, AppSkinConfig } from '../types';
import { SignalRadarEngine } from '../services/radarEngine';
import { ThreatSnapshotEngine } from '../services/threatSnapshotEngine';
import { TacticalRadarMap } from '../components/TacticalRadarMap';
import {
  Radio,
  AlertTriangle,
  Bluetooth,
  TowerControl,
  Wifi,
  Shield,
  RefreshCw,
  Layers,
  MapPin,
  HelpCircle,
  Database,
  Lock,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface Props {
  location: DeviceLocationState;
  skin: AppSkinConfig;
}

export const RadarView: React.FC<Props> = ({ location, skin }) => {
  const [snapshot, setSnapshot] = useState<SignalRadarSnapshot>(() => ThreatSnapshotEngine.getSnapshot().radar);
  const [filter, setFilter] = useState<'ALL' | 'BLE' | 'CELLULAR' | 'WIFI'>('ALL');
  const [isRequestingPerm, setIsRequestingPerm] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    const unsubscribe = ThreatSnapshotEngine.subscribe((threatSnap) => {
      setSnapshot(threatSnap.radar);
    });
    return () => unsubscribe();
  }, []);

  const isPermissionGranted = location.permissionState === 'GRANTED';
  const isPermissionDenied = location.permissionState === 'DENIED';
  const isPermanentlyDenied = location.permissionState === 'PERMANENTLY_DENIED';

  const handleGrantPermission = async () => {
    setIsRequestingPerm(true);
    try {
      const res = await ThreatSnapshotEngine.requestGeolocationPermission();
      if (res.permissionState === 'GRANTED') {
        addToast('Sensor and location permissions granted. Telephony audit refreshed.', 'success');
      } else {
        addToast('Location permission was denied. Status remains UNAVAILABLE.', 'alert');
      }
    } catch (err) {
      console.warn('Permission request error:', err);
    } finally {
      setIsRequestingPerm(false);
    }
  };

  const filteredSignals = snapshot.signals.filter((s) => {
    if (filter === 'ALL') return true;
    if (filter === 'BLE') return s.kind === 'BLE';
    if (filter === 'CELLULAR') return s.kind === 'CELLULAR';
    if (filter === 'WIFI') return s.kind === 'WIFI_NETWORK';
    return true;
  });

  const handleLoadTestEvidence = () => {
    SignalRadarEngine.loadTestEvidence(location.latitude, location.longitude);
    addToast('Loaded test evidence records for RF evaluation.', 'info');
  };

  const handleClearEvidence = () => {
    SignalRadarEngine.clearObservations();
    addToast('Cleared RF sweep observations.', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-bold font-mono tracking-widest uppercase px-2 py-0.5 rounded"
              style={{
                backgroundColor: `${skin.primaryColor}22`,
                color: skin.primaryColor,
                border: `1px solid ${skin.primaryColor}44`,
              }}
            >
              TELEPHONY & RF AUDIT
            </span>
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold"
              style={{
                backgroundColor: isPermissionGranted ? 'rgba(255, 179, 0, 0.15)' : 'rgba(120, 120, 120, 0.15)',
                color: isPermissionGranted ? '#FFB300' : skin.textMutedColor,
                border: `1px solid ${isPermissionGranted ? '#FFB30044' : skin.borderColor}`,
              }}
            >
              STATUS: {isPermissionGranted ? 'UNVERIFIED (HEURISTIC)' : 'UNAVAILABLE'}
            </span>
          </div>
          <h2 className="text-xl font-black mt-1" style={{ color: skin.textPrimaryColor }}>
            Telephony & RF Radar Sweep
          </h2>
          <p className="text-xs mt-0.5" style={{ color: skin.textSecondaryColor }}>
            Evaluation of cellular base stations (eNodeB / gNodeB), BLE proximity beacons, and IMSI-catcher anomaly telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {snapshot.signals.length > 0 ? (
            <button
              onClick={handleClearEvidence}
              className="px-3 py-1.5 rounded-xl border text-xs font-mono font-bold cursor-pointer hover:bg-white/5 transition-colors"
              style={{ borderColor: skin.borderColor, color: skin.textMutedColor }}
              title="Clear observed contacts"
            >
              Clear Sweep
            </button>
          ) : (
            <button
              onClick={handleLoadTestEvidence}
              className="px-3 py-1.5 rounded-xl border text-xs font-mono font-bold cursor-pointer hover:bg-white/5 transition-colors flex items-center gap-1.5"
              style={{ borderColor: skin.borderColor, color: skin.primaryColor }}
              title="Load verified sandbox test evidence"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Load Test Evidence</span>
            </button>
          )}
        </div>
      </div>

      {/* Permission & Capability Verification Status Banner */}
      {!isPermissionGranted && (
        <div
          className="p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          style={{
            backgroundColor: skin.cardColor,
            borderColor: '#FFB30066',
          }}
        >
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-amber-400">
                  Required Runtime Sensor Permission Missing
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                  UNAVAILABLE
                </span>
              </div>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: skin.textSecondaryColor }}>
                Sensor and location permissions have not been granted. Telephony & RF radar requires geolocation telemetry to compute tower bearings and distance models.
              </p>
              <p className="text-[11px] font-mono mt-1 text-slate-400">
                Rule: Permission grant only enables audit execution; it does not constitute security verification.
              </p>
            </div>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            {isPermanentlyDenied ? (
              <button
                onClick={() => alert('Please open browser/system Site Settings and enable Location access.')}
                className="w-full md:w-auto px-4 py-2 rounded-xl text-xs font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 cursor-pointer"
              >
                Open App Settings
              </button>
            ) : (
              <button
                onClick={handleGrantPermission}
                disabled={isRequestingPerm}
                className="w-full md:w-auto px-4 py-2 rounded-xl text-xs font-bold font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:scale-[1.02]"
                style={{
                  backgroundColor: skin.primaryColor,
                  color: skin.isDark ? '#000' : '#fff',
                }}
              >
                {isRequestingPerm ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <MapPin className="w-3.5 h-3.5" />
                )}
                <span>Grant Permissions</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Interactive Radar Canvas & Tactical Map */}
      <TacticalRadarMap
        location={location}
        signals={snapshot.signals}
        skin={skin}
        onSampleLoad={handleLoadTestEvidence}
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
            {snapshot.cellularCount > 0 ? `MCC ${snapshot.signals.find((s) => s.mcc)?.mcc || 219} Active` : 'No Tower Ingested'}
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
            {snapshot.bleCount > 0 ? `${snapshot.bleCount} In Range` : 'Zero BLE Trackers'}
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
            {snapshot.networkCount > 0 ? 'PMF Protected' : 'Default Interface'}
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
            {snapshot.anomalyCount > 0 ? `${snapshot.anomalyCount} Flagged Anomalies` : 'Clean RF Horizon'}
          </span>
        </div>
      </div>

      {/* Signal Filters & Stats */}
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
          Showing {filteredSignals.length} evidence contacts
        </span>
      </div>

      {/* Signals List / Empty State */}
      {filteredSignals.length === 0 ? (
        <div
          className="p-8 rounded-2xl border text-center flex flex-col items-center justify-center space-y-2"
          style={{ backgroundColor: skin.cardColor, borderColor: skin.borderColor }}
        >
          <div className="p-3 rounded-full bg-white/5 border" style={{ borderColor: skin.borderColor }}>
            <Radio className="w-6 h-6" style={{ color: skin.textMutedColor }} />
          </div>
          <h3 className="text-sm font-bold font-mono" style={{ color: skin.textPrimaryColor }}>
            No Signal Observations Recorded
          </h3>
          <p className="text-xs max-w-md" style={{ color: skin.textSecondaryColor }}>
            Under Sentinel Shield's strict zero-fabrication standard, contacts are only displayed when verified from hardware sensors or imported evidence records.
          </p>
          <button
            onClick={handleLoadTestEvidence}
            className="mt-2 px-4 py-2 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer hover:bg-white/5"
            style={{ borderColor: skin.primaryColor, color: skin.primaryColor }}
          >
            Load Sample Test Evidence
          </button>
        </div>
      ) : (
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold truncate" style={{ color: skin.textPrimaryColor }}>
                        {item.label}
                      </h4>
                      {isFlagged && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 font-mono">
                          ANOMALY
                        </span>
                      )}
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded border bg-black/30" style={{ borderColor: skin.borderColor, color: skin.textMutedColor }}>
                        {item.locationConfidence || 'KNOWN_LOCATION'}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono" style={{ color: skin.textSecondaryColor }}>
                      {item.technology} {item.cellId ? `• CID: ${item.cellId}` : ''} {item.areaCode ? `• LAC/TAC: ${item.areaCode}` : ''}
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
      )}
    </div>
  );
};
