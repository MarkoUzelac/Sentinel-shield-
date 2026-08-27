package com.example.vpn

import android.content.Context
import android.content.Intent
import android.net.VpnService
import com.wireguard.config.Config
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.NonCancellable
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
    private val invariants: List<WireGuardInvariant> = WireGuardInvariants.registry,
    private val journal: WireGuardTransitionJournal = WireGuardTransitionJournal(),
) {
    private val _state = MutableStateFlow<WireGuardTunnelState>(WireGuardTunnelState.Disconnected)
    val state: StateFlow<WireGuardTunnelState> = _state.asStateFlow()
    private var lifecycleJob: Job? = null

    private val verifier = WireGuardHandshakeVerifier(
        transport = transport,
        onAttempt = { attempt -> transition(WireGuardTunnelState.Verifying(attempt)) }
    )

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
        when (val result = verifier.verify()) {
            is WireGuardHandshakeVerification.Verified -> {
                transition(WireGuardTunnelState.Connected(result.handshakeEpochMillis / 1000L))
                monitorTunnelHealth()
            }
            is WireGuardHandshakeVerification.Failed -> failClosed(result.reason)
        }
    }

    private suspend fun monitorTunnelHealth() {
        while (true) {
            delay(HEALTH_POLL_INTERVAL_MS)
            if (!verifier.isHealthy()) {
                failClosed("WireGuard transport or handshake became unhealthy; tunnel was stopped for safety")
                return
            }
            val handshake = transport.latestHandshakeEpochMillis() ?: run {
                failClosed("WireGuard handshake evidence disappeared; tunnel was stopped for safety")
                return
            }
            transition(WireGuardTunnelState.Connected(handshake / 1000L))
        }
    }

    private fun transition(next: WireGuardTunnelState) {
        val previous = _state.value
        WireGuardInvariants.check(previous, next, invariants)
        journal.record(previous, next)
        _state.value = next
    }

    fun transitionJournal(): List<WireGuardTransitionRecord> = journal.snapshot()

    private fun failClosed(message: String) {
        lifecycleJob?.cancel()
        lifecycleJob = scope.launch(Dispatchers.IO) {
            withContext(NonCancellable) {
                transport.stop()
            }
            transition(WireGuardTunnelState.Error(message))
        }
    }

    fun stop() {
        lifecycleJob?.cancel()
        lifecycleJob = scope.launch(Dispatchers.IO) {
            withContext(NonCancellable) {
                transport.stop()
            }
            transition(WireGuardTunnelState.Disconnected)
        }
    }

    fun markError(message: String) {
        lifecycleJob?.cancel()
        lifecycleJob = scope.launch(Dispatchers.IO) {
            withContext(NonCancellable) {
                transport.stop()
            }
            transition(WireGuardTunnelState.Error(message))
        }
    }

    companion object {
        private const val HEALTH_POLL_INTERVAL_MS = 5_000L
    }
}
