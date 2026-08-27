package com.example.data

import com.example.BuildConfig
import com.example.data.local.ScanLogDao
import com.example.data.local.ScanLogEntity
import com.example.data.model.BreachRecord
import com.example.data.model.JurisdictionInfo
import com.example.data.model.NetworkSpeedResult
import com.example.data.model.ThreatItem
import com.example.data.model.ThreatSeverity
import com.example.data.model.VpnServer
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class SecurityRepository(private val scanLogDao: ScanLogDao) {

    val allLogs: Flow<List<ScanLogEntity>> = scanLogDao.getAllLogs()

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()

    suspend fun saveScanLog(log: ScanLogEntity) {
        scanLogDao.insertLog(log)
    }

    suspend fun clearLogs() {
        scanLogDao.clearAllLogs()
    }

    suspend fun deleteLog(id: Long) {
        scanLogDao.deleteLogById(id)
    }

    /**
     * Server catalog shown in the UI. These are metadata-only nodes until a verified
     * production tunnel configuration is supplied. Do not treat these addresses as live
     * VPN endpoints or as evidence that a WireGuard/OpenVPN server is reachable.
     */
    fun getVpnServers(): List<VpnServer> {
        return listOf(
            VpnServer("ch_01", "Switzerland", "Zurich", "🇨🇭", 18, 22, "185.220.101.5", "WireGuard Pro", isPremium = false),
            VpnServer("is_01", "Iceland", "Reykjavik", "🇮🇸", 24, 19, "185.220.102.8", "WireGuard Pro", isPremium = false),
            VpnServer("de_01", "Germany", "Frankfurt", "🇩🇪", 14, 45, "185.220.103.12", "WireGuard Pro", isPremium = false),
            VpnServer("jp_01", "Japan", "Tokyo", "🇯🇵", 120, 38, "185.220.104.99", "OpenVPN Stealth", isPremium = true),
            VpnServer("us_01", "United States", "New York", "🇺🇸", 85, 62, "198.51.100.42", "WireGuard Pro", isPremium = false),
            VpnServer("sg_01", "Singapore", "Singapore", "🇸🇬", 140, 31, "185.220.105.77", "OpenVPN Stealth", isPremium = true),
            VpnServer("se_01", "Sweden", "Stockholm", "🇸🇪", 29, 28, "185.220.106.3", "WireGuard Pro", isPremium = true)
        )
    }

    fun getJurisdictions(): List<JurisdictionInfo> {
        return listOf(
            JurisdictionInfo("Switzerland", "Privacy Haven (Non-Eyes)", 98, "Strict User Consent Required (FADP / Federal Act)", true, "Top privacy jurisdiction worldwide. Outside EU, 14-Eyes, and US subpoenas."),
            JurisdictionInfo("Iceland", "Privacy Haven (Non-Eyes)", 95, "Strong Freedom of Information & Whistleblower Protection", true, "Extremely strong data privacy framework with independent renewable energy data centers."),
            JurisdictionInfo("Germany", "14-Eyes Alliance", 78, "GDPR Enforced, Telecommunications Data Retention Struck Down", true, "Strict local data protection (BDSG/GDPR), though part of European intelligence sharing."),
            JurisdictionInfo("United States", "5-Eyes Alliance (Founding)", 45, "CLOUD Act, FISA 702 Warrantless Surveillance", false, "Primary 5-Eyes leader. Tech providers subject to National Security Letters and secret gag orders."),
            JurisdictionInfo("United Kingdom", "5-Eyes Alliance", 52, "Investigatory Powers Act ('Snooper\\'s Charter')", true, "Extensive ISP logging and legal encryption backdoor mandates under government review.")
        )
    }

    private fun getGeminiApiKey(): String {
        return try {
            val field = BuildConfig::class.java.getField("GEMINI_API_KEY")
            (field.get(null) as? String) ?: ""
        } catch (_: Exception) {
            ""
        }
    }

    suspend fun analyzeSecurityThreatWithAi(inputContent: String, scanCategory: String): ThreatItem = withContext(Dispatchers.IO) {
        val apiKey = getGeminiApiKey()

        if (apiKey.isNotBlank() && apiKey != "MY_GEMINI_API_KEY") {
            try {
                val prompt = """
                    You are Sentinel Shield Pro AI Security Engine. Analyze the following target input for cyber threats, phishing attempts, malware signatures, or privacy risks.
                    Input: "$inputContent"
                    Category: $scanCategory

                    Respond strictly in valid JSON format:
                    {
                      "title": "Short Threat Title",
                      "category": "$scanCategory",
                      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "SAFE",
                      "description": "Detailed technical analysis summary",
                      "recommendation": "Step-by-step action to secure user data"
                    }
                """.trimIndent()

                val url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$apiKey"
                val jsonPayload = JSONObject().apply {
                    put("contents", JSONArray().apply {
                        put(JSONObject().apply {
                            put("parts", JSONArray().apply {
                                put(JSONObject().put("text", prompt))
                            })
                        })
                    })
                }

                val request = Request.Builder()
                    .url(url)
                    .post(jsonPayload.toString().toRequestBody("application/json".toMediaType()))
                    .build()

                okHttpClient.newCall(request).execute().use { response ->
                    val responseBody = response.body?.string()
                    if (response.isSuccessful && responseBody != null) {
                        val rootObj = JSONObject(responseBody)
                        val candidates = rootObj.optJSONArray("candidates")
                        if (candidates != null && candidates.length() > 0) {
                            val parts = candidates.getJSONObject(0)
                                .optJSONObject("content")
                                ?.optJSONArray("parts")
                            if (parts != null && parts.length() > 0) {
                                val text = parts.getJSONObject(0).optString("text", "")
                                val jsonStart = text.indexOf("{")
                                val jsonEnd = text.lastIndexOf("}")
                                if (jsonStart != -1 && jsonEnd > jsonStart) {
                                    val parsed = JSONObject(text.substring(jsonStart, jsonEnd + 1))
                                    val severity = when (parsed.optString("severity", "MEDIUM").uppercase()) {
                                        "CRITICAL" -> ThreatSeverity.CRITICAL
                                        "HIGH" -> ThreatSeverity.HIGH
                                        "MEDIUM" -> ThreatSeverity.MEDIUM
                                        "LOW" -> ThreatSeverity.LOW
                                        else -> ThreatSeverity.SAFE
                                    }
                                    return@withContext ThreatItem(
                                        id = "ai_${System.currentTimeMillis()}",
                                        title = parsed.optString("title", "AI Threat Audit"),
                                        category = scanCategory,
                                        severity = severity,
                                        description = parsed.optString("description", "Analyzed target input for security anomalies."),
                                        recommendation = parsed.optString("recommendation", "Maintain software updates and enable 2FA.")
                                    )
                                }
                            }
                        }
                    }
                }
            } catch (_: Exception) {
                // Fall back to local heuristic analysis.
            }
        }

        val lowercaseInput = inputContent.lowercase()
        val (severity, title, desc, rec) = when {
            lowercaseInput.contains("http://") || (lowercaseInput.contains("login") && lowercaseInput.contains("verify")) || lowercaseInput.contains("bit.ly") ->
                Quad(ThreatSeverity.HIGH, "Suspicious URL / Phishing Risk", "Target uses an unencrypted protocol or suspicious URL patterns.", "Avoid entering passwords or payment information. Prefer verified HTTPS domains.")
            lowercaseInput.contains("apk") || lowercaseInput.contains("download") || lowercaseInput.contains("mod") ->
                Quad(ThreatSeverity.CRITICAL, "Untrusted Sideload Application", "Input suggests installation from a third-party package source.", "Do not grant install-from-unknown-sources access unless you explicitly trust the source.")
            lowercaseInput.contains("password") || lowercaseInput.contains("123456") || lowercaseInput.contains("admin") ->
                Quad(ThreatSeverity.MEDIUM, "Weak Credentials Signature", "Input contains a weak or commonly targeted credential pattern.", "Use a unique long password and enable phishing-resistant MFA where possible.")
            lowercaseInput.contains("camera") || lowercaseInput.contains("microphone") || lowercaseInput.contains("location") ->
                Quad(ThreatSeverity.LOW, "Privacy Sensitive Permission Request", "Input references sensitive hardware or location access.", "Review Android permissions and revoke access not required for the feature.")
            else ->
                Quad(ThreatSeverity.SAFE, "No Local Malicious Signature Detected", "No matching local heuristic signature was found.", "A clean heuristic result is not proof that a target is completely safe.")
        }

        ThreatItem(
            id = "ai_${System.currentTimeMillis()}",
            title = title,
            category = scanCategory,
            severity = severity,
            description = desc,
            recommendation = rec
        )
    }

    suspend fun getSentinelAiChatResponse(userMessage: String, historyContext: String): String = withContext(Dispatchers.IO) {
        val apiKey = getGeminiApiKey()
        if (apiKey.isNotBlank() && apiKey != "MY_GEMINI_API_KEY") {
            try {
                val prompt = """
                    You are Sentinel AI, the expert cybersecurity and digital privacy advisor embedded in Sentinel Shield Pro Android app.
                    Provide clear, professional, concise, and empowering security advice.
                    User Question: "$userMessage"
                    Conversation context: "$historyContext"
                """.trimIndent()

                val url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$apiKey"
                val jsonPayload = JSONObject().apply {
                    put("contents", JSONArray().apply {
                        put(JSONObject().apply {
                            put("parts", JSONArray().apply { put(JSONObject().put("text", prompt)) })
                        })
                    })
                }

                val request = Request.Builder()
                    .url(url)
                    .post(jsonPayload.toString().toRequestBody("application/json".toMediaType()))
                    .build()

                okHttpClient.newCall(request).execute().use { response ->
                    val responseBody = response.body?.string()
                    if (response.isSuccessful && responseBody != null) {
                        val candidates = JSONObject(responseBody).optJSONArray("candidates")
                        val parts = candidates?.optJSONObject(0)?.optJSONObject("content")?.optJSONArray("parts")
                        if (parts != null && parts.length() > 0) {
                            return@withContext parts.getJSONObject(0).optString("text", "Sentinel Shield AI recommendation active.")
                        }
                    }
                }
            } catch (_: Exception) {
                // Fall back to offline advice below.
            }
        }

        val lower = userMessage.lowercase()
        return@withContext when {
            lower.contains("vpn") -> "A VPN can protect traffic from local network observers, but only a verified encrypted tunnel endpoint should be considered active protection."
            lower.contains("phishing") || lower.contains("link") -> "Do not follow suspicious links requesting urgent verification. Check the domain independently and avoid submitting credentials to untrusted pages."
            lower.contains("password") -> "Use a unique long password and a password manager. Prefer passkeys or phishing-resistant MFA for important accounts."
            lower.contains("dark web") || lower.contains("leak") -> "A breach result must come from a verified breach-data source. If exposure is confirmed, rotate affected credentials and enable MFA."
            else -> "Sentinel Guard recommends keeping Android updated, minimizing permissions, using HTTPS, and treating simulated security results as diagnostics rather than proof."
        }
    }

    /** Deterministic demo data retained for UI development; not a live network measurement. */
    suspend fun runNetworkSecurityAudit(): NetworkSpeedResult = withContext(Dispatchers.IO) {
        delay(1200)
        NetworkSpeedResult(
            pingMs = 16.4,
            downloadMbps = 184.5,
            uploadMbps = 42.8,
            jitterMs = 2.1,
            wifiSsid = "DEMO_NETWORK",
            securityEncryption = "WPA3-Personal (SIMULATED)",
            isDnsSecure = true,
            publicIp = "UNVERIFIED"
        )
    }

    /** Deterministic demo records retained for UI development; not a live dark-web query. */
    fun checkDarkWebBreaches(query: String): List<BreachRecord> {
        if (query.trim().isBlank()) return emptyList()
        return listOf(
            BreachRecord(
                id = "demo_01",
                domain = "DEMO_RECORD — NOT VERIFIED",
                breachDate = "N/A",
                compromisedFields = listOf("Demo Data"),
                riskLevel = "UNVERIFIED",
                description = "This result is synthetic test data. No live dark-web or breach feed was queried."
            )
        )
    }

    fun searchBreachData(query: String): List<BreachRecord> = checkDarkWebBreaches(query)

    private data class Quad<A, B, C, D>(val first: A, val second: B, val third: C, val fourth: D)
}
