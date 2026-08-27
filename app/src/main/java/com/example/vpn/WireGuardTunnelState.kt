package com.example.vpn

/**
 * Observable VPN lifecycle state.
 * CONNECTED is reserved for a verified WireGuard transport handshake.
 */
sealed interface WireGuardTunnelState {
    data object Disconnected : WireGuardTunnelState
    data object AwaitingUserConsent : WireGuardTunnelState
    data object Starting : WireGuardTunnelState
    data class Verifying(val attempt: Int) : WireGuardTunnelState
    data class Connected(val latestHandshakeEpochSeconds: Long) : WireGuardTunnelState
    data class Error(val message: String) : WireGuardTunnelState
}
