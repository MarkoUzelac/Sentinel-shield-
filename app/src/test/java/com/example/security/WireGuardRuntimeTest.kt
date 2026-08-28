package com.example.security

import org.junit.Assert.assertEquals
import org.junit.Test

class WireGuardRuntimeTest {
  private val peer = WireGuardPeerRuntime(
    publicKey = "peer",
    latestHandshakeEpochMillis = 95_000L,
  )

  @Test
  fun freshHandshakeIsVerifiedOnlyAfterTunnelStartup() {
    val verifier = WireGuardHandshakeVerifier(staleAfterMs = 10_000L)
    assertEquals(
      WireGuardEvidenceState.HANDSHAKE_VERIFIED,
      verifier.verify(
        WireGuardRuntimeSnapshot(WireGuardRuntimeState.UP, 90_000L, peer),
        nowEpochMillis = 100_000L,
      ),
    )
  }

  @Test
  fun handshakeBeforeStartupIsNotVerified() {
    val verifier = WireGuardHandshakeVerifier(staleAfterMs = 10_000L)
    assertEquals(
      WireGuardEvidenceState.ACTIVE_UNVERIFIED,
      verifier.verify(
        WireGuardRuntimeSnapshot(WireGuardRuntimeState.UP, 100_000L, peer),
        nowEpochMillis = 100_000L,
      ),
    )
  }

  @Test
  fun staleHandshakeIsNotVerified() {
    val verifier = WireGuardHandshakeVerifier(staleAfterMs = 10_000L)
    assertEquals(
      WireGuardEvidenceState.STALE,
      verifier.verify(
        WireGuardRuntimeSnapshot(WireGuardRuntimeState.UP, 80_000L, peer.copy(latestHandshakeEpochMillis = 85_000L)),
        nowEpochMillis = 100_000L,
      ),
    )
  }

  @Test
  fun downTunnelIsInactive() {
    assertEquals(
      WireGuardEvidenceState.INACTIVE,
      WireGuardHandshakeVerifier().verify(
        WireGuardRuntimeSnapshot(WireGuardRuntimeState.DOWN, 90_000L, peer),
        100_000L,
      ),
    )
  }
}
