package com.example.data

import com.example.data.model.EvidenceState
import com.example.data.model.ObservationKind
import com.example.data.model.ObservationSource
import com.example.data.model.SignalObservation
import com.example.data.model.ThreatSnapshot
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.concurrent.ConcurrentHashMap

/** Central bridge between runtime providers and the single threat snapshot consumed by UI. */
class SignalIntelligenceCoordinator(
    private val engine: SignalIntelligenceEngine,
    private val now: () -> Long = { System.currentTimeMillis() },
    private val observationRetentionMs: Long = 120_000L
) {
    private val observations = ConcurrentHashMap<String, SignalObservation>()
    private val _snapshot = MutableStateFlow(ThreatSnapshot())
    val snapshot: StateFlow<ThreatSnapshot> = _snapshot.asStateFlow()

    @Synchronized
    fun replaceSource(source: ObservationSource, values: List<SignalObservation>) {
        observations.entries.removeIf { it.value.source == source }
        values.forEach { observations[it.id] = it }
        prune()
        recompute()
    }

    @Synchronized
    fun upsert(observation: SignalObservation) {
        observations[observation.id] = observation
        prune()
        recompute()
    }

    @Synchronized
    fun clear() {
        observations.clear()
        _snapshot.value = ThreatSnapshot()
    }

    private fun prune() {
        val cutoff = now() - observationRetentionMs
        observations.entries.removeIf { it.value.observedAtEpochMs < cutoff }
    }

    private fun recompute() {
        _snapshot.value = engine.analyze(observations.values.toList())
    }

    fun verifiedObservation(
        id: String,
        source: ObservationSource,
        kind: ObservationKind,
        observedAtEpochMs: Long,
        details: String? = null
    ): SignalObservation = SignalObservation(
        id = id,
        source = source,
        kind = kind,
        observedAtEpochMs = observedAtEpochMs,
        evidenceState = EvidenceState.VERIFIED,
        details = details
    )
}
