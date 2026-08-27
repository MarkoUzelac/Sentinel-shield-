package com.example.data.model

data class VpnServer(
    val id: String,
    val country: String,
    val city: String,
    val flagEmoji: String,
    val pingMs: Int,
    val loadPercentage: Int,
    val ipAddress: String,
    val protocol: String = "WireGuard",
    val port: Int = 51820,
    val isPremium: Boolean = false
)

data class ThreatItem(
    val id: String,
    val title: String,
    val category: String,
    val severity: ThreatSeverity,
    val description: String,
    val recommendation: String,
    val timestamp: Long = System.currentTimeMillis(),
    val isResolved: Boolean = false
)

enum class ThreatSeverity { CRITICAL, HIGH, MEDIUM, LOW, SAFE }

data class BreachRecord(
    val id: String,
    val domain: String,
    val breachDate: String,
    val compromisedFields: List<String>,
    val riskLevel: String,
    val description: String
)

data class JurisdictionInfo(
    val country: String,
    val allianceGroup: String,
    val privacyScore: Int,
    val dataRetentionLaw: String,
    val gdprCompliant: Boolean,
    val summary: String
)

data class NetworkSpeedResult(
    val pingMs: Double,
    val downloadMbps: Double,
    val uploadMbps: Double,
    val jitterMs: Double,
    val wifiSsid: String,
    val securityEncryption: String,
    val isDnsSecure: Boolean,
    val publicIp: String
)
