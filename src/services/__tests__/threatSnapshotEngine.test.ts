import { describe, it, expect, beforeEach } from 'vitest';
import { ThreatSnapshotEngine } from '../threatSnapshotEngine';
import { SettableEvidenceClock } from '../clock';
import { SignalRadarItem } from '../../types';

describe('ThreatSnapshotEngine Canonical Evidence Pipeline', () => {
  let clock: SettableEvidenceClock;

  beforeEach(() => {
    clock = new SettableEvidenceClock(1700000000000);
    ThreatSnapshotEngine.setClock(clock);
    ThreatSnapshotEngine.clearSignals();
    ThreatSnapshotEngine.setThreats([]);
    ThreatSnapshotEngine.setVpnState({
      tunnelState: 'Disconnected',
      lastHandshakeEpochMs: null,
      handshakeVerified: false,
    });
    ThreatSnapshotEngine.setLocation({
      hasFix: false,
      latitude: null,
      longitude: null,
      permissionState: 'PROMPT',
      confidence: 'UNAVAILABLE',
      freshness: 'UNAVAILABLE',
    });
  });

  it('produces an honest empty state for Radar when no signals are observed', () => {
    const snapshot = ThreatSnapshotEngine.getSnapshot();
    expect(snapshot.radar.signals).toEqual([]);
    expect(snapshot.radar.bleCount).toBe(0);
    expect(snapshot.radar.cellularCount).toBe(0);
    expect(snapshot.radar.anomalyCount).toBe(0);
    expect(snapshot.radar.freshness).toBe('UNAVAILABLE');
  });

  it('ingests evidence signals without generating synthetic properties', () => {
    const signal: SignalRadarItem = {
      id: 'real-cell-1',
      kind: 'CELLULAR',
      label: 'Serving Cell eNodeB',
      technology: 'LTE Band 3',
      cellId: 10452,
      rssiDbm: -80,
      latitude: 45.815,
      longitude: 15.981,
      risk: 'INFO',
      explanation: 'Authentic serving base station',
      observedAtEpochMs: clock.now(),
      runtimeBacked: true,
      firstObservedAtEpochMs: clock.now(),
      observationCount: 1,
      persistenceSeconds: 10,
      anomalyScore: 0,
      locationConsistency: 'CONSISTENT',
      locationConfidence: 'KNOWN_LOCATION',
      freshness: 'VERIFIED',
    };

    ThreatSnapshotEngine.addSignal(signal);
    const snapshot = ThreatSnapshotEngine.getSnapshot();

    expect(snapshot.radar.signals.length).toBe(1);
    expect(snapshot.radar.cellularCount).toBe(1);
    expect(snapshot.radar.signals[0].cellId).toBe(10452);
    expect(snapshot.radar.signals[0].latitude).toBe(45.815);
  });

  it('tracks location freshness deterministically', () => {
    // 1. Initial unavailable
    expect(ThreatSnapshotEngine.getSnapshot().location.freshness).toBe('UNAVAILABLE');

    // 2. Set fix
    ThreatSnapshotEngine.setLocation({
      hasFix: true,
      latitude: 45.815,
      longitude: 15.981,
      confidence: 'KNOWN_LOCATION',
      freshness: 'VERIFIED',
    });
    expect(ThreatSnapshotEngine.getSnapshot().location.freshness).toBe('VERIFIED');

    // 3. Advance past location TTL (5 minutes = 300_000ms)
    clock.advance(301 * 1000);
    expect(ThreatSnapshotEngine.getSnapshot().location.freshness).toBe('STALE');
  });

  it('notifies subscribers synchronously upon state changes', () => {
    let subscriberCallCount = 0;
    const unsubscribe = ThreatSnapshotEngine.subscribe(() => {
      subscriberCallCount++;
    });

    expect(subscriberCallCount).toBe(1); // Called on initial subscription

    ThreatSnapshotEngine.setThreats([
      {
        id: 'threat-1',
        title: 'Rogue AP Detected',
        category: 'Network Intrusion',
        severity: 'HIGH',
        description: 'Unencrypted evil twin AP',
        recommendation: 'Disconnect from untrusted network',
        timestamp: clock.now(),
        isResolved: false,
      },
    ]);

    expect(subscriberCallCount).toBe(2);
    expect(ThreatSnapshotEngine.getSnapshot().activeThreatCount).toBe(1);

    unsubscribe();
  });
});
