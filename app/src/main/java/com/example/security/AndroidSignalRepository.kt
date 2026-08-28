package com.example.security

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/** Bridges real Android providers into the shared ThreatSnapshot store. */
class AndroidSignalRepository(
  private val ingestor: AndroidSignalIngestor,
  private val store: ThreatSnapshotStore = ThreatSnapshotStore(),
) {
  private val _running = MutableStateFlow(false)
  val running: StateFlow<Boolean> = _running.asStateFlow()
  val snapshot: StateFlow<ThreatSnapshot> = store.snapshot

  private var job: Job? = null

  fun start(scope: CoroutineScope) {
    if (job?.isActive == true) return
    _running.value = true
    job = scope.launch(Dispatchers.IO) {
      while (isActive) {
        ingestor.collectSnapshot().collect { snapshot -> store.publish(snapshot) }
        delay(POLL_INTERVAL_MS)
      }
    }
  }

  fun stop() {
    job?.cancel()
    job = null
    _running.value = false
  }

  private companion object {
    const val POLL_INTERVAL_MS = 5_000L
  }
}
