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
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URLEncoder
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

    private fun getHibpApiKey(): String = runCatching {
        BuildConfig::class.java.getField("HIBP_API_KEY").get(null) as? String ?: ""
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
                // Fall through to the local non-authoritative heuristic.
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
            } catch (_: Exception) {
                // Use safe local guidance below.
            }
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

    suspend fun runNetworkSecurityAudit(): NetworkSpeedResult = withContext(Dispatchers.IO) {
        val probeUrl = "https://www.google.com/generate_204"
        val startNanos = System.nanoTime()
        val request = Request.Builder()
            .url(probeUrl)
            .get()
            .header("Cache-Control", "no-cache")
            .build()

        val result = runCatching {
            okHttpClient.newCall(request).execute().use { response ->
                if (!response.isSuccessful && response.code != 204) {
                    error("HTTPS probe failed with HTTP ${response.code}")
                }
                val latencyMs = (System.nanoTime() - startNanos) / 1_000_000.0
                latencyMs to response.handshake?.tlsVersion?.javaName
            }
        }

        result.fold(
            onSuccess = { (latencyMs, tlsVersion) ->
                NetworkSpeedResult(
                    pingMs = latencyMs,
                    downloadMbps = 0.0,
                    uploadMbps = 0.0,
                    jitterMs = 0.0,
                    wifiSsid = "NOT_COLLECTED",
                    securityEncryption = tlsVersion ?: "TLS",
                    isDnsSecure = false,
                    publicIp = "NOT_COLLECTED"
                )
            },
            onFailure = {
                NetworkSpeedResult(
                    pingMs = -1.0,
                    downloadMbps = 0.0,
                    uploadMbps = 0.0,
                    jitterMs = 0.0,
                    wifiSsid = "UNAVAILABLE",
                    securityEncryption = "UNVERIFIED",
                    isDnsSecure = false,
                    publicIp = "UNAVAILABLE"
                )
            }
        )
    }

    fun checkDarkWebBreaches(query: String): List<BreachRecord> {
        val account = query.trim()
        val apiKey = getHibpApiKey()
        if (account.isBlank() || apiKey.isBlank() || apiKey == "MY_HIBP_API_KEY") return emptyList()

        val encoded = URLEncoder.encode(account, Charsets.UTF_8.name())
        val request = Request.Builder()
            .url("https://haveibeenpwned.com/api/v3/breachedaccount/$encoded?truncateResponse=false")
            .header("hibp-api-key", apiKey)
            .header("user-agent", "Sentinel-Shield/${BuildConfig.VERSION_NAME}")
            .get()
            .build()

        return runCatching {
            okHttpClient.newCall(request).execute().use { response ->
                when {
                    response.code == HttpURLConnection.HTTP_NOT_FOUND -> emptyList()
                    response.code == HttpURLConnection.HTTP_UNAUTHORIZED || response.code == HttpURLConnection.HTTP_FORBIDDEN -> emptyList()
                    !response.isSuccessful -> emptyList()
                    else -> {
                        val records = JSONArray(response.body?.string().orEmpty())
                        buildList {
                            for (index in 0 until records.length()) {
                                val breach = records.optJSONObject(index) ?: continue
                                val dataClasses = breach.optJSONArray("DataClasses")?.let { array ->
                                    buildList {
                                        for (dataIndex in 0 until array.length()) {
                                            add(array.optString(dataIndex))
                                        }
                                    }
                                }.orEmpty()
                                add(
                                    BreachRecord(
                                        id = "hibp_${breach.optString("Name", index.toString())}",
                                        domain = breach.optString("Domain", "N/A"),
                                        breachDate = breach.optString("BreachDate", "N/A"),
                                        compromisedFields = dataClasses,
                                        riskLevel = riskFor(dataClasses),
                                        description = breach.optString("Title", "Have I Been Pwned breach record")
                                    )
                                )
                            }
                        }
                    }
                }
            }
        }.getOrDefault(emptyList())
    }

    fun searchBreachData(query: String): List<BreachRecord> = checkDarkWebBreaches(query)

    private fun riskFor(fields: List<String>): String {
        val sensitive = fields.any {
            val normalized = it.lowercase()
            normalized.contains("password") ||
                normalized.contains("credit") ||
                normalized.contains("authentication") ||
                normalized.contains("social")
        }
        return when {
            sensitive -> "HIGH"
            fields.isNotEmpty() -> "MEDIUM"
            else -> "LOW"
        }
    }

    private data class Quad<A, B, C, D>(val first: A, val second: B, val third: C, val fourth: D)
}
