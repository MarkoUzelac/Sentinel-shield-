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

    suspend fun saveScanLog(log: ScanLogEntity) = scanLogDao.insertLog(log)
    suspend fun clearLogs() = scanLogDao.clearAllLogs()
    suspend fun deleteLog(id: Long) = scanLogDao.deleteLogById(id)

    /** Metadata catalog only. A real endpoint must be provisioned before a tunnel can connect. */
    fun getVpnServers(): List<VpnServer> = listOf(
        VpnServer("ch_01", "Switzerland", "Zurich", "🇨🇭", 0, 0, "", "WireGuard", 51820, false),
        VpnServer("is_01", "Iceland", "Reykjavik", "🇮🇸", 0, 0, "", "WireGuard", 51820, false),
        VpnServer("de_01", "Germany", "Frankfurt", "🇩🇪", 0, 0, "", "WireGuard", 51820, false),
        VpnServer("jp_01", "Japan", "Tokyo", "🇯🇵", 0, 0, "", "WireGuard", 51820, true),
        VpnServer("us_01", "United States", "New York", "🇺🇸", 0, 0, "", "WireGuard", 51820, false),
        VpnServer("sg_01", "Singapore", "Singapore", "🇸🇬", 0, 0, "", "WireGuard", 51820, true),
        VpnServer("se_01", "Sweden", "Stockholm", "🇸🇪", 0, 0, "", "WireGuard", 51820, true)
    )

    fun getJurisdictions(): List<JurisdictionInfo> = listOf(
        JurisdictionInfo("Switzerland", "Privacy Haven (Non-Eyes)", 98, "FADP / Federal Act", true, "Privacy-focused jurisdiction."),
        JurisdictionInfo("Iceland", "Privacy Haven (Non-Eyes)", 95, "Strong privacy framework", true, "Strong data protection framework."),
        JurisdictionInfo("Germany", "14-Eyes Alliance", 78, "GDPR / BDSG", true, "EU data protection framework applies."),
        JurisdictionInfo("United States", "5-Eyes Alliance (Founding)", 45, "CLOUD Act / FISA", false, "US surveillance and disclosure laws may apply."),
        JurisdictionInfo("United Kingdom", "5-Eyes Alliance", 52, "Investigatory Powers Act", true, "Broad lawful-access framework.")
    )

    private fun getGeminiApiKey(): String = runCatching {
        BuildConfig::class.java.getField("GEMINI_API_KEY").get(null) as? String ?: ""
    }.getOrDefault("")

    suspend fun analyzeSecurityThreatWithAi(inputContent: String, scanCategory: String): ThreatItem = withContext(Dispatchers.IO) {
        val apiKey = getGeminiApiKey()
        if (apiKey.isNotBlank() && apiKey != "MY_GEMINI_API_KEY") {
            try {
                val prompt = "Analyze the target for cyber threats, phishing or privacy risks. Target: \"$inputContent\" Category: \"$scanCategory\" Return strict JSON with title, severity, description and recommendation."
                val payload = JSONObject().apply {
                    put("contents", JSONArray().put(JSONObject().put("parts", JSONArray().put(JSONObject().put("text", prompt)))))
                }
                val request = Request.Builder()
                    .url("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$apiKey")
                    .post(payload.toString().toRequestBody("application/json".toMediaType()))
                    .build()
                okHttpClient.newCall(request).execute().use { response ->
                    val body = response.body?.string()
                    if (response.isSuccessful && body != null) {
                        val parts = JSONObject(body).optJSONArray("candidates")?.optJSONObject(0)?.optJSONObject("content")?.optJSONArray("parts")
                        val text = parts?.optJSONObject(0)?.optString("text", "") ?: ""
                        val start = text.indexOf('{')
                        val end = text.lastIndexOf('}')
                        if (start >= 0 && end > start) {
                            val parsed = JSONObject(text.substring(start, end + 1))
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
                                description = parsed.optString("description", "Analysis completed."),
                                recommendation = parsed.optString("recommendation", "Review the target and apply least-privilege security controls.")
                            )
                        }
                    }
                }
            } catch (_: Exception) {
                // Continue with local heuristic fallback.
            }
        }

        val lower = inputContent.lowercase()
        val quad = when {
            "http://" in lower || ("login" in lower && "verify" in lower) || "bit.ly" in lower -> Quad(ThreatSeverity.HIGH, "Suspicious URL / Phishing Risk", "The input matches common phishing indicators.", "Do not submit credentials or payment information.")
            "apk" in lower || "download" in lower || "mod" in lower -> Quad(ThreatSeverity.CRITICAL, "Untrusted Sideload Application", "The input suggests installation from a third-party package source.", "Install apps only from trusted sources and verify signatures.")
            "password" in lower || "123456" in lower || "admin" in lower -> Quad(ThreatSeverity.MEDIUM, "Weak Credential Pattern", "The input contains a commonly targeted credential pattern.", "Use a unique long password and phishing-resistant MFA.")
            "camera" in lower || "microphone" in lower || "location" in lower -> Quad(ThreatSeverity.LOW, "Privacy-Sensitive Permission", "The input references sensitive device permissions.", "Review whether the permission is required and minimize access.")
            else -> Quad(ThreatSeverity.SAFE, "No Local Signature Matched", "No known local heuristic signature matched this input.", "A clean heuristic result is not proof of safety.")
        }
        ThreatItem("ai_${System.currentTimeMillis()}", quad.second, scanCategory, quad.first, quad.third, quad.fourth)
    }

    suspend fun getSentinelAiChatResponse(userMessage: String, historyContext: String): String = withContext(Dispatchers.IO) {
        val apiKey = getGeminiApiKey()
        if (apiKey.isNotBlank() && apiKey != "MY_GEMINI_API_KEY") {
            try {
                val prompt = "You are a cybersecurity advisor. User: $userMessage Context: $historyContext"
                val payload = JSONObject().apply {
                    put("contents", JSONArray().put(JSONObject().put("parts", JSONArray().put(JSONObject().put("text", prompt)))))
                }
                val request = Request.Builder()
                    .url("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$apiKey")
                    .post(payload.toString().toRequestBody("application/json".toMediaType()))
                    .build()
                okHttpClient.newCall(request).execute().use { response ->
                    val body = response.body?.string()
                    val parts = body?.let { JSONObject(it).optJSONArray("candidates")?.optJSONObject(0)?.optJSONObject("content")?.optJSONArray("parts") }
                    val text = parts?.optJSONObject(0)?.optString("text")
                    if (!text.isNullOrBlank()) return@withContext text
                }
            } catch (_: Exception) { }
        }
        val lower = userMessage.lowercase()
        return@withContext when {
            "vpn" in lower -> "A VPN protects traffic only when a real, verified encrypted tunnel is established."
            "phishing" in lower || "link" in lower -> "Do not submit credentials through suspicious links; independently verify the domain."
            "password" in lower -> "Use unique long passwords and phishing-resistant MFA."
            "dark web" in lower || "leak" in lower -> "Treat breach results as verified only when sourced from a trusted breach-data provider."
            else -> "Keep Android updated, minimize permissions and treat simulated diagnostics as non-verifying."
        }
    }

    /** Demo diagnostic fixture; intentionally not presented as a live network measurement. */
    suspend fun runNetworkSecurityAudit(): NetworkSpeedResult = withContext(Dispatchers.IO) {
        delay(300)
        NetworkSpeedResult(0.0, 0.0, 0.0, 0.0, "UNVERIFIED_NETWORK", "UNVERIFIED", false, "UNVERIFIED")
    }

    /** Demo-only records; no live breach feed is queried. */
    fun checkDarkWebBreaches(query: String): List<BreachRecord> = if (query.trim().isBlank()) emptyList() else listOf(
        BreachRecord("demo_01", "DEMO_RECORD", "N/A", listOf("Demo Data"), "UNVERIFIED", "Synthetic test data only; no live breach source was queried.")
    )

    fun searchBreachData(query: String): List<BreachRecord> = checkDarkWebBreaches(query)

    private data class Quad<A, B, C, D>(val first: A, val second: B, val third: C, val fourth: D)
}
