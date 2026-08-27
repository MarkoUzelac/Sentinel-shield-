package com.example.vpn

import android.content.Context
import com.wireguard.android.backend.GoBackend
import com.wireguard.android.backend.Statistics
import com.wireguard.android.backend.Tunnel
import com.wireguard.config.Config

sealed interface WireGuardTransportResult {
    data object Started : WireGuardTransportResult
    data object Stopped : WireGuardTransportResult
    data class Failure(val message: String) : WireGuardTransportResult
}

interface WireGuardTransport {
    fun start(config: Config): WireGuardTransportResult
    fun stop(): WireGuardTransportResult
    fun isTunnelUp(): Boolean
    fun latestHandshakeEpochMillis(): Long?
}

/** Production transport backed by the official WireGuard Android GoBackend/wireguard-go stack. */
class GoWireGuardTransport(context: Context) : WireGuardTransport {
    private val backend = GoBackend(context.applicationContext)
    private val tunnel = SentinelWireGuardTunnel()
    private var activeConfig: Config? = null
    private var startedAtEpochMillis: Long = 0L

    override fun start(config: Config): WireGuardTransportResult = runCatching {
        require(config.getPeers().isNotEmpty()) { "WireGuard profile has no peer" }
        val state = backend.setState(tunnel, Tunnel.State.UP, config)
        check(state == Tunnel.State.UP) { "WireGuard backend did not enter UP state" }
        activeConfig = config
        startedAtEpochMillis = System.currentTimeMillis()
        WireGuardTransportResult.Started
    }.getOrElse { error ->
        activeConfig = null
        startedAtEpochMillis = 0L
        WireGuardTransportResult.Failure(error.message ?: "WireGuard backend startup failed")
    }

    override fun stop(): WireGuardTransportResult = runCatching {
        if (backend.getState(tunnel) == Tunnel.State.UP) {
            backend.setState(tunnel, Tunnel.State.DOWN, null)
        }
        activeConfig = null
        startedAtEpochMillis = 0L
        WireGuardTransportResult.Stopped
    }.getOrElse { error ->
        WireGuardTransportResult.Failure(error.message ?: "WireGuard backend shutdown failed")
    }

    override fun isTunnelUp(): Boolean = runCatching {
        backend.getState(tunnel) == Tunnel.State.UP
    }.getOrDefault(false)

    override fun latestHandshakeEpochMillis(): Long? {
        val config = activeConfig ?: return null
        val peerKey = config.getPeers().firstOrNull()?.publicKey ?: return null
        val stats: Statistics = backend.getStatistics(tunnel)
        val peerStats = stats.peer(peerKey) ?: return null
        val handshakeMillis = peerStats.latestHandshakeEpochMillis()
        if (handshakeMillis <= 0L || handshakeMillis < startedAtEpochMillis) return null
        return handshakeMillis
    }

    fun backendVersion(): String = runCatching { backend.version }.getOrDefault("unknown")

    private class SentinelWireGuardTunnel : Tunnel {
        override fun getName(): String = "sentinel"
        override fun onStateChange(newState: Tunnel.State) = Unit
    }
}
