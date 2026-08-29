import { describe, it, expect, beforeEach } from 'vitest';
import { ThreatSnapshotEngine } from '../threatSnapshotEngine';
import { SettableEvidenceClock } from '../clock';
import { SignalRadarItem } from '../../types';

describe('Tactical Radar Projection and Canonical Signal Pipeline', () => {
  let clock: SettableEvidenceClock;

  beforeEach(() => {
    clock = new SettableEvidenceClock(1700000000000);
    ThreatSnapshotEngine.setClock(clock);
    ThreatSnapshotEngine.clearSignals();
  });

  it('correctly categorizes anomaly scores and risk levels for suspicious IMSI/BLE signals', () => {
    const suspiciousCell: SignalRadarItem = {
      id: 'cell-imsi-catcher-01',
      kind: 'CELLULAR',
      label: '2G Forced Downgrade Cell',
      technology: 'GSM 900',
      rssiDbm: -45, // Unusually strong signal
      risk: 'CRITICAL',
      explanation: 'Ciphering mode A5/0 (null cipher) enforced without mutual auth',
      observedAtEpochMs: clock.now(),
      runtimeBacked: true,
      firstObservedAtEpochMs: clock.now() - 60000,
      observationCount: 12,
      persistenceSeconds: 60,
      anomalyScore: 92,
      locationConsistency: 'UNKNOWN',
      locationConfidence: 'ESTIMATED_ZONE',
      freshness: 'VERIFIED',
    };

    ThreatSnapshotEngine.addSignal(suspiciousCell);
    const snapshot = ThreatSnapshotEngine.getSnapshot();

    expect(snapshot.radar.signals.length).toBe(1);
    expect(snapshot.radar.anomalyCount).toBe(1);
    expect(snapshot.radar.signals[0].anomalyScore).toBe(92);
    expect(snapshot.radar.signals[0].risk).toBe('CRITICAL');
  });

  it('aggregates multiple signal sources (BLE, Cellular, Wi-Fi) into canonical counts', () => {
    const bleTag: SignalRadarItem = {
      id: 'ble-tag-01',
      kind: 'BLE',
      label: 'Unrecognized Tracker Beacon',
      technology: 'BLE 5.2',
      rssiDbm: -68,
      risk: 'MEDIUM',
      explanation: 'Persistent MAC beacon across geographic shifts',
      observedAtEpochMs: clock.now(),
      runtimeBacked: true,
      firstObservedAtEpochMs: clock.now() - 300000,
      observationCount: 8,
      persistenceSeconds: 300,
      anomalyScore: 45,
      locationConsistency: 'MOVING_WITH_DEVICE',
      locationConfidence: 'ESTIMATED_ZONE',
      freshness: 'VERIFIED',
    };

    const cellTower: SignalRadarItem = {
      id: 'cell-legit-02',
      kind: 'CELLULAR',
      label: 'Standard LTE Base Station',
      technology: 'LTE Band 7',
      rssiDbm: -88,
      risk: 'INFO',
      explanation: 'Carrier LTE tower with standard cryptographic parameters',
      observedAtEpochMs: clock.now(),
      runtimeBacked: true,
      firstObservedAtEpochMs: clock.now() - 10000,
      observationCount: 2,
      persistenceSeconds: 10,
      anomalyScore: 5,
      locationConsistency: 'CONSISTENT',
      locationConfidence: 'KNOWN_LOCATION',
      freshness: 'VERIFIED',
    };

    ThreatSnapshotEngine.addSignal(bleTag);
    ThreatSnapshotEngine.addSignal(cellTower);

    const snapshot = ThreatSnapshotEngine.getSnapshot();
    expect(snapshot.radar.signals.length).toBe(2);
    expect(snapshot.radar.bleCount).toBe(1);
    expect(snapshot.radar.cellularCount).toBe(1);
    expect(snapshot.radar.anomalyCount).toBe(1); // bleTag has risk: MEDIUM, so anomalyCount is 1
  });

  it('filters expired signals based on radar freshness TTL', () => {
    const transientSignal: SignalRadarItem = {
      id: 'wifi-probe-01',
      kind: 'WIFI_NETWORK',
      label: 'Transient AP Probe',
      technology: 'Wi-Fi 6',
      rssiDbm: -92,
      risk: 'INFO',
      explanation: 'Weak transient probe response',
      observedAtEpochMs: clock.now(),
      runtimeBacked: true,
      firstObservedAtEpochMs: clock.now(),
      observationCount: 1,
      persistenceSeconds: 1,
      anomalyScore: 0,
      locationConsistency: 'UNKNOWN',
      freshness: 'VERIFIED',
    };

    ThreatSnapshotEngine.addSignal(transientSignal);
    expect(ThreatSnapshotEngine.getSnapshot().radar.signals.length).toBe(1);

    // Advance past radar freshness TTL (5 minutes = 300s)
    clock.advance(301 * 1000);
    const snapshot = ThreatSnapshotEngine.getSnapshot();
    expect(snapshot.radar.freshness).toBe('STALE');
  });

  it('preserves clean state without adding synthetic telemetry', () => {
    ThreatSnapshotEngine.clearSignals();
    const snapshot = ThreatSnapshotEngine.getSnapshot();
    expect(snapshot.radar.signals).toEqual([]);
    expect(snapshot.radar.anomalyCount).toBe(0);
    expect(snapshot.radar.cellularCount).toBe(0);
    expect(snapshot.radar.bleCount).toBe(0);
  });
});
