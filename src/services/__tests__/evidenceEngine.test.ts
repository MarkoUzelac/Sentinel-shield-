import { describe, it, expect, beforeEach } from 'vitest';
import { CapabilityEvidenceEngine } from '../evidenceEngine';
import { SettableEvidenceClock } from '../clock';

describe('CapabilityEvidenceEngine Deterministic Evidence & Freshness', () => {
  let clock: SettableEvidenceClock;

  beforeEach(() => {
    clock = new SettableEvidenceClock(1700000000000);
    CapabilityEvidenceEngine.setClock(clock);
  });

  describe('VPN Handshake Evidence Rules', () => {
    it('returns UNAVAILABLE when tunnel is disconnected', () => {
      const evidence = CapabilityEvidenceEngine.vpnHandshake(false, null);
      expect(evidence.status).toBe('UNAVAILABLE');
      expect(evidence.freshness).toBe('UNAVAILABLE');
    });

    it('returns VERIFIED only when tunnel is connected AND handshake is within 180s TTL', () => {
      const now = clock.now();
      const freshHandshake = now - 30 * 1000; // 30 seconds ago
      const evidence = CapabilityEvidenceEngine.vpnHandshake(true, freshHandshake);

      expect(evidence.status).toBe('VERIFIED');
      expect(evidence.freshness).toBe('VERIFIED');
      expect(evidence.provenance?.runtimeBacked).toBe(true);
    });

    it('returns UNVERIFIED when connected but handshake timestamp is missing', () => {
      const evidence = CapabilityEvidenceEngine.vpnHandshake(true, null);
      expect(evidence.status).toBe('UNVERIFIED');
      expect(evidence.freshness).toBe('ACTIVE_UNVERIFIED');
    });

    it('transitions to STALE / UNVERIFIED when handshake timestamp exceeds 180s TTL', () => {
      const now = clock.now();
      const expiredHandshake = now - (181 * 1000); // 181s ago
      const evidence = CapabilityEvidenceEngine.vpnHandshake(true, expiredHandshake);

      expect(evidence.status).toBe('UNVERIFIED');
      expect(evidence.details).toContain('stale or unverified');
    });

    it('deterministically transitions as clock advances', () => {
      const initialNow = clock.now();
      const handshakeTime = initialNow;

      // 1. Initially fresh (0s old)
      let evidence = CapabilityEvidenceEngine.vpnHandshake(true, handshakeTime);
      expect(evidence.status).toBe('VERIFIED');

      // 2. Advance clock by 120s (still within 180s)
      clock.advance(120 * 1000);
      evidence = CapabilityEvidenceEngine.vpnHandshake(true, handshakeTime);
      expect(evidence.status).toBe('VERIFIED');

      // 3. Advance clock past 180s limit (+65s = 185s total)
      clock.advance(65 * 1000);
      evidence = CapabilityEvidenceEngine.vpnHandshake(true, handshakeTime);
      expect(evidence.status).toBe('UNVERIFIED');
    });
  });

  describe('Telephony & RF Evidence Rules', () => {
    it('returns UNAVAILABLE when telephony interface is missing', () => {
      const evidence = CapabilityEvidenceEngine.radar({
        telephonyAvailable: false,
        permissionGranted: false,
        cellRecordCount: 0,
      });
      expect(evidence.status).toBe('UNAVAILABLE');
    });

    it('returns UNAVAILABLE when sensor permission is not granted', () => {
      const evidence = CapabilityEvidenceEngine.radar({
        telephonyAvailable: true,
        permissionGranted: false,
        cellRecordCount: 0,
      });
      expect(evidence.status).toBe('UNAVAILABLE');
    });

    it('returns UNVERIFIED with real observation count (never falsely claims complete proof)', () => {
      const evidence = CapabilityEvidenceEngine.radar({
        telephonyAvailable: true,
        permissionGranted: true,
        cellRecordCount: 3,
      });
      expect(evidence.status).toBe('UNVERIFIED');
      expect(evidence.details).toContain('3 verified records');
    });
  });

  describe('Overall Score Determinism', () => {
    it('calculates score deterministically without random fluctuations', () => {
      const evidences = CapabilityEvidenceEngine.getEvidences({
        vpnConnected: false,
        cellRecordCount: 0,
      });
      const score1 = CapabilityEvidenceEngine.calculateOverallScore(evidences, 0);
      const score2 = CapabilityEvidenceEngine.calculateOverallScore(evidences, 0);
      expect(score1).toBe(score2);
    });

    it('penalizes score when active threats are present', () => {
      const evidences = CapabilityEvidenceEngine.getEvidences({
        vpnConnected: true,
        handshakeEpochMs: clock.now(),
      });
      const scoreWithoutThreats = CapabilityEvidenceEngine.calculateOverallScore(evidences, 0);
      const scoreWithThreats = CapabilityEvidenceEngine.calculateOverallScore(evidences, 2);
      expect(scoreWithThreats).toBeLessThan(scoreWithoutThreats);
    });
  });
});
