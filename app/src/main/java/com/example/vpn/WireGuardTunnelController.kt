package com.example.vpn

import android.content.Context
import android.content.Intent
import android.net.VpnService
import com.wireguard.config.Config
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** Coordinates Android VPN consent, the official WireGuard backend and handshake verification. */
class WireGuardTunnelController(
    private val context: Context,
    private val transport: WireGuardTransport = WireGuardTransport(context),
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.Main.immediate)
) {
    private val _state = MutableStateFlow<WireGuardTunnelState>(WireGuardTunnelState.Disconnected)
    val state: StateFlow<WireGuardTunnelState> = _state.asStateFlow()
    private var verificationJob: Job? = null

    fun prepare(): Intent? = VpnService.prepare(context)

    fun markAwaitingConsent() {
        verificationJob?.cancel()
        _state.value = WireGuardTunnelState.AwaitingUserConsent
    }

    fun beginVerification(config: Config) {
        verificationJob?.cancel()
        verificationJob = scope.launch(Dispatchers.IO) {
            _state.value = WireGuardTunnelState.Starting
            when (val result = transport.start(config)) {
                WireGuardTransportResult.Started -> verifyHandshake()
                is WireGuardTransportResult.Failure -> _state.value = WireGuardTunnelState.Error(result.message)
                WireGuardTransportResult.Stopped -> _state.value = WireGuardTunnelState.Disconnected
            }
        }
    }

    private suspend fun verifyHandshake() {
        for (attempt in 1..20) {
            _state.value = WireGuardTunnelState.Verifying(attempt)
            val handshake = transport.latestHandshakeEpochSeconds()
            if (handshake != null && handshake > 0L) {
                _state.value = WireGuardTunnelState.Connected(handshake)
                return
            }
            delay(500)
        }
        transport.stop()
        _state.value = WireGuardTunnelState.Error("WireGuard peer handshake was not verified")
    }

    fun stop() {
        verificationJob?.cancel()
        verificationJob = scope.launch(Dispatchers.IO) {
            transport.stop()
            _state.value = WireGuardTunnelState.Disconnected
        }
    }

    fun markError(message: String) {
        verificationJob?.cancel()
        _state.value = WireGuardTunnelState.Error(message)
    }
}
