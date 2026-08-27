package com.example.data

import com.example.data.model.CapabilityEvidenceEngine
import com.example.data.model.CapabilityStatus
import com.example.data.model.EvidenceClock
import com.example.data.model.NetworkObservation
import org.junit.Assert.assertEquals
import org.junit.Test

class NetworkObservationFreshnessTest {
    @Test
    fun runtimeNetworkEvidenceExpiresDeterministically() {
        var now = 1_000L
        val clock = EvidenceClock { now }
        val evidence = CapabilityEvidenceEngine.network(
            NetworkObservation(
                available = true,
                transports = setOf("WIFI"),
                validated = true,
                vpnTransport = false,
                dnsServers = listOf("1.1.1.1"),
                interfaceName = "wlan0"
            ),
            clock
        )

        assertEquals(CapabilityStatus.UNVERIFIED, evidence.effectiveStatus(now))
        now = evidence.expiresAtEpochMs
        assertEquals(CapabilityStatus.UNVERIFIED, evidence.effectiveStatus(now))
    }
}
