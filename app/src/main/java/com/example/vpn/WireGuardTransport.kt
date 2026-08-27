package com.example.vpn

import android.content.Context

/**
 * Production transport boundary for the official WireGuard Android userspace backend.
 *
 * This implementation fails closed until a real backend and provisioned peer configuration are
 * supplied. Endpoint reachability alone is never treated as a successful WireGuard handshake.
 */
interface WireGuardTransport {
    suspend fun start(config: WireGuardTunnelConfig): WireGuardTransportResult
    suspend fun stop(): WireGuardTransportResult
    suspend fun latestHandshakeEpochSeconds(): Long?
}

sealed interface WireGuardTransportResult {
    data object Started : WireGuardTransportResult
    data object Stopped : WireGuardTransportResult
    data class Failure(val message: String) : WireGuardTransportResult
}

class UnprovisionedWireGuardTransport(
    @Suppress("UNUSED_PARAMETER") private val context: Context
) : WireGuardTransport {
    override suspend fun start(config: WireGuardTunnelConfig): WireGuardTransportResult =
        if (!config.isComplete()) {
            WireGuardTransportResult.Failure("Incomplete WireGuard peer configuration")
        } else {
            WireGuardTransportResult.Failure(
                "WireGuard backend is not provisioned. Configure the official wg-go backend and a verified peer before enabling CONNECTED state."
            )
        }

    override suspend fun stop(): WireGuardTransportResult = WireGuardTransportResult.Stopped

    override suspend fun latestHandshakeEpochSeconds(): Long? = null
}
