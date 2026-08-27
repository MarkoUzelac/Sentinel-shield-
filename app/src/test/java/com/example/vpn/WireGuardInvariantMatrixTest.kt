package com.example.vpn

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFailsWith
import org.junit.Assert.assertTrue
import org.junit.Test

class WireGuardInvariantMatrixTest {
    data class Case(
        val name: String,
        val previous: WireGuardTunnelState,
        val next: WireGuardTunnelState,
        val valid: Boolean
    )

    @Test
    fun `all lifecycle transition cases obey invariant contract`() {
        cases.forEach { case ->
            if (case.valid) {
                WireGuardInvariants.check(case.previous, case.next)
            } else {
                assertFailsWith<IllegalStateException>("case=${case.name}") {
                    WireGuardInvariants.check(case.previous, case.next)
                }
            }
        }
    }

    @Test
    fun `journal records only validated transitions in sequence`() {
        val journal = WireGuardTransitionJournal()
        journal.record(WireGuardTunnelState.Disconnected, WireGuardTunnelState.Starting)
        journal.record(WireGuardTunnelState.Starting, WireGuardTunnelState.Verifying(1))
        journal.record(WireGuardTunnelState.Verifying(1), WireGuardTunnelState.Connected(42L))

        val records = journal.snapshot()
        assertEquals(listOf(1L, 2L, 3L), records.map { it.sequence })
        assertEquals(WireGuardTunnelState.Connected(42L), records.last().next)
        assertTrue(records.zipWithNext().all { (a, b) -> a.next == b.previous })
    }

    companion object {
        private val cases = listOf(
            Case(
                name = "disconnected to awaiting consent",
                previous = WireGuardTunnelState.Disconnected,
                next = WireGuardTunnelState.AwaitingUserConsent,
                valid = true
            ),
            Case(
                name = "consent to starting",
                previous = WireGuardTunnelState.AwaitingUserConsent,
                next = WireGuardTunnelState.Starting,
                valid = true
            ),
            Case(
                name = "starting to verifying",
                previous = WireGuardTunnelState.Starting,
                next = WireGuardTunnelState.Verifying(1),
                valid = true
            ),
            Case(
                name = "verifying to connected with verified handshake",
                previous = WireGuardTunnelState.Verifying(1),
                next = WireGuardTunnelState.Connected(123L),
                valid = true
            ),
            Case(
                name = "verifying to connected without handshake evidence",
                previous = WireGuardTunnelState.Verifying(2),
                next = WireGuardTunnelState.Connected(0L),
                valid = false
            ),
            Case(
                name = "connected to error",
                previous = WireGuardTunnelState.Connected(123L),
                next = WireGuardTunnelState.Error("stale handshake"),
                valid = true
            ),
            Case(
                name = "error to disconnected",
                previous = WireGuardTunnelState.Error("transport failed"),
                next = WireGuardTunnelState.Disconnected,
                valid = true
            )
        )
    }
}
