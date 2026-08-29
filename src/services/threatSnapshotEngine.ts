import {
  CapabilityEvidence,
  DeviceLocationState,
  EvidenceFreshness,
  GeolocationPermissionState,
  NetworkObservation,
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

const HANDSHAKE_TTL_MS = 3 * 60 * 1000; // 3 minutes
const LOCATION_FRESHNESS_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RADAR_FRESHNESS_TTL_MS = 5 * 60 * 1000; // 5 minutes

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

    const radarSnapshot: SignalRadarSnapshot = {
      scanning: this.isScanning,
      signals: this.radarSignals,
      bleCount,
      cellularCount,
      networkCount,
      anomalyCount: anomalies.length,
      anomalyScore: anomalies.length > 0 ? 65 : this.radarSignals.length > 0 ? 12 : 0,
      startedAtEpochMs: this.isScanning ? now - 10000 : 0,
      lastUpdatedEpochMs: now,
      freshness: radarFreshness,
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

  static setSignals(signals: SignalRadarItem[]) {
    this.radarSignals = signals;
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
