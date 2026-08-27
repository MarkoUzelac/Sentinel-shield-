package com.example.vpn

import java.util.concurrent.atomic.AtomicLong

/** Immutable transition evidence used by diagnostics and invariant-aware tests. */
data class WireGuardTransitionRecord(
    val sequence: Long,
    val previous: WireGuardTunnelState,
    val next: WireGuardTunnelState
)

class WireGuardTransitionJournal {
    private val sequence = AtomicLong(0L)
    private val records = mutableListOf<WireGuardTransitionRecord>()

    @Synchronized
    fun record(
        previous: WireGuardTunnelState,
        next: WireGuardTunnelState
    ): WireGuardTransitionRecord {
        return WireGuardTransitionRecord(
            sequence = sequence.incrementAndGet(),
            previous = previous,
            next = next
        ).also(records::add)
    }

    @Synchronized
    fun snapshot(): List<WireGuardTransitionRecord> = records.toList()
}
