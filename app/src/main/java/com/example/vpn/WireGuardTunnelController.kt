package com.example.vpn

import android.content.Context
import android.content.Intent
import android.net.VpnService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Coordinates Android VPN consent and the service lifecycle.
 *
 * Connected is intentionally never synthesized from a local boolean. The transport layer must
 * call markTransportVerified only after a real WireGuard handshake/health check succeeds.
 */
class WireGuardTunnelController(private val context: Context) {
    private val _state = MutableStateFlow<WireGuardTunnelState>(WireGuardTunnelState.Disconnected)
    val state: StateFlow<WireGuardTunnelState> = _state.asStateFlow()

    fun prepare(): Intent? = VpnService.prepare(context)

    fun markAwaitingConsent() {
        _state.value = WireGuardTunnelState.AwaitingUserConsent
    }

    fun startService() {
        _state.value = WireGuardTunnelState.Starting
        val intent = Intent(context, SentinelVpnService::class.java).apply {
            action = SentinelVpnService.ACTION_START
        }
        context.startService(intent)
    }

    fun markTransportVerified() {
        _state.value = WireGuardTunnelState.Connected
    }

    fun stop() {
        context.startService(Intent(context, SentinelVpnService::class.java).apply {
            action = SentinelVpnService.ACTION_STOP
        })
        _state.value = WireGuardTunnelState.Disconnected
    }

    fun markError(message: String) {
        _state.value = WireGuardTunnelState.Error(message)
    }
}
