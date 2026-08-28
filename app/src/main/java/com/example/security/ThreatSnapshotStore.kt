package com.example.security

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class ThreatSnapshotStore {
  private val _snapshot = MutableStateFlow(ThreatSnapshot(0L))
  val snapshot: StateFlow<ThreatSnapshot> = _snapshot.asStateFlow()
  fun publish(snapshot: ThreatSnapshot) { _snapshot.value = snapshot }
}
