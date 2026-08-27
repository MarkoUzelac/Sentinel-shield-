package com.example

import com.example.data.model.CapabilityEvidence
import com.example.data.model.CapabilityEvidenceSnapshot
import com.example.data.model.CapabilityId
import com.example.data.model.CapabilityStatus
import org.junit.Assert.assertEquals
import org.junit.Test

class CapabilityEvidenceFreshnessTest {
    @Test
    fun `verified evidence lazily degrades after expiry`() {
        val evidence = CapabilityEvidence(
            id = CapabilityId.VPN_HANDSHAKE,
            title = "Handshake",
            status = CapabilityStatus.VERIFIED,
            source = "test",
            details = "fresh",
            lastCheckedEpochMs = 1_000L,
            expiresAtEpochMs = 2_000L
        )
        val snapshot = CapabilityEvidenceSnapshot.from(listOf(evidence)) { 2_001L }

        assertEquals(CapabilityStatus.UNVERIFIED, snapshot.statusOf(CapabilityId.VPN_HANDSHAKE))
        assertEquals(CapabilityStatus.UNVERIFIED, snapshot.effective(CapabilityId.VPN_HANDSHAKE)?.status)
    }

    @Test
    fun `unavailable does not become verified through freshness`() {
        val evidence = CapabilityEvidence(
            id = CapabilityId.NETWORK_AUDIT,
            title = "Network",
            status = CapabilityStatus.UNAVAILABLE,
            source = "test",
            details = "no network",
            lastCheckedEpochMs = 1_000L,
            expiresAtEpochMs = 9_000L
        )
        val snapshot = CapabilityEvidenceSnapshot.from(listOf(evidence)) { 1_500L }

        assertEquals(CapabilityStatus.UNAVAILABLE, snapshot.statusOf(CapabilityId.NETWORK_AUDIT))
    }

    @Test
    fun `missing capability fails closed`() {
        val snapshot = CapabilityEvidenceSnapshot.from(emptyList()) { 5_000L }

        assertEquals(CapabilityStatus.UNAVAILABLE, snapshot.statusOf(CapabilityId.RADAR_TELEPHONY))
    }
}
