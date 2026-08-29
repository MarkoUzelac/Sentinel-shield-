import React, { useState, useEffect } from 'react';
import {
  DeviceLocationState,
  SignalRadarItem,
  SignalRadarSnapshot,
  AppSkinConfig,
  CapabilityState,
  RadarState,
  TelemetrySourceType,
} from '../types';
import { SignalRadarEngine } from '../services/radarEngine';
import { ThreatSnapshotEngine } from '../services/threatSnapshotEngine';
import { TacticalRadarMap } from '../components/TacticalRadarMap';
import { BasebandTelemetrySection } from '../components/BasebandTelemetrySection';
import { OpenCellIdLookupModal } from '../components/OpenCellIdLookupModal';
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
  Beaker,
  Trash2,
  ChevronDown,
  ChevronUp,
  Info,
  ExternalLink,
  Activity,
  Cpu,
  Search,
  Plus,
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
  const [showFactorDetails, setShowFactorDetails] = useState(false);
  const [showRogueDetails, setShowRogueDetails] = useState(true);
  const [isOpenCellIdModalOpen, setIsOpenCellIdModalOpen] = useState(false);
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
        addToast({
          type: 'success',
          title: 'LOCATION PERMISSION GRANTED',
          message: 'Spatial proximity baseline coordinates indexed.',
        });
      } else {
        addToast({
          type: 'alert',
          title: 'PERMISSION DENIED',
          message: 'Location access was not granted.',
        });
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
    addToast({
      type: 'info',
      title: 'TEST EVIDENCE LOADED',
      message: 'Loaded isolated test evidence dataset in sandbox.',
    });
  };

  const handleClearEvidence = () => {
    SignalRadarEngine.clearObservations();
    addToast({
      type: 'info',
      title: 'SWEEP CLEARED',
      message: 'Radar returned to baseline state.',
    });
  };

  const handleAddSignalFromLookup = (signal: SignalRadarItem) => {
    SignalRadarEngine.addObservation(signal);
    addToast({
      type: 'success',
      title: 'TOWER PLOTTED',
      message: `Plotted ${signal.label} (Source: OpenCellID BACKUP).`,
    });
  };

  const getCapabilityBadge = (state: CapabilityState) => {
    switch (state) {
      case 'LIVE_HARDWARE':
        return {
          label: 'LIVE HARDWARE',
          color: '#10B981',
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.35)',
        };
      case 'PARTIAL_HARDWARE':
        return {
          label: 'PARTIAL HARDWARE',
          color: '#F59E0B',
          bg: 'rgba(245, 158, 11, 0.15)',
          border: 'rgba(245, 158, 11, 0.35)',
        };
      case 'TEST_EVIDENCE':
        return {
          label: 'TEST EVIDENCE (SANDBOX)',
          color: '#C084FC',
          bg: 'rgba(192, 132, 252, 0.15)',
          border: 'rgba(192, 132, 252, 0.35)',
        };
      case 'PERMISSION_REQUIRED':
        return {
          label: 'PERMISSION REQUIRED',
          color: '#F59E0B',
          bg: 'rgba(245, 158, 11, 0.15)',
          border: 'rgba(245, 158, 11, 0.35)',
        };
      case 'UNAVAILABLE':
      default:
        return {
          label: 'UNAVAILABLE (BROWSER)',
          color: '#94A3B8',
          bg: 'rgba(148, 163, 184, 0.12)',
          border: 'rgba(148, 163, 184, 0.25)',
        };
    }
  };

  const getSourceBadge = (sourceType?: TelemetrySourceType, isTest?: boolean) => {
    if (isTest || sourceType === 'TEST') {
      return {
        label: 'SOURCE: TEST DATA',
        color: '#D8B4FE',
        bg: 'rgba(168, 85, 247, 0.15)',
        border: 'rgba(168, 85, 247, 0.3)',
      };
    }
    if (sourceType === 'OPENCELLID_BACKUP') {
      return {
        label: 'SOURCE: OpenCellID BACKUP',
        color: '#00F0FF',
        bg: 'rgba(0, 240, 255, 0.15)',
        border: 'rgba(0, 240, 255, 0.3)',
      };
    }
    return {
      label: 'SOURCE: NATIVE ANDROID',
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.3)',
    };
  };

  const currentBadge = getCapabilityBadge(snapshot.capabilityState);
  const rogueAssessment = snapshot.rogueCellAssessment;
  const servingCell = snapshot.signals.find((s) => s.classification === 'SERVING_CELL');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[10px] font-bold font-mono tracking-widest uppercase px-2 py-0.5 rounded"
              style={{
                backgroundColor: `${skin.primaryColor}22`,
                color: skin.primaryColor,
                border: `1px solid ${skin.primaryColor}44`,
              }}
            >
              TELEPHONY & RF RADAR SWEEP
            </span>
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold"
              style={{
                backgroundColor: currentBadge.bg,
                color: currentBadge.color,
                border: `1px solid ${currentBadge.border}`,
              }}
            >
              CAPABILITY: {currentBadge.label}
            </span>
          </div>
          <h2 className="text-xl font-black mt-1" style={{ color: skin.textPrimaryColor }}>
            Tactical RF & Cell Station Sweep
          </h2>
          <p className="text-xs mt-0.5" style={{ color: skin.textSecondaryColor }}>
            {snapshot.isTestMode
              ? 'Displaying isolated test evidence dataset. Synthetic observations are never presented as live telemetry.'
              : 'Truthful RF telemetry interface for cellular base stations and BLE beacons. Browser environment requires native Android host for live hardware scans.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* OpenCellID Query Tool Button */}
          <button
            onClick={() => setIsOpenCellIdModalOpen(true)}
            className="px-3 py-1.5 rounded-xl border text-xs font-mono font-bold cursor-pointer hover:bg-cyan-950/30 transition-colors flex items-center gap-1.5"
            style={{ borderColor: 'rgba(0, 240, 255, 0.4)', color: '#00F0FF' }}
            title="Search OpenCellID public tower database"
          >
            <Database className="w-3.5 h-3.5" />
            <span>OpenCellID Lookup</span>
          </button>

          {snapshot.signals.length > 0 ? (
            <button
              onClick={handleClearEvidence}
              className="px-3 py-1.5 rounded-xl border text-xs font-mono font-bold cursor-pointer hover:bg-white/5 transition-colors flex items-center gap-1.5"
              style={{ borderColor: skin.borderColor, color: skin.textMutedColor }}
              title="Clear observed contacts"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Sweep</span>
            </button>
          ) : (
            <button
              onClick={handleLoadTestEvidence}
              className="px-3 py-1.5 rounded-xl border text-xs font-mono font-bold cursor-pointer hover:bg-purple-950/30 transition-colors flex items-center gap-1.5"
              style={{ borderColor: '#A855F7', color: '#D8B4FE' }}
              title="Load isolated sandbox test evidence"
            >
              <Beaker className="w-3.5 h-3.5" />
              <span>Load Test Evidence</span>
            </button>
          )}
        </div>
      </div>

      {/* Test Evidence Isolation Banner */}
      {snapshot.isTestMode && (
        <div className="p-4 rounded-2xl border bg-purple-950/40 border-purple-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-purple-900/50 border border-purple-400/40 text-purple-300 shrink-0 mt-0.5">
              <Beaker className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold font-mono text-purple-200 uppercase tracking-wider">
                  Isolated Test Evidence Active
                </h3>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  SANDBOX
                </span>
              </div>
              <p className="text-[11px] mt-0.5 text-purple-300/80 leading-relaxed">
                The cell stations and BLE beacons rendered on the radar originate from an isolated demonstration dataset. They do NOT represent live radio frequency measurements or active surveillance in your vicinity.
              </p>
            </div>
          </div>
          <button
            onClick={handleClearEvidence}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-purple-900/70 hover:bg-purple-800 text-purple-100 border border-purple-400/40 transition-colors cursor-pointer"
          >
            Exit Test Mode
          </button>
        </div>
      )}

      {/* Browser RF Sweep Limitation Disclosure */}
      {!snapshot.isTestMode && snapshot.capabilityState === 'UNAVAILABLE' && (
        <div className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-400 shrink-0 mt-0.5">
              <Lock className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold font-mono text-neutral-200 uppercase tracking-wider">
                  RF Hardware Sweep Unavailable in Browser
                </h3>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                  BROWSER ENVIRONMENT
                </span>
              </div>
              <p className="text-[11px] mt-0.5 text-neutral-400 leading-relaxed">
                Web browsers do not expose raw cellular baseband sweeps or continuous BLE promiscuous RF scanning without native Android privileges. Use OpenCellID Lookup or Load Test Evidence to inspect tower models.
              </p>
            </div>
          </div>
          <button
            onClick={handleLoadTestEvidence}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border border-purple-500/40 bg-purple-950/30 hover:bg-purple-900/50 text-purple-300 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Beaker className="w-3.5 h-3.5" />
            <span>Load Sandbox Test</span>
          </button>
        </div>
      )}

      {/* Serving Cell Telemetry Card if available */}
      {servingCell && (
        <div
          className="p-4 rounded-2xl border space-y-3"
          style={{
            backgroundColor: skin.cardColor,
            borderColor: skin.borderColor,
          }}
        >
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: skin.borderColor }}>
            <div className="flex items-center gap-2">
              <TowerControl className="w-4 h-4" style={{ color: skin.primaryColor }} />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: skin.textPrimaryColor }}>
                ACTIVE SERVING CELL BASE STATION
              </h3>
            </div>
            <span
              className="text-[9px] font-mono font-bold px-2 py-0.5 rounded"
              style={{
                backgroundColor: getSourceBadge(servingCell.sourceType, servingCell.isTestEvidence).bg,
                color: getSourceBadge(servingCell.sourceType, servingCell.isTestEvidence).color,
                border: `1px solid ${getSourceBadge(servingCell.sourceType, servingCell.isTestEvidence).border}`,
              }}
            >
              {getSourceBadge(servingCell.sourceType, servingCell.isTestEvidence).label}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-black/30 border border-neutral-800">
              <span className="text-[10px] text-neutral-500 block uppercase">Carrier & RAT</span>
              <span className="font-bold text-white">{servingCell.technology}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/30 border border-neutral-800">
              <span className="text-[10px] text-neutral-500 block uppercase">Cell ID (CID / TAC)</span>
              <span className="font-bold text-cyan-400">CID {servingCell.cellId || 'N/A'} • TAC {servingCell.areaCode || 'N/A'}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/30 border border-neutral-800">
              <span className="text-[10px] text-neutral-500 block uppercase">Signal Level (RSSI)</span>
              <span className="font-bold text-emerald-400">{servingCell.rssiDbm ? `${servingCell.rssiDbm} dBm` : 'N/A'}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/30 border border-neutral-800">
              <span className="text-[10px] text-neutral-500 block uppercase">Estimated Range</span>
              <span className="font-bold text-neutral-300">~{servingCell.estimatedDistanceMeters || 400} meters</span>
            </div>
          </div>
        </div>
      )}

      {/* IMSI-Catcher / Rogue-Cell Indicator Engine Card */}
      {rogueAssessment && (
        <div
          className="p-5 rounded-2xl border space-y-4 transition-all"
          style={{
            backgroundColor: skin.cardColor,
            borderColor: rogueAssessment.risk === 'CRITICAL' || rogueAssessment.risk === 'HIGH'
              ? 'rgba(255, 51, 102, 0.5)'
              : rogueAssessment.risk === 'MEDIUM'
              ? 'rgba(245, 158, 11, 0.4)'
              : skin.borderColor,
          }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: skin.borderColor }}>
            <div className="flex items-center gap-2.5">
              <div
                className="p-2 rounded-xl"
                style={{
                  backgroundColor: rogueAssessment.risk === 'HIGH' || rogueAssessment.risk === 'CRITICAL'
                    ? 'rgba(255, 51, 102, 0.15)'
                    : `${skin.primaryColor}18`,
                  border: `1px solid ${
                    rogueAssessment.risk === 'HIGH' || rogueAssessment.risk === 'CRITICAL'
                      ? 'rgba(255, 51, 102, 0.35)'
                      : `${skin.primaryColor}40`
                  }`,
                }}
              >
                <Shield className="w-4 h-4" style={{ color: rogueAssessment.risk === 'HIGH' ? '#FF3366' : skin.primaryColor }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: skin.textPrimaryColor }}>
                    {rogueAssessment.heading}
                  </h3>
                  <span
                    className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: rogueAssessment.risk === 'HIGH' || rogueAssessment.risk === 'CRITICAL'
                        ? 'rgba(255, 51, 102, 0.2)'
                        : rogueAssessment.risk === 'MEDIUM'
                        ? 'rgba(245, 158, 11, 0.2)'
                        : 'rgba(16, 185, 129, 0.15)',
                      color: rogueAssessment.risk === 'HIGH' || rogueAssessment.risk === 'CRITICAL'
                        ? '#FF3366'
                        : rogueAssessment.risk === 'MEDIUM'
                        ? '#F59E0B'
                        : '#10B981',
                      border: `1px solid ${
                        rogueAssessment.risk === 'HIGH' || rogueAssessment.risk === 'CRITICAL'
                          ? '#FF336640'
                          : rogueAssessment.risk === 'MEDIUM'
                          ? '#F59E0B40'
                          : '#10B98140'
                      }`,
                    }}
                  >
                    Risk: {rogueAssessment.risk} • Confidence: {rogueAssessment.confidence}
                  </span>
                </div>
                <p className="text-[11px]" style={{ color: skin.textSecondaryColor }}>
                  Explainable multi-factor indicator assessment based on available RF observations.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowRogueDetails(!showRogueDetails)}
              className="p-1 text-neutral-400 hover:text-white cursor-pointer"
            >
              {showRogueDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          <p className="text-xs font-mono leading-relaxed" style={{ color: skin.textSecondaryColor }}>
            {rogueAssessment.summary}
          </p>

          {showRogueDetails && (
            <div className="space-y-3">
              {rogueAssessment.reasons.length > 0 && (
                <div className="p-3 rounded-xl bg-black/30 border border-neutral-800 space-y-1.5 text-xs font-mono">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">
                    Observed Indicator Reasons:
                  </span>
                  <ul className="space-y-1">
                    {rogueAssessment.reasons.map((r, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-neutral-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {rogueAssessment.indicators.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
                    Detailed Indicator Evidence ({rogueAssessment.indicators.length})
                  </span>
                  {rogueAssessment.indicators.map((ind) => (
                    <div
                      key={ind.id}
                      className="p-3 rounded-xl bg-black/40 border border-neutral-800 text-xs font-mono space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{ind.indicator}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            ind.severity === 'HIGH'
                              ? 'bg-rose-500/20 text-rose-400'
                              : ind.severity === 'MEDIUM'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-cyan-500/20 text-cyan-300'
                          }`}
                        >
                          Severity: {ind.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-relaxed">{ind.evidence}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-[10px] font-mono text-neutral-500 pt-1 border-t border-neutral-800">
                <span className="font-bold text-neutral-400">Indicator Notice:</span> Sentinel Shield does NOT issue definitive 'IMSI Catcher Detected' declarations without cryptographic or hardware baseband proof.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interactive Radar Canvas & Tactical Map */}
      <TacticalRadarMap
        location={location}
        signals={snapshot.signals}
        skin={skin}
        capabilityState={snapshot.capabilityState}
        isTestMode={snapshot.isTestMode}
        onSampleLoad={handleLoadTestEvidence}
        onClearSweep={handleClearEvidence}
      />

      {/* Raw Baseband Telemetry Section */}
      <BasebandTelemetrySection
        baseband={snapshot.baseband}
        isTestMode={snapshot.isTestMode}
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
          <span className="text-[10px] truncate" style={{ color: skin.primaryColor }}>
            {snapshot.cellularCount > 0 ? (snapshot.isTestMode ? 'Synthetic Base Station' : 'Observed Cell Records') : 'Zero Cell Records'}
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
          <span className="text-[10px] truncate" style={{ color: skin.accentSecondary }}>
            {snapshot.bleCount > 0 ? `${snapshot.bleCount} In Proximity` : 'Zero BLE Records'}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl border flex flex-col justify-between" style={{ backgroundColor: skin.cardColor, borderColor: skin.borderColor }}>
          <div className="flex items-center justify-between text-xs" style={{ color: skin.textMutedColor }}>
            <span>Telemetry Access</span>
            <Radio className="w-3.5 h-3.5" style={{ color: '#00F0FF' }} />
          </div>
          <div className="text-sm font-black font-mono mt-2 truncate" style={{ color: currentBadge.color }}>
            {currentBadge.label.split(' ')[0]}
          </div>
          <span className="text-[10px] truncate" style={{ color: '#00F0FF' }}>
            {snapshot.isTestMode ? 'Synthetic Sandbox' : 'Browser Environment'}
          </span>
        </div>

        <div
          className="p-3.5 rounded-2xl border flex flex-col justify-between cursor-pointer hover:border-opacity-80 transition-all"
          style={{
            backgroundColor: skin.cardColor,
            borderColor: snapshot.anomalyScore > 40 ? '#FF3366' : skin.borderColor,
          }}
          onClick={() => setShowFactorDetails(!showFactorDetails)}
          title="Click to view transparent anomaly factor breakdown"
        >
          <div className="flex items-center justify-between text-xs" style={{ color: skin.textMutedColor }}>
            <span>Anomaly Score</span>
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: snapshot.anomalyScore > 40 ? '#FF3366' : skin.primaryColor }} />
          </div>
          <div className="text-2xl font-black font-mono mt-2" style={{ color: snapshot.anomalyScore > 40 ? '#FF3366' : skin.primaryColor }}>
            {snapshot.anomalyScore}/100
          </div>
          <div className="flex items-center justify-between text-[10px]" style={{ color: snapshot.anomalyScore > 40 ? '#FF3366' : skin.primaryColor }}>
            <span>{snapshot.anomalyAssessment ? snapshot.anomalyAssessment.riskLevel : 'LOW'} RISK</span>
            <span className="text-[9px] underline">Factors {showFactorDetails ? '▲' : '▼'}</span>
          </div>
        </div>
      </div>

      {/* Transparent Anomaly Factor Breakdown Panel */}
      {showFactorDetails && snapshot.anomalyAssessment && (
        <div
          className="p-4 rounded-2xl border space-y-3 transition-all"
          style={{ backgroundColor: skin.cardColor, borderColor: `${skin.borderColor}88` }}
        >
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: skin.borderColor }}>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" style={{ color: skin.primaryColor }} />
              <h3 className="text-xs font-bold font-mono uppercase" style={{ color: skin.textPrimaryColor }}>
                Transparent Anomaly Risk Assessment Breakdown
              </h3>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="text-neutral-400">Confidence:</span>
              <span className="font-bold text-cyan-400">{snapshot.anomalyAssessment.confidence}</span>
            </div>
          </div>

          <p className="text-xs" style={{ color: skin.textSecondaryColor }}>
            {snapshot.anomalyAssessment.summary}
          </p>

          {snapshot.anomalyAssessment.factors.length > 0 ? (
            <div className="space-y-2.5">
              {snapshot.anomalyAssessment.factors.map((factor, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl border bg-black/30 text-xs space-y-1 font-mono"
                  style={{ borderColor: `${skin.borderColor}44` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-200">{factor.name}</span>
                    <span className="font-bold text-amber-400">
                      +{factor.contribution} pts (Weight: {factor.weight}%)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-[11px] text-neutral-400">
                    <div>
                      <span className="text-neutral-500">Observed:</span> {factor.observedValue}
                    </div>
                    <div>
                      <span className="text-neutral-500">Baseline:</span> {factor.expectedBaseline}
                    </div>
                  </div>
                  <div className="text-[10px] text-neutral-500 italic">{factor.explanation}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 italic">No active factors contributing to risk score.</p>
          )}
        </div>
      )}

      {/* Signal Filters & Stats */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
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
          Showing {filteredSignals.length} {snapshot.isTestMode ? 'test evidence' : 'evidence'} contacts
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
          <p className="text-xs max-w-md leading-relaxed" style={{ color: skin.textSecondaryColor }}>
            Under Sentinel Shield's strict zero-fabrication standard, contacts are only displayed when verified from hardware sensors, OpenCellID registry lookups, or imported test records.
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
            <button
              onClick={() => setIsOpenCellIdModalOpen(true)}
              className="px-4 py-2 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer hover:bg-cyan-950/30 flex items-center gap-1.5"
              style={{ borderColor: 'rgba(0, 240, 255, 0.4)', color: '#00F0FF' }}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Query OpenCellID Database</span>
            </button>
            <button
              onClick={handleLoadTestEvidence}
              className="px-4 py-2 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer hover:bg-purple-950/30 flex items-center gap-1.5"
              style={{ borderColor: '#A855F7', color: '#D8B4FE' }}
            >
              <Beaker className="w-3.5 h-3.5" />
              <span>Load Sandbox Test Evidence</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredSignals.map((item) => {
            const isFlagged = item.risk === 'HIGH' || item.risk === 'MEDIUM' || item.anomalyScore > 50;
            const srcBadge = getSourceBadge(item.sourceType, item.isTestEvidence);

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
                      <span
                        className="text-[9px] font-mono px-1.5 py-0.2 rounded font-bold"
                        style={{
                          backgroundColor: srcBadge.bg,
                          color: srcBadge.color,
                          border: `1px solid ${srcBadge.border}`,
                        }}
                      >
                        {srcBadge.label}
                      </span>
                      {isFlagged && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 font-mono">
                          ANOMALY
                        </span>
                      )}
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded border bg-black/30" style={{ borderColor: skin.borderColor, color: skin.textMutedColor }}>
                        {item.locationConfidence || 'ESTIMATED_ZONE'}
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
                    {item.estimatedDistanceMeters ? `~${item.estimatedDistanceMeters}m` : 'Local'} • {item.persistenceSeconds}s
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* OpenCellID Query Modal */}
      <OpenCellIdLookupModal
        isOpen={isOpenCellIdModalOpen}
        onClose={() => setIsOpenCellIdModalOpen(false)}
        onAddSignalToRadar={handleAddSignalFromLookup}
        skin={skin}
      />
    </div>
  );
};
