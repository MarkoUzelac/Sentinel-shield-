package com.example

import com.example.data.model.CallSecurityObservation
import com.example.data.model.CapabilityEvidenceEngine
import com.example.data.model.CapabilityStatus
import com.example.data.model.RadarObservation
import org.junit.Assert.assertEquals
import org.junit.Test

class CapabilityEvidenceEngineTest {
    @Test
    fun vpnHandshake_isVerifiedOnlyWhenConnected() {
        assertEquals(
            CapabilityStatus.UNAVAILABLE,
            CapabilityEvidenceEngine.vpnHandshake(connected = false, handshakeVerified = false).status
        )
        assertEquals(
            CapabilityStatus.VERIFIED,
            CapabilityEvidenceEngine.vpnHandshake(connected = true, handshakeVerified = true).status
        )
    }

    @Test
    fun radar_doesNotClaimImsiCatcherDetection() {
        val evidence = CapabilityEvidenceEngine.radar(
            RadarObservation(permissionGranted = true, cellRecordCount = 4, telephonyAvailable = true)
        )
        assertEquals(CapabilityStatus.UNVERIFIED, evidence.status)
    }

    @Test
    fun callMmi_isUnverifiedUntilOperatorResultIsExplicitlyVerified() {
        assertEquals(
            CapabilityStatus.UNVERIFIED,
            CapabilityEvidenceEngine.callSecurity(CallSecurityObservation(telephonyAvailable = true)).status
        )
        assertEquals(
            CapabilityStatus.VERIFIED,
            CapabilityEvidenceEngine.callSecurity(
                CallSecurityObservation(telephonyAvailable = true, mmiResultVerified = true)
            ).status
        )
    }
}
