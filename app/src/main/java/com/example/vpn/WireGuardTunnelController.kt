package com.example.vpn

import android.content.Context
import android.content.Intent
import android.net.VpnService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Coordinates Android VPN consent, service lifecycle and fail-closed handshake verification.
 */
class WireGuardTunnelController(
    private val context: Context,
    private val transport: WireGuardTransport = UnprovisionedWireGuardTransport(context),
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

    fun startService() {
        _state.value = WireGuardTunnelState.Starting
        context.startService(Intent(context, SentinelVpnService::class.java).apply {
            action = SentinelVpnService.ACTION_START
        })
    }

    fun beginVerification(config: WireGuardTunnelConfig) {
        verificationJob?.cancel()
        verificationJob = scope.launch {
            _state.value = WireGuardTunnelState.Starting
            when (val result = transport.start(config)) {
                WireGuardTransportResult.Started -> verifyHandshake()
                is WireGuardTransportResult.Failure -> {
                    _state.value = WireGuardTunnelState.Error(result.message)
                }
                WireGuardTransportResult.Stopped -> {
                    _state.value = WireGuardTunnelState.Disconnected
                }
            }
        }
    }

    private suspend fun verifyHandshake() {
        for (attempt in 1..10) {
            _state.value = WireGuardTunnelState.Verifying(attempt)
            val handshake = transport.latestHandshakeEpochSeconds()
            if (handshake != null && handshake > 0L) {
                _state.value = WireGuardTunnelState.Connected(handshake)
                return
            }
            delay(500)
        }
        _state.value = WireGuardTunnelState.Error("WireGuard handshake was not verified within the startup window")
        transport.stop()
    }

    fun markTransportVerified(handshakeEpochSeconds: Long) {
        if (handshakeEpochSeconds > 0L) {
            _state.value = WireGuardTunnelState.Connected(handshakeEpochSeconds)
        } else {
            _state.value = WireGuardTunnelState.Error("Invalid WireGuard handshake timestamp")
        }
    }

    fun stop() {
        verificationJob?.cancel()
        verificationJob = scope.launch {
            transport.stop()
            context.startService(Intent(context, SentinelVpnService::class.java).apply {
                action = SentinelVpnService.ACTION_STOP
            })
            _state.value = WireGuardTunnelState.Disconnected
        }
    }

    fun markError(message: String) {
        verificationJob?.cancel()
        _state.value = WireGuardTunnelState.Error(message)
    }
}
