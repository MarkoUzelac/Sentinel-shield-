import {
  AnomalyAssessment,
  AnomalyFactor,
  BasebandTelemetryState,
  CapabilityEvidence,
  CapabilityState,
  DeviceLocationState,
  EvidenceFreshness,
  GeolocationPermissionState,
  HardwareTelemetryState,
  NetworkObservation,
  RadarState,
  RogueCellAssessment,
  SignalRadarItem,
  SignalRadarSnapshot,
  ThreatItem,
  ThreatSnapshot,
  VpnEvidenceState,
  VpnServer,
} from '../types';
import { IEvidenceClock, SystemEvidenceClock } from './clock';
import { CapabilityEvidenceEngine } from './evidenceEngine';
import { VPN_SERVERS } from '../data/jurisdictions';
import { AuditLogger } from './auditLogger';
import { AndroidBridgeService } from './androidBridge';
import { RogueCellIndicatorEngine } from './rogueCellIndicatorEngine';

const HANDSHAKE_TTL_MS = 3 * 60 * 1000; // 3 minutes
const LOCATION_FRESHNESS_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RADAR_FRESHNESS_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function computeAnomalyAssessment(
  signals: SignalRadarItem[],
  isTestMode: boolean
): AnomalyAssessment {
  if (!signals || signals.length === 0) {
    return {
      score: 0,
      confidence: 'LOW',
      riskLevel: 'LOW',
      factors: [],
      summary: 'No active RF contacts present. Anomaly risk assessment is idle.',
    };
  }

  const factors: AnomalyFactor[] = [];

  // Factor 1: Cellular Serving Cell & TAC Consistency
  const cellularSignals = signals.filter((s) => s.kind === 'CELLULAR');
  if (cellularSignals.length > 0) {
    const hasRogue = cellularSignals.some((s) => s.risk === 'HIGH' || s.risk === 'CRITICAL');
    const contribution = hasRogue ? 35 : 4;
    factors.push({
      name: 'Cellular Base Station Consistency',
      weight: 35,
      contribution,
      observedValue: hasRogue
        ? 'Unrecognized TAC/CID delta without public database match'
        : 'Standard serving cell parameters (CID & TAC within expected operator allocation)',
      expectedBaseline: 'Consistent PLMN / LAC / TAC without forced downgrade',
      explanation: hasRogue
        ? 'Cell tower broadcast parameters deviate from expected operator baseline.'
        : 'Serving cell LAC/TAC match standard regional configuration without forced 2G downgrade.',
    });
  }

  // Factor 2: BLE Proximity & Persistence
  const bleSignals = signals.filter((s) => s.kind === 'BLE');
  if (bleSignals.length > 0) {
    const highPersistenceBle = bleSignals.filter(
      (s) => (s.persistenceSeconds && s.persistenceSeconds > 600) || s.observationCount > 20
    );
    const contribution = highPersistenceBle.length > 0 ? (isTestMode ? 32 : 28) : 6;
    factors.push({
      name: 'Bluetooth Proximity Persistence',
      weight: 35,
      contribution,
      observedValue:
        highPersistenceBle.length > 0
          ? `${highPersistenceBle.length} beacon address(es) observed persistently over multiple scan cycles`
          : 'Transient low-persistence peripheral advertising frames',
      expectedBaseline: 'Transient peripheral frames with intermittent visibility',
      explanation:
        highPersistenceBle.length > 0
          ? 'Unregistered beacon addresses observed persistently over extended time window.'
          : 'Observed BLE frames exhibit normal transient advertising characteristics.',
    });
  }

  // Factor 3: Signal Volatility / RSSI Deviation
  const suspiciousRssi = signals.some(
    (s) => (s.rssiTrendDbm && Math.abs(s.rssiTrendDbm) > 10) || s.anomalyScore > 60
  );
  const rssiContribution = suspiciousRssi ? 18 : 3;
  factors.push({
    name: 'RF Propagation & Power Variance',
    weight: 30,
    contribution: rssiContribution,
    observedValue: suspiciousRssi
      ? 'Elevated RSSI / abnormal signal variance relative to distance baseline'
      : 'Nominal attenuation within expected propagation margin',
    expectedBaseline: 'Standard path loss model without power anomalies',
    explanation: suspiciousRssi
      ? 'Signal strength indicates abnormal close proximity or transmitter power fluctuations.'
      : 'Radio frequency power levels fall within standard expected propagation limits.',
  });

  const totalScore = Math.min(100, Math.max(0, factors.reduce((sum, f) => sum + f.contribution, 0)));
  const riskLevel =
    totalScore >= 70 ? 'CRITICAL' : totalScore >= 45 ? 'HIGH' : totalScore >= 20 ? 'MEDIUM' : 'LOW';
  const confidence = isTestMode ? 'ESTIMATED' : signals.length >= 3 ? 'HIGH' : 'MEDIUM';

  const summary = isTestMode
    ? `Test evidence assessment: Aggregate score ${totalScore}/100 computed from ${factors.length} isolated test factors.`
    : `Live telemetry assessment: Aggregate score ${totalScore}/100 computed across ${factors.length} verified observation factors.`;

  return {
    score: totalScore,
    confidence,
    riskLevel,
    factors,
    summary,
  };
}

export function computeCapabilityState(
  isTestMode: boolean,
  signals: SignalRadarItem[],
  locationPermState: GeolocationPermissionState
): { state: CapabilityState; message: string } {
  if (isTestMode) {
    return {
      state: 'TEST_EVIDENCE',
      message: 'Isolated test evidence dataset loaded for sandbox verification. Not live hardware telemetry.',
    };
  }

  if (locationPermState === 'DENIED' || locationPermState === 'PERMANENTLY_DENIED') {
    return {
      state: 'PERMISSION_REQUIRED',
      message: 'Location & sensor permission required for spatial proximity analysis.',
    };
  }

  // In browser/PWA environment, cellular baseband scanning hardware is not accessible
  return {
    state: 'UNAVAILABLE',
    message: 'RF hardware sweep unavailable in browser — native Android capability required',
  };
}

export class ThreatSnapshotEngine {
  private static clock: IEvidenceClock = new SystemEvidenceClock();
  private static subscribers: ((snapshot: ThreatSnapshot) => void)[] = [];
  private static listenersInitialized = false;

  private static location: DeviceLocationState = {
    hasFix: false,
    latitude: null,
    longitude: null,
    accuracyMeters: null,
    coordinateLabel: 'LOCATION_UNAVAILABLE',
    isLiveGps: false,
    confidence: 'UNAVAILABLE',
    freshness: 'UNAVAILABLE',
    permissionState: 'PROMPT',
    timestamp: Date.now(),
  };

  private static radarSignals: SignalRadarItem[] = [];
  private static isScanning = false;
  private static isTestMode = false;

  private static vpnState: VpnEvidenceState = {
    tunnelState: 'Disconnected',
    selectedServer: VPN_SERVERS[0],
    rxBytes: 0,
    txBytes: 0,
    connectedSince: null,
    lastHandshakeEpochMs: null,
    handshakeVerified: false,
    freshness: 'UNAVAILABLE',
    endpoint: VPN_SERVERS[0].endpoint || 'ch1.sentinel-shield.net:51820',
  };

  private static networkObservation: NetworkObservation = {
    available: typeof navigator !== 'undefined' ? navigator.onLine : true,
    transports: ['WIFI', 'CELLULAR'],
    validated: true,
    vpnTransport: false,
    dnsServers: ['1.1.1.1', '8.8.8.8'],
    dnsReachable: true,
    dnsSecure: false,
    interfaceName: 'wlan0',
    blocked: false,
    httpsProbeLatencyMs: null,
    httpsProbeTls: 'TLS 1.3',
    httpsProbeStatusCode: 200,
    freshness: 'VERIFIED',
    timestamp: Date.now(),
  };

  private static threats: ThreatItem[] = [];
  private static lastAuditEpochMs: number | null = null;

  static initLifecycleListeners() {
    if (this.listenersInitialized || typeof window === 'undefined') return;
    this.listenersInitialized = true;

    // Automated network state refresh on connectivity changes
    window.addEventListener('online', () => {
      this.setNetworkObservation({ available: true, validated: true });
      this.executeFullAudit();
    });

    window.addEventListener('offline', () => {
      this.setNetworkObservation({ available: false, validated: false });
      this.executeFullAudit();
    });

    // Network connection change listener
    const nav = navigator as any;
    if (nav.connection && typeof nav.connection.addEventListener === 'function') {
      nav.connection.addEventListener('change', () => {
        const conn = nav.connection;
        const transports: string[] = [];
        if (conn.type) transports.push(String(conn.type).toUpperCase());
        if (conn.effectiveType) transports.push(String(conn.effectiveType).toUpperCase());
        if (transports.length === 0) transports.push('WIFI', 'CELLULAR');

        this.setNetworkObservation({
          transports,
          available: navigator.onLine,
        });
        this.executeFullAudit();
      });
    }

    // Permission status listener
    if (navigator.permissions && typeof navigator.permissions.query === 'function') {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((permStatus) => {
          this.updatePermissionStateFromStatus(permStatus.state);
          permStatus.onchange = () => {
            this.updatePermissionStateFromStatus(permStatus.state);
            if (permStatus.state === 'granted') {
              this.requestGeolocationPermission();
            } else {
              this.executeFullAudit();
            }
          };
        })
        .catch(() => {});
    }
  }

  private static updatePermissionStateFromStatus(state: PermissionState) {
    let pState: GeolocationPermissionState = 'PROMPT';
    if (state === 'granted') pState = 'GRANTED';
    else if (state === 'denied') pState = 'DENIED';
    else pState = 'PROMPT';

    this.location = {
      ...this.location,
      permissionState: pState,
      timestamp: this.clock.now(),
    };
    this.notify();
  }

  static setClock(clock: IEvidenceClock) {
    this.clock = clock;
    CapabilityEvidenceEngine.setClock(clock);
    this.notify();
  }

  static getClock(): IEvidenceClock {
    return this.clock;
  }

  static subscribe(callback: (snapshot: ThreatSnapshot) => void): () => void {
    this.initLifecycleListeners();
    this.subscribers.push(callback);
    callback(this.getSnapshot());
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
    };
  }

  static getSnapshot(): ThreatSnapshot {
    const now = this.clock.now();

    // 1. Evaluate VPN Freshness & Handshake Verification
    let vpnFreshness: EvidenceFreshness = 'UNAVAILABLE';
    let handshakeVerified = false;

    if (this.vpnState.tunnelState === 'Connected') {
      if (this.vpnState.lastHandshakeEpochMs && now - this.vpnState.lastHandshakeEpochMs <= HANDSHAKE_TTL_MS) {
        vpnFreshness = 'VERIFIED';
        handshakeVerified = true;
      } else if (this.vpnState.lastHandshakeEpochMs) {
        vpnFreshness = 'STALE';
        handshakeVerified = false;
      } else {
        vpnFreshness = 'ACTIVE_UNVERIFIED';
        handshakeVerified = false;
      }
    } else if (this.vpnState.tunnelState === 'Starting' || this.vpnState.tunnelState === 'Verifying') {
      vpnFreshness = 'ACTIVE_UNVERIFIED';
    } else {
      vpnFreshness = 'UNAVAILABLE';
    }

    const currentVpn: VpnEvidenceState = {
      ...this.vpnState,
      handshakeVerified,
      freshness: vpnFreshness,
    };

    // 2. Evaluate Location Freshness
    let locFreshness: EvidenceFreshness = this.location.freshness;
    if (this.location.hasFix) {
      locFreshness = now - this.location.timestamp > LOCATION_FRESHNESS_TTL_MS ? 'STALE' : 'VERIFIED';
    }
    const currentLoc: DeviceLocationState = {
      ...this.location,
      freshness: locFreshness,
    };

    // 3. Evaluate Radar Snapshot (Strictly evidence-backed)
    const bleCount = this.radarSignals.filter((s) => s.kind === 'BLE').length;
    const cellularCount = this.radarSignals.filter((s) => s.kind === 'CELLULAR').length;
    const networkCount = this.radarSignals.filter((s) => s.kind === 'WIFI_NETWORK' || s.kind === 'VPN_NETWORK').length;
    const anomalies = this.radarSignals.filter((s) => s.risk === 'HIGH' || s.risk === 'MEDIUM' || s.anomalyScore > 50);

    let radarFreshness: EvidenceFreshness = 'UNAVAILABLE';
    if (this.radarSignals.length > 0) {
      const latestObserved = Math.max(...this.radarSignals.map((s) => s.observedAtEpochMs || 0));
      radarFreshness = now - latestObserved > RADAR_FRESHNESS_TTL_MS ? 'STALE' : 'VERIFIED';
    }

    const anomalyAssessment = computeAnomalyAssessment(this.radarSignals, this.isTestMode);
    const { state: capabilityState, message: capabilityStateMessage } = computeCapabilityState(
      this.isTestMode,
      this.radarSignals,
      this.location.permissionState
    );

    const isNativeBridge = AndroidBridgeService.isNativeBridgeAvailable();
    const baseband: BasebandTelemetryState = AndroidBridgeService.getBasebandState(this.isTestMode);
    const rogueCellAssessment: RogueCellAssessment = RogueCellIndicatorEngine.evaluate(
      this.radarSignals,
      baseband,
      this.isTestMode
    );

    let radarState: RadarState = 'UNAVAILABLE';
    if (this.isTestMode) {
      radarState = 'TEST_DATA';
    } else if (this.location.permissionState === 'DENIED' || this.location.permissionState === 'PERMANENTLY_DENIED') {
      radarState = 'PERMISSION_REQUIRED';
    } else if (this.isScanning) {
      radarState = 'SCANNING';
    } else if (this.radarSignals.length > 0) {
      radarState = isNativeBridge ? 'LIVE_DATA' : 'PARTIAL_DATA';
    } else if (isNativeBridge) {
      radarState = 'NO_DATA';
    } else {
      radarState = 'UNAVAILABLE';
    }

    const hardwareTelemetry: HardwareTelemetryState = {
      cellular: {
        status: this.isTestMode ? 'TEST' : isNativeBridge ? 'LIVE' : 'UNAVAILABLE',
        label: 'Cellular Baseband Telemetry',
        source: this.isTestMode
          ? 'Isolated Test Sandbox'
          : isNativeBridge
          ? 'Android TelephonyManager (L1/RRC)'
          : 'Unavailable in Web Browser',
        details: this.isTestMode
          ? 'Synthetic carrier tower baseline records loaded.'
          : isNativeBridge
          ? 'Direct modem carrier data stream active.'
          : 'Direct baseband modem sweeping is restricted in web sandboxes.',
        limitations: 'Web browsers cannot execute raw AT-commands or inspect L1 PHY modem frames without native Android privileges.',
        isLive: isNativeBridge,
      },
      ble: {
        status: this.isTestMode ? 'TEST' : typeof navigator !== 'undefined' && (navigator as any).bluetooth ? 'INFERRED' : 'UNAVAILABLE',
        label: 'Bluetooth Low Energy (BLE)',
        source: this.isTestMode ? 'Synthetic BLE Test Suite' : 'Web Bluetooth API (Pairing Mode Only)',
        details: this.isTestMode
          ? 'Synthetic BLE beacon profiles loaded.'
          : 'Web Bluetooth requires manual pairing; background promiscuous sweeps are restricted.',
        limitations: 'Web Bluetooth requires explicit user pairing per device; background raw RF sweeping is prohibited by browser security sandbox.',
        isLive: false,
      },
      location: {
        status: this.location.hasFix ? 'LIVE' : this.location.permissionState === 'DENIED' ? 'PERMISSION_REQUIRED' : this.isTestMode ? 'TEST' : 'PERMISSION_REQUIRED',
        label: 'Spatial Coordinates (GPS/GNSS)',
        source: this.location.hasFix ? 'Browser Geolocation API (Fused GNSS/Wi-Fi)' : 'Geolocation Sensor Access',
        details: this.location.hasFix
          ? (this.location.accuracyMeters ? `Accurate to ~${Math.round(this.location.accuracyMeters)}m.` : 'Live position fix acquired.')
          : 'Geolocation permission needed for local spatial proximity calculations.',
        limitations: 'Requires user permission prompt; accuracy depends on hardware GNSS receiver and OS fused location provider.',
        isLive: this.location.hasFix,
      },
      nativeRf: {
        status: this.isTestMode ? 'TEST' : isNativeBridge ? 'LIVE' : 'UNAVAILABLE',
        label: 'Native RF / Baseband Bridge',
        source: isNativeBridge ? 'Android TelephonyManager Bridge' : 'None (Browser Sandboxed)',
        details: isNativeBridge
          ? 'Connected to privileged Android host runtime.'
          : 'No privileged Android bridge detected in current execution window.',
        limitations: 'Privileged baseband access requires Sentinel Shield Pro native Android APK.',
        isLive: isNativeBridge,
      },
    };

    const radarSnapshot: SignalRadarSnapshot = {
      scanning: this.isScanning,
      radarState,
      capabilityState,
      capabilityStateMessage,
      signals: this.radarSignals,
      baseband,
      rogueCellAssessment,
      hardwareTelemetry,
      bleCount,
      cellularCount,
      networkCount,
      anomalyCount: anomalies.length,
      anomalyAssessment,
      anomalyScore: anomalyAssessment.score,
      startedAtEpochMs: this.isScanning ? now - 10000 : 0,
      lastUpdatedEpochMs: now,
      freshness: radarFreshness,
      isTestMode: this.isTestMode,
      error: null,
    };

    // 4. Evaluate Capability Evidences with strict TTL checking
    const rawEvidences: CapabilityEvidence[] = CapabilityEvidenceEngine.getEvidences({
      vpnConnected: currentVpn.tunnelState === 'Connected',
      handshakeEpochMs: currentVpn.lastHandshakeEpochMs,
      cellRecordCount: cellularCount,
      telephonyAvailable: true,
      permissionGranted: this.location.permissionState === 'GRANTED',
      permissionState: this.location.permissionState,
      network: this.networkObservation,
    });

    // Process TTL freshness: Stale evidences transition status to UNVERIFIED
    const evidences: CapabilityEvidence[] = rawEvidences.map((ev) => {
      const isStale = now >= ev.expiresAtEpochMs;
      if (isStale) {
        return {
          ...ev,
          isStale: true,
          status: ev.status === 'VERIFIED' ? 'UNVERIFIED' : ev.status,
          freshness: 'STALE',
          details: `${ev.details} (Evidence has expired beyond TTL ${Math.round(ev.ttlMs / 1000)}s - fresh audit required).`,
        };
      }
      return {
        ...ev,
        isStale: false,
      };
    });

    const activeThreatCount = this.threats.filter((t) => !t.isResolved).length;
    const overallScore = CapabilityEvidenceEngine.calculateOverallScore(evidences, activeThreatCount);

    // 5. Global Freshness
    const hasUnverified = evidences.some((e) => e.status === 'UNVERIFIED' || e.isStale);
    const globalFreshness: EvidenceFreshness =
      currentVpn.freshness === 'VERIFIED' && this.location.freshness === 'VERIFIED' && !hasUnverified
        ? 'VERIFIED'
        : hasUnverified
        ? 'ACTIVE_UNVERIFIED'
        : 'UNAVAILABLE';

    return {
      timestamp: now,
      freshness: globalFreshness,
      overallScore,
      location: currentLoc,
      radar: radarSnapshot,
      vpn: currentVpn,
      network: this.networkObservation,
      evidences,
      threats: this.threats,
      activeThreatCount,
      auditCompletedAt: this.lastAuditEpochMs,
    };
  }

  // --- Location & Permissions Management ---
  static setLocation(loc: Partial<DeviceLocationState>) {
    this.location = {
      ...this.location,
      ...loc,
      timestamp: this.clock.now(),
    };
    this.notify();
  }

  static async requestGeolocationPermission(): Promise<DeviceLocationState> {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      this.location = {
        hasFix: false,
        latitude: null,
        longitude: null,
        accuracyMeters: null,
        coordinateLabel: 'UNSUPPORTED',
        isLiveGps: false,
        confidence: 'UNAVAILABLE',
        freshness: 'UNAVAILABLE',
        permissionState: 'UNSUPPORTED',
        timestamp: this.clock.now(),
      };
      this.notify();
      return this.location;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(5));
          const lng = parseFloat(pos.coords.longitude.toFixed(5));
          const acc = Math.round(pos.coords.accuracy);
          this.location = {
            hasFix: true,
            latitude: lat,
            longitude: lng,
            accuracyMeters: acc,
            coordinateLabel: `${lat > 0 ? lat + '°N' : Math.abs(lat) + '°S'}, ${lng > 0 ? lng + '°E' : Math.abs(lng) + '°W'} (±${acc}m)`,
            isLiveGps: true,
            confidence: 'KNOWN_LOCATION',
            freshness: 'VERIFIED',
            permissionState: 'GRANTED',
            timestamp: this.clock.now(),
          };

          // Automatic refresh of Telephony & RF audit on permission grant
          this.executeFullAudit();
          this.notify();
          resolve(this.location);
        },
        (err) => {
          const isDenied = err.code === 1; // PERMISSION_DENIED
          const pState: GeolocationPermissionState = isDenied ? 'DENIED' : 'UNSUPPORTED';

          this.location = {
            hasFix: false,
            latitude: null,
            longitude: null,
            accuracyMeters: null,
            coordinateLabel: isDenied ? 'PERMISSION_DENIED' : 'POSITION_UNAVAILABLE',
            isLiveGps: false,
            confidence: 'UNAVAILABLE',
            freshness: 'UNAVAILABLE',
            permissionState: pState,
            timestamp: this.clock.now(),
          };

          this.executeFullAudit();
          this.notify();
          resolve(this.location);
        },
        { enableHighAccuracy: true, timeout: 7000 }
      );
    });
  }

  // --- Signal Radar Ingestion ---
  static setScanning(scanning: boolean) {
    this.isScanning = scanning;
    this.notify();
  }

  static setTestMode(isTest: boolean) {
    this.isTestMode = isTest;
    this.notify();
  }

  static setSignals(signals: SignalRadarItem[], isTest: boolean = false) {
    this.radarSignals = signals;
    this.isTestMode = isTest;
    this.notify();
  }

  static addSignal(signal: SignalRadarItem) {
    const existingIndex = this.radarSignals.findIndex((s) => s.id === signal.id);
    if (existingIndex >= 0) {
      const updated = [...this.radarSignals];
      updated[existingIndex] = signal;
      this.radarSignals = updated;
    } else {
      this.radarSignals = [signal, ...this.radarSignals];
    }
    this.notify();
  }

  static clearSignals() {
    this.radarSignals = [];
    this.isTestMode = false;
    this.notify();
  }

  // --- VPN Ingestion ---
  static setVpnState(vpn: Partial<VpnEvidenceState>) {
    this.vpnState = {
      ...this.vpnState,
      ...vpn,
    };
    this.notify();
  }

  static ingestPeerHandshake(lastHandshakeEpochMs: number, rxBytes?: number, txBytes?: number) {
    this.vpnState = {
      ...this.vpnState,
      lastHandshakeEpochMs,
      rxBytes: rxBytes ?? this.vpnState.rxBytes,
      txBytes: txBytes ?? this.vpnState.txBytes,
      handshakeVerified: this.clock.now() - lastHandshakeEpochMs <= HANDSHAKE_TTL_MS,
    };
    this.notify();
  }

  // --- Network Observation Ingestion ---
  static setNetworkObservation(obs: Partial<NetworkObservation>) {
    this.networkObservation = {
      ...this.networkObservation,
      ...obs,
      timestamp: this.clock.now(),
    };
    this.notify();
  }

  // --- Threat Management ---
  static setThreats(threats: ThreatItem[]) {
    this.threats = threats;
    this.notify();
  }

  static resolveThreat(id: string) {
    this.threats = this.threats.map((t) => (t.id === id ? { ...t, isResolved: true } : t));
    this.notify();
  }

  static addThreat(threat: ThreatItem) {
    this.threats = [threat, ...this.threats];
    this.notify();
  }

  // --- Full System Audit Execution ---
  static async executeFullAudit(): Promise<ThreatSnapshot> {
    await CapabilityEvidenceEngine.refreshAllEvidences();
    this.lastAuditEpochMs = this.clock.now();
    const snap = this.getSnapshot();
    this.notify();
    return snap;
  }

  private static notify() {
    const snap = this.getSnapshot();
    this.subscribers.forEach((cb) => {
      try {
        cb(snap);
      } catch (err) {
        console.error('ThreatSnapshotEngine notify error:', err);
      }
    });
  }
}
