package com.example.security

/**
 * Runtime-facing WireGuard evidence contract. The adapter is fed only by the official
 * WireGuard backend integration layer; it never infers a handshake from generic VPN state.
 */
data class WireGuardPeerRuntime(
  val publicKey: String,
  val latestHandshakeEpochMillis: Long,
  val rxBytes: Long = 0L,
  val txBytes: Long = 0L,
)

enum class WireGuardRuntimeState {
  DOWN,
  UP,
  UNKNOWN,
}

data class WireGuardRuntimeSnapshot(
  val state: WireGuardRuntimeState,
  val startupEpochMillis: Long,
  val peer: WireGuardPeerRuntime?,
)

enum class WireGuardEvidenceState {
  HANDSHAKE_VERIFIED,
  STALE,
  ACTIVE_UNVERIFIED,
  INACTIVE,
  UNAVAILABLE,
}

interface WireGuardRuntimeReader {
  fun read(): WireGuardRuntimeSnapshot
}

class WireGuardHandshakeVerifier(
  private val staleAfterMs: Long = 120_000L,
) {
  init {
    require(staleAfterMs >= 0) { "staleAfterMs must be non-negative." }
  }

  fun verify(snapshot: WireGuardRuntimeSnapshot, nowEpochMillis: Long): WireGuardEvidenceState {
    if (snapshot.state == WireGuardRuntimeState.DOWN) return WireGuardEvidenceState.INACTIVE
    if (snapshot.state == WireGuardRuntimeState.UNKNOWN) return WireGuardEvidenceState.UNAVAILABLE

    val peer = snapshot.peer ?: return WireGuardEvidenceState.ACTIVE_UNVERIFIED
    val handshake = peer.latestHandshakeEpochMillis
    if (handshake <= 0L || handshake < snapshot.startupEpochMillis) {
      return WireGuardEvidenceState.ACTIVE_UNVERIFIED
    }
    if (handshake > nowEpochMillis) return WireGuardEvidenceState.ACTIVE_UNVERIFIED
    return if (nowEpochMillis - handshake <= staleAfterMs) {
      WireGuardEvidenceState.HANDSHAKE_VERIFIED
    } else {
      WireGuardEvidenceState.STALE
    }
  }
}

class WireGuardEvidenceAdapter(
  private val reader: WireGuardRuntimeReader,
  private val verifier: WireGuardHandshakeVerifier = WireGuardHandshakeVerifier(),
  private val clock: EvidenceClock = SystemEvidenceClock,
) {
  fun readObservation(): SecurityObservation {
    val now = clock.nowEpochMs()
    val runtime = runCatching { reader.read() }.getOrElse {
      return SecurityObservation(
        id = "vpn-wireguard-$now",
        kind = ObservationKind.VPN,
        observedAtEpochMs = now,
        source = EvidenceSource.UNAVAILABLE,
        payload = mapOf("backend" to "wireguard", "state" to WireGuardEvidenceState.UNAVAILABLE.name),
      )
    }

    val evidence = verifier.verify(runtime, now)
    val payload = buildMap {
      put("backend", "wireguard")
      put("runtime_state", runtime.state.name)
      put("evidence_state", evidence.name)
      put("startup_epoch_ms", runtime.startupEpochMillis.toString())
      runtime.peer?.let {
        put("peer_public_key", it.publicKey)
        put("latest_handshake_epoch_ms", it.latestHandshakeEpochMillis.toString())
        put("rx_bytes", it.rxBytes.toString())
        put("tx_bytes", it.txBytes.toString())
      }
    }

    return SecurityObservation(
      id = "vpn-wireguard-$now",
      kind = ObservationKind.VPN,
      observedAtEpochMs = now,
      source = EvidenceSource.LOCAL_ANDROID,
      payload = payload,
    )
  }
}
