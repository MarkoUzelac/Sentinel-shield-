package com.example.vpn

import org.junit.Assert.assertFailsWith
import org.junit.Assert.assertTrue
import org.junit.Test

class WireGuardInvariantTest {
    @Test
    fun `connected with positive handshake timestamp is allowed`() {
        WireGuardInvariants.check(
            previous = WireGuardTunnelState.Verifying(1),
            next = WireGuardTunnelState.Connected(123L)
        )
    }

    @Test
    fun `connected with missing handshake timestamp is rejected`() {
        val error = assertFailsWith<IllegalStateException> {
            WireGuardInvariants.check(
                previous = WireGuardTunnelState.Verifying(1),
                next = WireGuardTunnelState.Connected(0L)
            )
        }
        assertTrue(error.message!!.contains("CONNECTED"))
        assertTrue(error.message!!.contains("handshake"))
    }
}
