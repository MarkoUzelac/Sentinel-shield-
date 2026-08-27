package com.example.vpn

import kotlinx.coroutines.delay

sealed interface WireGuardHandshakeVerification {
    data class Verified(val handshakeEpochMillis: Long) : WireGuardHandshakeVerification
    data class Failed(val reason: String) : WireGuardHandshakeVerification
}

/**
 * Pure verification engine for WireGuard transport evidence.
 * It has no Android dependencies so timing/race cases can be tested deterministically.
 */
class WireGuardHandshakeVerifier(
    private val transport: WireGuardTransport,
    private val nowEpochMillis: () -> Long = System::currentTimeMillis,
    private val delayMillis: suspend (Long) -> Unit = { delay(it) },
    private val onAttempt: (Int) -> Unit = {},
    private val maxAttempts: Int = 20,
    private val pollIntervalMillis: Long = 500L,
    private val maxHandshakeAgeMillis: Long = 180_000L,
    private val clockSkewMillis: Long = 5_000L
) {
    suspend fun verify(startedAtEpochMillis: Long = nowEpochMillis()): WireGuardHandshakeVerification {
        repeat(maxAttempts) { index ->
            val attempt = index + 1
            onAttempt(attempt)
            val now = nowEpochMillis()
            val handshake = transport.latestHandshakeEpochMillis()
            val isFresh = handshake != null &&
                handshake >= startedAtEpochMillis - clockSkewMillis &&
                handshake <= now + clockSkewMillis

            if (transport.isTunnelUp() && isFresh) {
                return WireGuardHandshakeVerification.Verified(handshake!!)
            }

            delayMillis(pollIntervalMillis)
        }

        return WireGuardHandshakeVerification.Failed(
            "WireGuard peer handshake was not verified within ${maxAttempts * pollIntervalMillis / 1000} seconds"
        )
    }

    fun isHealthy(): Boolean {
        val now = nowEpochMillis()
        val handshake = transport.latestHandshakeEpochMillis() ?: return false
        val age = now - handshake
        return transport.isTunnelUp() &&
            handshake > 0L &&
            handshake <= now + clockSkewMillis &&
            age <= maxHandshakeAgeMillis &&
            age >= -clockSkewMillis
    }
}
