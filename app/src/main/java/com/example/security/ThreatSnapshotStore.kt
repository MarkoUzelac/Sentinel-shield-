package com.example.security

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class ThreatSnapshotStore(
  initial: ThreatSnapshot = ThreatSnapshot(generatedAtEpochMs = 0L),
) {
  private val _snapshot = MutableStateFlow(initial)
  val snapshot: StateFlow<ThreatSnapshot> = _snapshot.asStateFlow()

  fun publish(next: ThreatSnapshot) {
    require(next.generatedAtEpochMs >= _snapshot.value.generatedAtEpochMs) {
      "Threat snapshots must be monotonic by generation time."
    }
    _snapshot.value = next
  }
}
