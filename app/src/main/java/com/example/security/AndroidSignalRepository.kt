package com.example.security

import android.net.ConnectivityManager
import android.net.NetworkCapabilities
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
  private val history: ObservationHistory? = null,
  private val enricher: OpenCellIdEnricher? = null,
  private val connectivityManager: ConnectivityManager? = null,
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
        ingestor.collectSnapshot().collect { rawSnapshot ->
          val enriched = rawSnapshot.observations.map { observation ->
            if (observation.kind == ObservationKind.CELLULAR && enricher != null) {
              runCatching { enricher.enrich(observation) }
                .getOrElse { observation.copy(payload = observation.payload + ("enrichment" to "unavailable_error")) }
            } else observation
          }
          val verified = enrichVpnEvidence(enriched)
          val next = rawSnapshot.copy(observations = verified)
          store.publish(next)
          history?.append(verified)
        }
        delay(POLL_INTERVAL_MS)
      }
    }
  }

  fun stop() {
    job?.cancel()
    job = null
    _running.value = false
  }

  private fun enrichVpnEvidence(observations: List<SecurityObservation>): List<SecurityObservation> {
    val vpn = observations.firstOrNull { it.kind == ObservationKind.VPN } ?: return observations
    val active = vpn.payload["active_transport"]?.toBooleanStrictOrNull() == true
    if (!active || connectivityManager == null) return observations

    val network = connectivityManager.activeNetwork ?: return observations
    val caps = connectivityManager.getNetworkCapabilities(network) ?: return observations
    if (!caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) return observations

    // Android's public ConnectivityManager APIs expose VPN transport presence but do not expose
    // WireGuard peer handshake timestamps. Therefore this observation remains ACTIVE_UNVERIFIED.
    return observations.map { observation ->
      if (observation.id == vpn.id) observation.copy(
        payload = observation.payload + ("handshake" to TunnelState.ACTIVE_UNVERIFIED.name),
      ) else observation
    }
  }

  private companion object {
    const val POLL_INTERVAL_MS = 5_000L
  }
}
