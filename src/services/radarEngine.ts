import { DeviceLocationState, SignalRadarItem, SignalRadarSnapshot } from '../types';
import { ThreatSnapshotEngine } from './threatSnapshotEngine';

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
    ThreatSnapshotEngine.setSignals(signals);
  }

  static addObservation(signal: SignalRadarItem) {
    ThreatSnapshotEngine.addSignal(signal);
  }

  static clearObservations() {
    ThreatSnapshotEngine.clearSignals();
  }

  /**
   * Load real/demonstration baseline observations for explicit testing or sandbox verification.
   */
  static loadTestEvidence(baseLat?: number | null, baseLng?: number | null) {
    const now = ThreatSnapshotEngine.getClock().now();
    const lat = baseLat ?? 45.815;
    const lng = baseLng ?? 15.9819;

    const sampleSignals: SignalRadarItem[] = [
      {
        id: 'cell-verified-01',
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
        locationSource: 'OpenCellID DB',
        locationAccuracyMeters: 25,
        locationConfidence: 'KNOWN_LOCATION',
        freshness: 'VERIFIED',
        mcc: 219,
        mnc: 1,
        risk: 'INFO',
        explanation: 'Verified authenticated eNodeB cellular base station.',
        observedAtEpochMs: now,
        runtimeBacked: true,
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
        id: 'ble-unverified-02',
        kind: 'BLE',
        label: 'Persistent BLE Tracker Beacon',
        technology: 'BLE 5.2 (Adv Ch 37)',
        rssiDbm: -82,
        estimatedDistanceMeters: 6.8,
        risk: 'MEDIUM',
        explanation: 'Unregistered Bluetooth beacon detected in proximity across multiple location updates.',
        observedAtEpochMs: now,
        runtimeBacked: true,
        firstObservedAtEpochMs: now - 1800000,
        observationCount: 45,
        minRssiDbm: -89,
        maxRssiDbm: -76,
        rssiTrendDbm: 4,
        persistenceSeconds: 1800,
        anomalyScore: 68,
        locationConfidence: 'ESTIMATED_ZONE',
        freshness: 'ACTIVE_UNVERIFIED',
        locationConsistency: 'FOLLOWING_DEVICE',
      },
    ];

    ThreatSnapshotEngine.setSignals(sampleSignals);
  }
}
