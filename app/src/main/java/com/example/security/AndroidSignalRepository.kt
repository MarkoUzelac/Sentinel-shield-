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

class AndroidSignalRepository(
  private val ingestor: AndroidSignalIngestor,
  private val store: ThreatSnapshotStore = ThreatSnapshotStore(),
  private val history: ObservationHistory? = null,
  private val enricher: OpenCellIdEnricher? = null,
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
        ingestor.collectSnapshot().collect { raw ->
          val enriched = raw.observations.map { o ->
            if (o.kind == ObservationKind.CELLULAR && enricher != null) runCatching { enricher.enrich(o) }.getOrElse { o } else o
          }
          val next = raw.copy(observations = enriched)
          store.publish(next)
          history?.append(enriched)
        }
        delay(5_000L)
      }
    }
  }

  fun stop() { job?.cancel(); job = null; _running.value = false }
}
