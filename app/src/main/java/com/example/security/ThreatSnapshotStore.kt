package com.example.security

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Single in-memory security source of truth for UI consumers. */
class ThreatSnapshotStore {
  private val _snapshot = MutableStateFlow(ThreatSnapshot(generatedAtEpochMs = 0L))
  val snapshot: StateFlow<ThreatSnapshot> = _snapshot.asStateFlow()

  fun publish(observations: List<SecurityObservation>, nowEpochMs: Long) {
    _snapshot.value = ThreatSnapshot(
      generatedAtEpochMs = nowEpochMs,
      observations = observations,
    )
  }

  fun publish(snapshot: ThreatSnapshot) {
    _snapshot.value = snapshot
  }
}
