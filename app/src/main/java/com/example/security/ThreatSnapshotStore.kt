package com.example.security

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Shared security source of truth for UI consumers plus bounded recent history. */
class ThreatSnapshotStore(
  private val maxHistory: Int = 2_000,
) {
  init {
    require(maxHistory > 0)
  }

  private val _snapshot = MutableStateFlow(ThreatSnapshot(generatedAtEpochMs = 0L))
  val snapshot: StateFlow<ThreatSnapshot> = _snapshot.asStateFlow()

  private val history = ArrayDeque<SecurityObservation>()

  @Synchronized
  fun publish(observations: List<SecurityObservation>, nowEpochMs: Long) {
    appendHistory(observations)
    _snapshot.value = ThreatSnapshot(
      generatedAtEpochMs = nowEpochMs,
      observations = observations,
    )
  }

  @Synchronized
  fun publish(snapshot: ThreatSnapshot) {
    appendHistory(snapshot.observations)
    _snapshot.value = snapshot
  }

  @Synchronized
  fun recentHistory(): List<SecurityObservation> = history.toList()

  private fun appendHistory(observations: List<SecurityObservation>) {
    observations.forEach { observation ->
      history.addLast(observation)
      while (history.size > maxHistory) history.removeFirst()
    }
  }
}
