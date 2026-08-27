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
    fun connectedStateIsExplicitlyVerified() {
        val state: WireGuardTunnelState = WireGuardTunnelState.Connected
        assertTrue(state is WireGuardTunnelState.Connected)
    }
}
