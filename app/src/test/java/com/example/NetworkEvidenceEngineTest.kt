package com.example

import com.example.data.model.CapabilityEvidenceEngine
import com.example.data.model.CapabilityId
import com.example.data.model.CapabilityStatus
import com.example.data.model.NetworkObservation
import org.junit.Assert.assertEquals
import org.junit.Test

class NetworkEvidenceEngineTest {
    @Test
    fun `available network remains unverified even when validated`() {
        val evidence = CapabilityEvidenceEngine.network(
            NetworkObservation(
                available = true,
                transports = setOf("WIFI"),
                validated = true,
                vpnTransport = false,
                dnsServers = listOf("1.1.1.1"),
                interfaceName = "wlan0"
            )
        )

        assertEquals(CapabilityId.NETWORK_AUDIT, evidence.id)
        assertEquals(CapabilityStatus.UNVERIFIED, evidence.status)
        assertEquals("NetworkCapabilities + LinkProperties", evidence.source)
        assertEquals(true, evidence.provenance?.runtimeBacked)
    }

    @Test
    fun `missing default network fails closed`() {
        val evidence = CapabilityEvidenceEngine.network(NetworkObservation())
        assertEquals(CapabilityStatus.UNAVAILABLE, evidence.status)
    }
}
