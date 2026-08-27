package com.example.vpn

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class WireGuardTransitionJournalTest {
    @Test
    fun `journal sequence is monotonic and chain is contiguous`() {
        val journal = WireGuardTransitionJournal()
        val first = WireGuardTunnelState.Disconnected
        val second = WireGuardTunnelState.Starting
        val third = WireGuardTunnelState.Verifying(1)
        val fourth = WireGuardTunnelState.Connected(10L)

        journal.record(first, second)
        journal.record(second, third)
        journal.record(third, fourth)

        val records = journal.snapshot()
        assertEquals(listOf(1L, 2L, 3L), records.map { it.sequence })
        assertTrue(records.zipWithNext().all { (a, b) -> a.next == b.previous })
    }
}
