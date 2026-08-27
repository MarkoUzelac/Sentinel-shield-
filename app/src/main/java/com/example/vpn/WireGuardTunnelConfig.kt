package com.example.vpn

/**
 * Runtime configuration required by a real WireGuard backend.
 * No private key is stored in the repository; provisioning must inject it securely at runtime.
 */
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
            peerPublicKey.isNotBlank() &&
            peerEndpointHost.isNotBlank() &&
            peerEndpointPort in 1..65535
}
