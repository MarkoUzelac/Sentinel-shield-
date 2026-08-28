package com.example.security

/** Observable tunnel state; HANDSHAKE_VERIFIED is reserved for real fresh handshake evidence. */
enum class TunnelState {
  ACTIVE_UNVERIFIED,
  HANDSHAKE_VERIFIED,
  STALE,
  INACTIVE,
  UNAVAILABLE,
}

data class WireGuardHandshakeEvidence(
  val interfaceName: String,
  val latestHandshakeEpochMs: Long?,
  val nowEpochMs: Long,
  val freshnessWindowMs: Long = 180_000L,
)

object WireGuardHandshakeVerifier {
  fun verify(evidence: WireGuardHandshakeEvidence): TunnelState {
    val handshake = evidence.latestHandshakeEpochMs ?: return TunnelState.ACTIVE_UNVERIFIED
    if (handshake > evidence.nowEpochMs) return TunnelState.UNAVAILABLE
    return if (evidence.nowEpochMs - handshake <= evidence.freshnessWindowMs) {
      TunnelState.HANDSHAKE_VERIFIED
    } else {
      TunnelState.STALE
    }
  }
}
