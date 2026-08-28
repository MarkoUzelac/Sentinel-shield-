package com.example.data

import com.example.data.model.EvidenceStatus
import com.example.data.model.SignalObservation
import java.time.Instant

data class ThreatSnapshot(
  val generatedAt: Instant,
  val score: Int,
  val observations: List<SignalObservation>,
  val status: EvidenceStatus
) {
  companion object {
    fun from(observations: List<SignalObservation>, now: Instant = Instant.now()): ThreatSnapshot {
      val score = observations.count { it.status == EvidenceStatus.VERIFIED }.coerceIn(0, 100)
      return ThreatSnapshot(now, score, observations, if (observations.isEmpty()) EvidenceStatus.UNAVAILABLE else EvidenceStatus.VERIFIED)
    }
  }
}
