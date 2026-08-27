package com.example.vpn

import org.junit.Assert.assertTrue
import org.junit.Test

class WireGuardTunnelStateTest {
    @Test
    fun defaultStateIsDisconnected() {
        val state: WireGuardTunnelState = WireGuardTunnelState.Disconnected
        assertTrue(state is WireGuardTunnelState.Disconnected)
    }

    @Test
    fun connectedStateCarriesVerifiedHandshakeEvidence() {
        val state: WireGuardTunnelState = WireGuardTunnelState.Connected(1L)
        assertTrue(state is WireGuardTunnelState.Connected)
        assertTrue(state.latestHandshakeEpochSeconds > 0L)
    }
}
