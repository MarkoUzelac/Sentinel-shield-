package com.example.security

/**
 * Provenance of a security observation. Values must describe what the app actually knows.
 */
enum class EvidenceState {
  VERIFIED,
  UNVERIFIED,
  ESTIMATED,
  STALE,
  UNAVAILABLE,
}

enum class EvidenceSource {
  LOCAL_ANDROID,
  PROVIDER_ENRICHED,
  DERIVED,
  UNAVAILABLE,
}

enum class ObservationKind {
  GPS,
  CELLULAR,
  WIFI,
  BLE,
  NETWORK,
  VPN,
  UNKNOWN,
}

data class SecurityObservation(
  val id: String,
  val kind: ObservationKind,
  val observedAtEpochMs: Long,
  val source: EvidenceSource,
  val payload: Map<String, String> = emptyMap(),
)

data class ThreatFinding(
  val id: String,
  val title: String,
  val score: Int,
  val evidence: EvidenceState,
  val observationIds: List<String> = emptyList(),
) {
  init {
    require(score in 0..100) { "Threat score must be between 0 and 100." }
  }
}

data class ThreatSnapshot(
  val generatedAtEpochMs: Long,
  val observations: List<SecurityObservation> = emptyList(),
  val findings: List<ThreatFinding> = emptyList(),
) {
  val highestThreatScore: Int
    get() = findings.maxOfOrNull(ThreatFinding::score) ?: 0
}

/** Injectable clock used by freshness-sensitive security logic and deterministic tests. */
fun interface EvidenceClock {
  fun nowEpochMs(): Long
}

object SystemEvidenceClock : EvidenceClock {
  override fun nowEpochMs(): Long = System.currentTimeMillis()
}

fun evidenceStateFor(
  observedAtEpochMs: Long,
  nowEpochMs: Long,
  staleAfterMs: Long,
  source: EvidenceSource,
): EvidenceState {
  require(staleAfterMs >= 0) { "staleAfterMs must be non-negative." }
  if (source == EvidenceSource.UNAVAILABLE) return EvidenceState.UNAVAILABLE
  if (observedAtEpochMs > nowEpochMs) return EvidenceState.UNVERIFIED
  return if (nowEpochMs - observedAtEpochMs <= staleAfterMs) {
    EvidenceState.VERIFIED
  } else {
    EvidenceState.STALE
  }
}
