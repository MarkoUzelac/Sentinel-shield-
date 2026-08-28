package com.example.security

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SignalProjectionTest {
  @Test
  fun radarProjectionUsesEvidenceFreshnessAndRealIdentifiers() {
    val snapshot = ThreatSnapshot(
      generatedAtEpochMs = 1_000L,
      observations = listOf(
        SecurityObservation(
          id = "wifi-1",
          kind = ObservationKind.WIFI,
          observedAtEpochMs = 950L,
          source = EvidenceSource.LOCAL_ANDROID,
          payload = mapOf("ssid" to "TestNet", "bssid" to "00:11:22:33:44:55", "rssi_dbm" to "-48"),
        ),
      ),
    )

    val radar = ThreatSnapshotProjector.radar(snapshot, nowEpochMs = 1_000L, staleAfterMs = 100L)
    assertEquals(1, radar.size)
    assertEquals(EvidenceState.VERIFIED, radar.single().evidence)
    assertEquals(-48, radar.single().rssiDbm)
    assertTrue(radar.single().subtitle.contains("bssid=00:11:22:33:44:55"))
  }

  @Test
  fun tacticalMapRejectsObservationsWithoutDefensibleCoordinates() {
    val snapshot = ThreatSnapshot(
      generatedAtEpochMs = 1_000L,
      observations = listOf(
        SecurityObservation(
          id = "cell-1",
          kind = ObservationKind.CELLULAR,
          observedAtEpochMs = 1_000L,
          source = EvidenceSource.LOCAL_ANDROID,
          payload = mapOf("mcc" to "219", "mnc" to "10", "ci" to "123"),
        ),
        SecurityObservation(
          id = "gps-1",
          kind = ObservationKind.GPS,
          observedAtEpochMs = 1_000L,
          source = EvidenceSource.LOCAL_ANDROID,
          payload = mapOf("latitude" to "45.8150", "longitude" to "15.9819", "accuracy_m" to "8"),
        ),
      ),
    )

    val points = ThreatSnapshotProjector.tacticalMap(snapshot)
    assertEquals(1, points.size)
    assertEquals("KNOWN LOCATION", points.single().locationState)
    assertEquals(45.815, points.single().latitude, 0.000001)
  }
}
