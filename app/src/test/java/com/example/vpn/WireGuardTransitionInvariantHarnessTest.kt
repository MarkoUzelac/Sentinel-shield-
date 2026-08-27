package com.example.vpn

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class WireGuardTransitionInvariantHarnessTest {
    @Test
    fun `every journaled transition is invariant-safe`() {
        val journal = WireGuardTransitionJournal()
        val states = listOf(
            WireGuardTunnelState.Disconnected,
            WireGuardTunnelState.AwaitingUserConsent,
            WireGuardTunnelState.Starting,
            WireGuardTunnelState.Verifying(1),
            WireGuardTunnelState.Connected(100L),
            WireGuardTunnelState.Error("stale handshake"),
            WireGuardTunnelState.Disconnected
        )

        states.zipWithNext().forEach { (previous, next) ->
            WireGuardInvariants.check(previous, next)
            journal.record(previous, next)
        }

        val records = journal.snapshot()
        assertEquals(states.size - 1, records.size)
        assertTrue(records.all { it.next !is WireGuardTunnelState.Connected || it.next.latestHandshakeEpochSeconds > 0L })
        assertTrue(records.zip(states.zipWithNext()).all { (record, expected) ->
            record.previous == expected.first && record.next == expected.second
        })
    }
}
