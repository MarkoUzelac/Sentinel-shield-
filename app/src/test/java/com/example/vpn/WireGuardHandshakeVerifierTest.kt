package com.example.vpn

import com.wireguard.config.Config
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class WireGuardHandshakeVerifierTest {
    @Test
    fun `verifier waits for fresh handshake evidence and reports attempts`() = runTest {
        var now = 1_000L
        var tunnelUp = false
        var handshake: Long? = null
        val attempts = mutableListOf<Int>()

        val verifier = WireGuardHandshakeVerifier(
            transport = FakeTransport({ tunnelUp }, { handshake }),
            nowEpochMillis = { now },
            delayMillis = {
                now += 500L
                if (now >= 2_000L) {
                    tunnelUp = true
                    handshake = now
                }
            },
            onAttempt = attempts::add,
            maxAttempts = 5,
            pollIntervalMillis = 500L
        )

        val result = verifier.verify(startedAtEpochMillis = 1_000L)

        assertEquals(WireGuardHandshakeVerification.Verified(2_000L), result)
        assertEquals(listOf(1, 2, 3), attempts)
    }

    @Test
    fun `verifier rejects handshake from before the current tunnel start`() = runTest {
        val verifier = WireGuardHandshakeVerifier(
            transport = FakeTransport({ true }, { 9_000L }),
            nowEpochMillis = { 10_000L },
            delayMillis = {},
            maxAttempts = 1,
            pollIntervalMillis = 500L
        )

        val result = verifier.verify(startedAtEpochMillis = 10_000L)

        assertTrue(result is WireGuardHandshakeVerification.Failed)
    }

    @Test
    fun `health check rejects stale and excessively future handshake`() {
        var now = 200_000L
        var handshake = 19_999L
        val transport = FakeTransport({ true }, { handshake })
        val verifier = WireGuardHandshakeVerifier(
            transport = transport,
            nowEpochMillis = { now },
            maxHandshakeAgeMillis = 180_000L,
            clockSkewMillis = 5_000L
        )

        assertTrue(!verifier.isHealthy())

        handshake = now + 6_000L
        assertTrue(!verifier.isHealthy())

        handshake = now - 10_000L
        assertTrue(verifier.isHealthy())
    }

    @Test
    fun `verifier fails closed after bounded attempts`() = runTest {
        var now = 1_000L
        val attempts = mutableListOf<Int>()
        val verifier = WireGuardHandshakeVerifier(
            transport = FakeTransport({ false }, { null }),
            nowEpochMillis = { now },
            delayMillis = { now += 500L },
            onAttempt = attempts::add,
            maxAttempts = 3,
            pollIntervalMillis = 500L
        )

        val result = verifier.verify(startedAtEpochMillis = 1_000L)

        assertEquals(WireGuardHandshakeVerification.Failed("WireGuard peer handshake was not verified within 1 seconds"), result)
        assertEquals(listOf(1, 2, 3), attempts)
    }

    private class FakeTransport(
        private val up: () -> Boolean,
        private val handshake: () -> Long?
    ) : WireGuardTransport {
        override fun start(config: Config): WireGuardTransportResult = WireGuardTransportResult.Started
        override fun stop(): WireGuardTransportResult = WireGuardTransportResult.Stopped
        override fun isTunnelUp(): Boolean = up()
        override fun latestHandshakeEpochMillis(): Long? = handshake()
    }
}
