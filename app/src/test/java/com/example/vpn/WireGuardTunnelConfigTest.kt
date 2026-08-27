package com.example.vpn

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class WireGuardTunnelConfigTest {
    @Test
    fun `incomplete config is rejected`() {
        assertFalse(
            WireGuardTunnelConfig(
                interfacePrivateKey = "",
                interfaceAddress = "10.0.0.2/32",
                dnsServer = "1.1.1.1",
                peerPublicKey = "peer",
                peerEndpointHost = "vpn.example.com"
            ).isComplete()
        )
    }

    @Test
    fun `complete config is accepted`() {
        assertTrue(
            WireGuardTunnelConfig(
                interfacePrivateKey = "private-key",
                interfaceAddress = "10.0.0.2/32",
                dnsServer = "1.1.1.1",
                peerPublicKey = "peer-public-key",
                peerEndpointHost = "vpn.example.com"
            ).isComplete()
        )
    }
}
