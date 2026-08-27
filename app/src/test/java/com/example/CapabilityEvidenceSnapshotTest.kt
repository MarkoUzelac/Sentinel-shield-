package com.example

import com.example.data.model.CapabilityEvidence
import com.example.data.model.CapabilityEvidenceSnapshot
import com.example.data.model.CapabilityId
import com.example.data.model.CapabilityStatus
import org.junit.Assert.assertEquals
import org.junit.Test

class CapabilityEvidenceSnapshotTest {
    private fun evidence(id: CapabilityId, status: CapabilityStatus = CapabilityStatus.UNVERIFIED) =
        CapabilityEvidence(
            id = id,
            title = id.name,
            status = status,
            source = "test",
            details = "test evidence"
        )

    @Test
    fun statusOf_failsClosedForMissingCapability() {
        val snapshot = CapabilityEvidenceSnapshot.from(listOf(evidence(CapabilityId.VPN_TRANSPORT)))

        assertEquals(CapabilityStatus.UNVERIFIED, snapshot.statusOf(CapabilityId.VPN_TRANSPORT))
        assertEquals(CapabilityStatus.UNAVAILABLE, snapshot.statusOf(CapabilityId.VPN_HANDSHAKE))
    }

    @Test(expected = IllegalArgumentException::class)
    fun duplicateCapabilityIds_areRejected() {
        CapabilityEvidenceSnapshot.from(
            listOf(
                evidence(CapabilityId.VPN_TRANSPORT),
                evidence(CapabilityId.VPN_TRANSPORT, CapabilityStatus.VERIFIED)
            )
        )
    }
}
