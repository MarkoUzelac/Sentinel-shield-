package com.example.vpn

/**
 * Executable safety contracts for the observable WireGuard lifecycle.
 * Every state publication must pass these checks before becoming visible.
 */
fun interface WireGuardInvariant {
    fun check(previous: WireGuardTunnelState, next: WireGuardTunnelState)
}

object WireGuardInvariants {
    val connectedRequiresFreshHandshake = WireGuardInvariant { _, next ->
        if (next is WireGuardTunnelState.Connected) {
            check(next.latestHandshakeEpochSeconds > 0L) {
                "SECURITY INVARIANT VIOLATION: CONNECTED requires a verified handshake timestamp"
            }
        }
    }

    val registry: List<WireGuardInvariant> = listOf(
        connectedRequiresFreshHandshake
    )

    fun check(
        previous: WireGuardTunnelState,
        next: WireGuardTunnelState,
        invariants: Iterable<WireGuardInvariant> = registry
    ) {
        invariants.forEach { it.check(previous, next) }
    }
}
