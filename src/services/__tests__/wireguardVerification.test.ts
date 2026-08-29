import { describe, it, expect, beforeEach } from 'vitest';
import { ThreatSnapshotEngine } from '../threatSnapshotEngine';
import { CapabilityEvidenceEngine } from '../evidenceEngine';
import { SettableEvidenceClock } from '../clock';
import { VpnTunnelStore } from '../vpnStore';

describe('WireGuard Handshake Verification and Freshness Pipeline', () => {
  let clock: SettableEvidenceClock;

  beforeEach(() => {
    clock = new SettableEvidenceClock(1700000000000);
    ThreatSnapshotEngine.setClock(clock);
    ThreatSnapshotEngine.setVpnState({
      tunnelState: 'Disconnected',
      lastHandshakeEpochMs: null,
      handshakeVerified: false,
      rxBytes: 0,
      txBytes: 0,
    });
  });

  it('reports UNAVAILABLE when VPN is disconnected and no handshake exists', () => {
    const snapshot = ThreatSnapshotEngine.getSnapshot();
    expect(snapshot.vpn.tunnelState).toBe('Disconnected');
    expect(snapshot.vpn.freshness).toBe('UNAVAILABLE');
    expect(snapshot.vpn.handshakeVerified).toBe(false);

    const vpnEvidence = CapabilityEvidenceEngine.vpnHandshake(snapshot.vpn.tunnelState === 'Connected', snapshot.vpn.lastHandshakeEpochMs);
    expect(vpnEvidence.status).toBe('UNAVAILABLE');
  });

  it('marks WireGuard tunnel as VERIFIED only with an active recent peer handshake', () => {
    const now = clock.now();
    ThreatSnapshotEngine.setVpnState({
      tunnelState: 'Connected',
      lastHandshakeEpochMs: now,
      handshakeVerified: true,
      rxBytes: 154200,
      txBytes: 89000,
      endpoint: 'ch1.sentinel-shield.net:51820',
    });

    const snapshot = ThreatSnapshotEngine.getSnapshot();
    expect(snapshot.vpn.tunnelState).toBe('Connected');
    expect(snapshot.vpn.handshakeVerified).toBe(true);
    expect(snapshot.vpn.freshness).toBe('VERIFIED');

    const vpnEvidence = CapabilityEvidenceEngine.vpnHandshake(snapshot.vpn.tunnelState === 'Connected', snapshot.vpn.lastHandshakeEpochMs);
    expect(vpnEvidence.status).toBe('VERIFIED');
    expect(vpnEvidence.details).toContain('Peer handshake verified');
  });

  it('transitions handshake to STALE after 3 minutes (180,000ms) without fresh peer keepalive', () => {
    const startTime = clock.now();
    ThreatSnapshotEngine.setVpnState({
      tunnelState: 'Connected',
      lastHandshakeEpochMs: startTime,
      handshakeVerified: true,
      rxBytes: 154200,
      txBytes: 89000,
    });

    // 2 minutes later: still fresh
    clock.advance(120 * 1000);
    expect(ThreatSnapshotEngine.getSnapshot().vpn.freshness).toBe('VERIFIED');

    // Advance past 3 minutes (total 3.5 minutes = 210s)
    clock.advance(90 * 1000);
    const snapshot = ThreatSnapshotEngine.getSnapshot();
    expect(snapshot.vpn.freshness).toBe('STALE');

    const vpnEvidence = CapabilityEvidenceEngine.vpnHandshake(snapshot.vpn.tunnelState === 'Connected', snapshot.vpn.lastHandshakeEpochMs);
    expect(vpnEvidence.status).toBe('UNVERIFIED');
  });

  it('never falsely marks a tunnel VERIFIED if only generic VPN is active without peer handshake', () => {
    ThreatSnapshotEngine.setVpnState({
      tunnelState: 'Connected',
      lastHandshakeEpochMs: null,
      handshakeVerified: false,
      rxBytes: 0,
      txBytes: 0,
    });

    const snapshot = ThreatSnapshotEngine.getSnapshot();
    expect(snapshot.vpn.tunnelState).toBe('Connected');
    expect(snapshot.vpn.freshness).toBe('ACTIVE_UNVERIFIED');

    const vpnEvidence = CapabilityEvidenceEngine.vpnHandshake(snapshot.vpn.tunnelState === 'Connected', snapshot.vpn.lastHandshakeEpochMs);
    expect(vpnEvidence.status).toBe('UNVERIFIED');
  });

  it('clears session statistics cleanly upon disconnect', () => {
    ThreatSnapshotEngine.setVpnState({
      tunnelState: 'Connected',
      lastHandshakeEpochMs: clock.now(),
      handshakeVerified: true,
      rxBytes: 50000,
      txBytes: 25000,
    });

    VpnTunnelStore.disconnect();

    const snapshot = ThreatSnapshotEngine.getSnapshot();
    expect(snapshot.vpn.tunnelState).toBe('Disconnected');
    expect(snapshot.vpn.rxBytes).toBe(0);
    expect(snapshot.vpn.txBytes).toBe(0);
    expect(snapshot.vpn.lastHandshakeEpochMs).toBeNull();
    expect(snapshot.vpn.handshakeVerified).toBe(false);
  });
});
