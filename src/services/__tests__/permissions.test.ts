import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThreatSnapshotEngine } from '../threatSnapshotEngine';

describe('Permissions & System Telemetry Setup', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('provides a valid ThreatSnapshot with location state initialization', () => {
    const snapshot = ThreatSnapshotEngine.getSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.location).toBeDefined();
    expect(typeof snapshot.location.permissionState).toBe('string');
  });

  it('handles geolocation permission requests smoothly', async () => {
    const loc = await ThreatSnapshotEngine.requestGeolocationPermission();
    expect(loc).toBeDefined();
    expect(['PROMPT', 'GRANTED', 'DENIED', 'UNSUPPORTED']).toContain(loc.permissionState);
  });
});
