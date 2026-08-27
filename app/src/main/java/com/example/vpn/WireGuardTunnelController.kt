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
import kotlinx.coroutines.withContext

/** Coordinates Android VPN consent, the real WireGuard backend and fail-closed health verification. */
class WireGuardTunnelController(
    private val context: Context,
    private val transport: WireGuardTransport = GoWireGuardTransport(context),
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.Main.immediate),
    private val invariants: List<WireGuardInvariant> = WireGuardInvariants.registry
) {
    private val _state = MutableStateFlow<WireGuardTunnelState>(WireGuardTunnelState.Disconnected)
    val state: StateFlow<WireGuardTunnelState> = _state.asStateFlow()
    private var lifecycleJob: Job? = null

    fun prepare(): Intent? = VpnService.prepare(context)

    fun markAwaitingConsent() {
        lifecycleJob?.cancel()
        transition(WireGuardTunnelState.AwaitingUserConsent)
    }

    fun beginVerification(config: Config) {
        lifecycleJob?.cancel()
        lifecycleJob = scope.launch(Dispatchers.IO) {
            transition(WireGuardTunnelState.Starting)
            when (val result = transport.start(config)) {
                WireGuardTransportResult.Started -> verifyHandshake()
                is WireGuardTransportResult.Failure -> transition(WireGuardTunnelState.Error(result.message))
                WireGuardTransportResult.Stopped -> transition(WireGuardTunnelState.Disconnected)
            }
        }
    }

    private suspend fun verifyHandshake() {
        val verificationStarted = System.currentTimeMillis()
        repeat(20) { index ->
            val attempt = index + 1
            transition(WireGuardTunnelState.Verifying(attempt))
            val handshake = transport.latestHandshakeEpochMillis()
            val isFresh = handshake != null &&
                handshake >= verificationStarted - HANDSHAKE_CLOCK_SKEW_MS &&
                handshake <= System.currentTimeMillis() + HANDSHAKE_CLOCK_SKEW_MS
            if (transport.isTunnelUp() && isFresh) {
                transition(WireGuardTunnelState.Connected(handshake / 1000L))
                monitorTunnelHealth()
                return
            }
            delay(HANDSHAKE_POLL_INTERVAL_MS)
        }
        failClosed("WireGuard peer handshake was not verified within 10 seconds")
    }

    private suspend fun monitorTunnelHealth() {
        while (true) {
            delay(HEALTH_POLL_INTERVAL_MS)
            val handshake = transport.latestHandshakeEpochMillis()
            val now = System.currentTimeMillis()
            val healthy = transport.isTunnelUp() &&
                handshake != null &&
                handshake > 0L &&
                now - handshake <= MAX_HANDSHAKE_AGE_MS
            if (!healthy) {
                failClosed("WireGuard transport or handshake became unhealthy; tunnel was stopped for safety")
                return
            }
            transition(WireGuardTunnelState.Connected(handshake!! / 1000L))
        }
    }

    private fun transition(next: WireGuardTunnelState) {
        val previous = _state.value
        WireGuardInvariants.check(previous, next, invariants)
        _state.value = next
    }

    private fun failClosed(message: String) {
        lifecycleJob?.cancel()
        lifecycleJob = scope.launch(Dispatchers.IO) {
            withContext(kotlinx.coroutines.NonCancellable) {
                transport.stop()
            }
            transition(WireGuardTunnelState.Error(message))
        }
    }

    fun stop() {
        lifecycleJob?.cancel()
        lifecycleJob = scope.launch(Dispatchers.IO) {
            withContext(kotlinx.coroutines.NonCancellable) {
                transport.stop()
            }
            transition(WireGuardTunnelState.Disconnected)
        }
    }

    fun markError(message: String) {
        lifecycleJob?.cancel()
        lifecycleJob = scope.launch(Dispatchers.IO) {
            withContext(kotlinx.coroutines.NonCancellable) {
                transport.stop()
            }
            transition(WireGuardTunnelState.Error(message))
        }
    }

    companion object {
        private const val HANDSHAKE_POLL_INTERVAL_MS = 500L
        private const val HEALTH_POLL_INTERVAL_MS = 5_000L
        private const val MAX_HANDSHAKE_AGE_MS = 180_000L
        private const val HANDSHAKE_CLOCK_SKEW_MS = 5_000L
    }
}
