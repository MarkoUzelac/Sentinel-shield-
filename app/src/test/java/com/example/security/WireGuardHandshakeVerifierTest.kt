package com.example.security

import org.junit.Assert.assertEquals
import org.junit.Test

class WireGuardHandshakeVerifierTest {
  @Test
  fun missingHandshakeIsActiveButUnverified() {
    assertEquals(
      TunnelState.ACTIVE_UNVERIFIED,
      WireGuardHandshakeVerifier.verify(WireGuardHandshakeEvidence("wg0", null, 100_000L)),
    )
  }

  @Test
  fun freshHandshakeIsVerified() {
    assertEquals(
      TunnelState.HANDSHAKE_VERIFIED,
      WireGuardHandshakeVerifier.verify(WireGuardHandshakeEvidence("wg0", 100_000L, 100_000L)),
    )
  }

  @Test
  fun oldHandshakeBecomesStale() {
    assertEquals(
      TunnelState.STALE,
      WireGuardHandshakeVerifier.verify(WireGuardHandshakeEvidence("wg0", 0L, 180_001L)),
    )
  }

  @Test
  fun futureHandshakeCannotBeVerified() {
    assertEquals(
      TunnelState.UNAVAILABLE,
      WireGuardHandshakeVerifier.verify(WireGuardHandshakeEvidence("wg0", 200_000L, 100_000L)),
    )
  }
}
