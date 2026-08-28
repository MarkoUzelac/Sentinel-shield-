package com.example.security

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class EvidenceTest {
  @Test
  fun unavailableSourceAlwaysRemainsUnavailable() {
    assertEquals(
      EvidenceState.UNAVAILABLE,
      evidenceStateFor(
        observedAtEpochMs = 0L,
        nowEpochMs = 60_000L,
        staleAfterMs = 10_000L,
        source = EvidenceSource.UNAVAILABLE,
      ),
    )
  }

  @Test
  fun futureObservationCannotBeReportedAsVerified() {
    assertEquals(
      EvidenceState.UNVERIFIED,
      evidenceStateFor(
        observedAtEpochMs = 2_000L,
        nowEpochMs = 1_000L,
        staleAfterMs = 10_000L,
        source = EvidenceSource.LOCAL_ANDROID,
      ),
    )
  }

  @Test
  fun observationTransitionsFromVerifiedToStaleDeterministically() {
    val clock = EvidenceClock { 10_000L }
    val observedAt = 5_000L
    val staleAfter = 5_000L

    assertEquals(
      EvidenceState.VERIFIED,
      evidenceStateFor(observedAt, clock.nowEpochMs(), staleAfter, EvidenceSource.LOCAL_ANDROID),
    )
    assertTrue(
      evidenceStateFor(observedAt, 10_001L, staleAfter, EvidenceSource.LOCAL_ANDROID) == EvidenceState.STALE,
    )
  }

  @Test
  fun threatSnapshotUsesSingleAuthoritativeFindingSet() {
    val snapshot = ThreatSnapshot(
      generatedAtEpochMs = 123L,
      findings = listOf(
        ThreatFinding("f1", "Network anomaly", 50, EvidenceState.VERIFIED),
        ThreatFinding("f2", "VPN evidence stale", 75, EvidenceState.STALE),
      ),
    )

    assertEquals(75, snapshot.highestThreatScore)
  }
}
