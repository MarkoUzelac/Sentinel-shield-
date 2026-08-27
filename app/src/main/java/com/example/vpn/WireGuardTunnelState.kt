package com.example.vpn

/**
 * Observable VPN lifecycle state. CONNECTED must only be emitted after the transport
 * implementation has started successfully and the platform reports an established tunnel.
 */
sealed interface WireGuardTunnelState {
    data object Disconnected : WireGuardTunnelState
    data object AwaitingUserConsent : WireGuardTunnelState
    data object Starting : WireGuardTunnelState
    data object Connected : WireGuardTunnelState
    data class Error(val message: String) : WireGuardTunnelState
}
