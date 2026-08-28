package com.example.security

import org.junit.Assert.assertEquals
import org.junit.Test

class ThreatSnapshotStoreTest {
  @Test
  fun publishesLatestAuthoritativeSnapshot() {
    val store = ThreatSnapshotStore()
    val observation = SecurityObservation(
      id = "wifi-test",
      kind = ObservationKind.WIFI,
      observedAtEpochMs = 1_000L,
      source = EvidenceSource.LOCAL_ANDROID,
      payload = mapOf("rssi_dbm" to "-42"),
    )

    store.publish(listOf(observation), nowEpochMs = 2_000L)

    assertEquals(2_000L, store.snapshot.value.generatedAtEpochMs)
    assertEquals(listOf(observation), store.snapshot.value.observations)
  }
}
