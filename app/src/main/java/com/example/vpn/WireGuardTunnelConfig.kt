package com.example.vpn

/** Runtime configuration for a real WireGuard peer. */
data class WireGuardTunnelConfig(
    val interfacePrivateKey: String,
    val interfaceAddress: String,
    val dnsServer: String,
    val peerPublicKey: String,
    val peerEndpointHost: String,
    val peerEndpointPort: Int = 51820,
    val allowedIps: List<String> = listOf("0.0.0.0/0", "::/0"),
    val persistentKeepaliveSeconds: Int = 25
) {
    fun isComplete(): Boolean =
        interfacePrivateKey.isNotBlank() &&
            interfaceAddress.isNotBlank() &&
            dnsServer.isNotBlank() &&
            peerPublicKey.isNotBlank() &&
            peerEndpointHost.isNotBlank() &&
            peerEndpointPort in 1..65535 &&
            allowedIps.isNotEmpty() &&
            persistentKeepaliveSeconds in 0..65535
}
