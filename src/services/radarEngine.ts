import { DeviceLocationState, SignalRadarItem, SignalRadarSnapshot } from '../types';
import { ThreatSnapshotEngine } from './threatSnapshotEngine';
import { CellProviderManager } from './cellProvider';

export class SignalRadarEngine {
  private static subscribers: ((snapshot: SignalRadarSnapshot) => void)[] = [];
  private static scanning = false;
  private static intervalId: number | null = null;

  static initLocation(onLocationUpdate: (loc: DeviceLocationState) => void) {
    ThreatSnapshotEngine.requestGeolocationPermission().then((loc) => {
      onLocationUpdate(loc);
    });
  }

  static startScanning(callback: (snapshot: SignalRadarSnapshot) => void): () => void {
    this.subscribers.push(callback);
    this.scanning = true;
    ThreatSnapshotEngine.setScanning(true);

    callback(this.getSnapshot());

    if (!this.intervalId) {
      this.intervalId = window.setInterval(() => {
        const snap = this.getSnapshot();
        this.subscribers.forEach((cb) => cb(snap));
      }, 4000);
    }

    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
      if (this.subscribers.length === 0 && this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.scanning = false;
        ThreatSnapshotEngine.setScanning(false);
      }
    };
  }

  static stopScanning() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.scanning = false;
    ThreatSnapshotEngine.setScanning(false);
  }

  static getSnapshot(): SignalRadarSnapshot {
    return ThreatSnapshotEngine.getSnapshot().radar;
  }

  static ingestObservations(signals: SignalRadarItem[]) {
    ThreatSnapshotEngine.setSignals(signals, false);
  }

  static addObservation(signal: SignalRadarItem) {
    ThreatSnapshotEngine.addSignal(signal);
  }

  static clearObservations() {
    ThreatSnapshotEngine.clearSignals();
  }

  /**
   * Load isolated baseline observations for explicit testing and sandbox verification.
   * Clearly marked as test evidence, never claimed as live hardware telemetry.
   */
  static loadTestEvidence(baseLat?: number | null, baseLng?: number | null) {
    const now = ThreatSnapshotEngine.getClock().now();
    const lat = baseLat ?? 45.815;
    const lng = baseLng ?? 15.9819;

    const sampleSignals: SignalRadarItem[] = [
      {
        id: 'cell-observed-01',
        kind: 'CELLULAR',
        label: 'Serving Cell (CID 49102 / TAC 1205)',
        technology: 'LTE Band 20 (800 MHz)',
        rssiDbm: -78,
        estimatedDistanceMeters: 420,
        cellId: 49102,
        areaCode: 1205,
        signalLevel: 4,
        latitude: lat + 0.0015,
        longitude: lng - 0.0018,
        bearingDegrees: 45,
        locationSource: 'Isolated Test Baseline Record',
        sourceType: 'TEST',
        locationAccuracyMeters: 50,
        locationConfidence: 'ESTIMATED_ZONE',
        locationEvidenceType: 'NETWORK_PROVIDED_COORDINATES',
        freshness: 'ACTIVE_UNVERIFIED',
        verificationStatus: 'SYNTHETIC_TEST',
        classification: 'SERVING_CELL',
        isTestEvidence: true,
        isSynthetic: true,
        isLive: false,
        mcc: 219,
        mnc: 1,
        pci: 142,
        risk: 'INFO',
        explanation: 'Synthetic serving cell test record loaded in sandbox.',
        observedAtEpochMs: now,
        runtimeBacked: false,
        firstObservedAtEpochMs: now - 3600000,
        observationCount: 120,
        minRssiDbm: -84,
        maxRssiDbm: -72,
        rssiTrendDbm: 2,
        persistenceSeconds: 3600,
        anomalyScore: 5,
        locationConsistency: 'CONSISTENT',
      },
      {
        id: 'cell-neighbor-02',
        kind: 'CELLULAR',
        label: 'Neighbor Cell (CID 49103 / TAC 1205)',
        technology: 'LTE Band 3 (1800 MHz)',
        rssiDbm: -91,
        estimatedDistanceMeters: 780,
        cellId: 49103,
        areaCode: 1205,
        signalLevel: 2,
        latitude: lat - 0.0022,
        longitude: lng + 0.0025,
        bearingDegrees: 135,
        locationSource: 'Isolated Test Baseline Record',
        sourceType: 'TEST',
        locationAccuracyMeters: 80,
        locationConfidence: 'ESTIMATED_ZONE',
        locationEvidenceType: 'NETWORK_PROVIDED_COORDINATES',
        freshness: 'ACTIVE_UNVERIFIED',
        verificationStatus: 'SYNTHETIC_TEST',
        classification: 'NEIGHBOR_CELL',
        isTestEvidence: true,
        isSynthetic: true,
        isLive: false,
        mcc: 219,
        mnc: 1,
        pci: 148,
        risk: 'INFO',
        explanation: 'Neighboring cell tower test baseline for handover check.',
        observedAtEpochMs: now - 60000,
        runtimeBacked: false,
        firstObservedAtEpochMs: now - 1800000,
        observationCount: 35,
        minRssiDbm: -95,
        maxRssiDbm: -88,
        rssiTrendDbm: -1,
        persistenceSeconds: 1800,
        anomalyScore: 8,
        locationConsistency: 'CONSISTENT',
      },
      {
        id: 'ble-observed-03',
        kind: 'BLE',
        label: 'Unregistered BLE Peripheral Beacon',
        technology: 'BLE 5.2 (Adv Ch 37)',
        rssiDbm: -82,
        estimatedDistanceMeters: 6.8,
        risk: 'MEDIUM',
        explanation: 'Unregistered Bluetooth Low Energy beacon detected in proximity across multiple test cycles.',
        verificationStatus: 'SYNTHETIC_TEST',
        classification: 'UNREGISTERED_BEACON',
        locationEvidenceType: 'ESTIMATED_ZONE',
        locationConfidence: 'ESTIMATED_ZONE',
        sourceType: 'TEST',
        isTestEvidence: true,
        isSynthetic: true,
        isLive: false,
        observedAtEpochMs: now,
        runtimeBacked: false,
        firstObservedAtEpochMs: now - 1800000,
        observationCount: 45,
        minRssiDbm: -89,
        maxRssiDbm: -76,
        rssiTrendDbm: 4,
        persistenceSeconds: 1800,
        anomalyScore: 48,
        freshness: 'ACTIVE_UNVERIFIED',
        locationConsistency: 'OBSERVED_IN_PROXIMITY',
      },
    ];

    ThreatSnapshotEngine.setSignals(sampleSignals, true);
  }
}
