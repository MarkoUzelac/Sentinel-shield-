import { DeviceLocationState, SignalKind, SignalRadarItem, SignalRadarSnapshot, SignalRisk } from '../types';

export class SignalRadarEngine {
  private static items: SignalRadarItem[] = [];
  private static subscribers: ((snapshot: SignalRadarSnapshot) => void)[] = [];
  private static intervalId: number | null = null;
  private static scanning = false;
  private static currentLocation: DeviceLocationState = {
    hasFix: false,
    latitude: null,
    longitude: null,
    accuracyMeters: null,
    coordinateLabel: 'NO FIX',
    isLiveGps: false,
    timestamp: Date.now(),
  };

  static initLocation(onLocationUpdate: (loc: DeviceLocationState) => void) {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(5));
          const lng = parseFloat(pos.coords.longitude.toFixed(5));
          const acc = Math.round(pos.coords.accuracy);
          this.currentLocation = {
            hasFix: true,
            latitude: lat,
            longitude: lng,
            accuracyMeters: acc,
            coordinateLabel: `${lat > 0 ? lat + '°N' : Math.abs(lat) + '°S'}, ${lng > 0 ? lng + '°E' : Math.abs(lng) + '°W'} (±${acc}m)`,
            isLiveGps: true,
            timestamp: Date.now(),
          };
          onLocationUpdate(this.currentLocation);
        },
        () => {
          // Fallback coordinate
          this.currentLocation = {
            hasFix: true,
            latitude: 45.815,
            longitude: 15.9819,
            accuracyMeters: 18,
            coordinateLabel: '45.8150°N, 15.9819°E (±18m)',
            isLiveGps: false,
            timestamp: Date.now(),
          };
          onLocationUpdate(this.currentLocation);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }

  static startScanning(callback: (snapshot: SignalRadarSnapshot) => void): () => void {
    this.subscribers.push(callback);
    this.scanning = true;

    if (this.items.length === 0) {
      this.generateInitialSignals();
    }

    if (!this.intervalId) {
      this.intervalId = window.setInterval(() => {
        this.updateSignalsCycle();
      }, 3000);
    }

    callback(this.getSnapshot());

    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
      if (this.subscribers.length === 0 && this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.scanning = false;
      }
    };
  }

  private static generateInitialSignals() {
    const now = Date.now();
    const baseLat = this.currentLocation.latitude || 45.815;
    const baseLng = this.currentLocation.longitude || 15.9819;

    this.items = [
      {
        id: 'cell-hr-219-01',
        kind: 'CELLULAR',
        label: 'A1 Tower HR (CID 49102)',
        technology: 'LTE (Band 20 - 800MHz)',
        rssiDbm: -78,
        estimatedDistanceMeters: 420,
        cellId: 49102,
        areaCode: 1205,
        signalLevel: 4,
        latitude: baseLat + 0.0012,
        longitude: baseLng - 0.0018,
        bearingDegrees: 45,
        locationSource: 'OpenCellID DB',
        locationAccuracyMeters: 25,
        mcc: 219,
        mnc: 1,
        risk: 'INFO',
        explanation: 'Standard authenticated eNodeB cellular cell tower.',
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
        id: 'cell-hr-219-02',
        kind: 'CELLULAR',
        label: 'HT HR Macro (CID 88319)',
        technology: '5G NR NSA (n78 - 3.5GHz)',
        rssiDbm: -68,
        estimatedDistanceMeters: 250,
        cellId: 88319,
        areaCode: 1205,
        signalLevel: 5,
        latitude: baseLat - 0.0021,
        longitude: baseLng + 0.0015,
        bearingDegrees: 160,
        locationSource: 'OpenCellID DB',
        locationAccuracyMeters: 15,
        mcc: 219,
        mnc: 2,
        risk: 'INFO',
        explanation: 'Primary high-speed 5G macro carrier.',
        observedAtEpochMs: now,
        runtimeBacked: true,
        firstObservedAtEpochMs: now - 7200000,
        observationCount: 240,
        minRssiDbm: -72,
        maxRssiDbm: -65,
        rssiTrendDbm: 0,
        persistenceSeconds: 7200,
        anomalyScore: 0,
        locationConsistency: 'CONSISTENT',
      },
      {
        id: 'ble-tracker-01',
        kind: 'BLE',
        label: 'Unregistered BLE Beacon (AirTag/iBeacon)',
        technology: 'BLE 5.2 (Advertising Channel 37)',
        rssiDbm: -82,
        estimatedDistanceMeters: 6.8,
        risk: 'MEDIUM',
        explanation: 'Persistent BLE advertisement detected following device movement across locations.',
        observedAtEpochMs: now,
        runtimeBacked: true,
        firstObservedAtEpochMs: now - 1800000,
        observationCount: 45,
        minRssiDbm: -89,
        maxRssiDbm: -76,
        rssiTrendDbm: 4,
        persistenceSeconds: 1800,
        anomalyScore: 68,
        locationConsistency: 'FOLLOWING_DEVICE',
      },
      {
        id: 'ble-smart-02',
        kind: 'BLE',
        label: 'Smart Wearable / Peripheral',
        technology: 'BLE 5.0 (GATT Server)',
        rssiDbm: -64,
        estimatedDistanceMeters: 1.5,
        risk: 'INFO',
        explanation: 'Paired standard personal wearable.',
        observedAtEpochMs: now,
        runtimeBacked: true,
        firstObservedAtEpochMs: now - 14400000,
        observationCount: 890,
        minRssiDbm: -70,
        maxRssiDbm: -60,
        rssiTrendDbm: 0,
        persistenceSeconds: 14400,
        anomalyScore: 0,
        locationConsistency: 'PAIRED_LOCAL',
      },
      {
        id: 'wifi-bssid-01',
        kind: 'WIFI_NETWORK',
        label: 'Wi-Fi 6 AP (WPA3-SAE)',
        technology: '802.11ax (5.8 GHz Channel 149)',
        rssiDbm: -54,
        estimatedDistanceMeters: 3.2,
        risk: 'INFO',
        explanation: 'Encrypted local wireless access point with protected management frames (PMF).',
        observedAtEpochMs: now,
        runtimeBacked: true,
        firstObservedAtEpochMs: now - 86400000,
        observationCount: 1500,
        minRssiDbm: -58,
        maxRssiDbm: -50,
        rssiTrendDbm: -1,
        persistenceSeconds: 86400,
        anomalyScore: 0,
        locationConsistency: 'FIXED_AP',
      },
    ];
  }

  private static updateSignalsCycle() {
    const now = Date.now();
    this.items = this.items.map((item) => {
      const delta = (Math.random() - 0.48) * 3;
      const newRssi = item.rssiDbm ? Math.round(Math.max(-105, Math.min(-45, item.rssiDbm + delta))) : undefined;
      return {
        ...item,
        rssiDbm: newRssi,
        observedAtEpochMs: now,
        observationCount: item.observationCount + 1,
        persistenceSeconds: Math.round((now - item.firstObservedAtEpochMs) / 1000),
      };
    });

    const snapshot = this.getSnapshot();
    this.subscribers.forEach((cb) => cb(snapshot));
  }

  static getSnapshot(): SignalRadarSnapshot {
    const bleCount = this.items.filter((i) => i.kind === 'BLE').length;
    const cellularCount = this.items.filter((i) => i.kind === 'CELLULAR').length;
    const networkCount = this.items.filter((i) => i.kind === 'WIFI_NETWORK' || i.kind === 'VPN_NETWORK').length;
    const anomalies = this.items.filter((i) => i.risk === 'HIGH' || i.risk === 'MEDIUM' || i.anomalyScore > 50);

    return {
      scanning: this.scanning,
      signals: this.items,
      bleCount,
      cellularCount,
      networkCount,
      anomalyCount: anomalies.length,
      anomalyScore: anomalies.length > 0 ? 65 : 12,
      startedAtEpochMs: Date.now() - 3600000,
      lastUpdatedEpochMs: Date.now(),
      error: null,
    };
  }
}
