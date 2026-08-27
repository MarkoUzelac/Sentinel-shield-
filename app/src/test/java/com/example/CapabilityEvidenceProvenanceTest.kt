package com.example

import com.example.data.model.CallSecurityObservation
import com.example.data.model.CapabilityEvidenceEngine
import com.example.data.model.CapabilityId
import com.example.data.model.CapabilityStatus
import com.example.data.model.RadarObservation
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CapabilityEvidenceProvenanceTest {
    @Test
    fun `verified evidence carries provenance and explicit verification rule`() {
        val evidence = CapabilityEvidenceEngine.callSecurity(
            CallSecurityObservation(telephonyAvailable = true, mmiResultVerified = true)
        )

        assertEquals(CapabilityStatus.VERIFIED, evidence.status)
        assertNotNull(evidence.provenance)
        assertTrue(evidence.provenance!!.runtimeBacked)
        assertTrue(evidence.provenance.verificationRule.isNotBlank())
        assertTrue(evidence.provenance.source.isNotBlank())
    }

    @Test
    fun `radar observation remains unverified even with real cell records`() {
        val evidence = CapabilityEvidenceEngine.radar(
            RadarObservation(permissionGranted = true, cellRecordCount = 3, telephonyAvailable = true)
        )

        assertEquals(CapabilityId.RADAR_TELEPHONY, evidence.id)
        assertEquals(CapabilityStatus.UNVERIFIED, evidence.status)
        assertNotNull(evidence.provenance)
        assertTrue(evidence.provenance!!.runtimeBacked)
    }

    @Test
    fun `local setting never upgrades to verified`() {
        val evidence = CapabilityEvidenceEngine.localSetting(
            CapabilityId.REALTIME_SHIELD,
            "Background shield",
            enabled = true,
            source = "local setting",
            detailsWhenEnabled = "enabled"
        )

        assertEquals(CapabilityStatus.UNVERIFIED, evidence.status)
        assertTrue(evidence.provenance!!.verificationRule.contains("does not prove"))
    }
}
