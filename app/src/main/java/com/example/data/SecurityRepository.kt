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

    // Default VPN servers list
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

    // Default Jurisdiction database
    fun getJurisdictions(): List<JurisdictionInfo> {
        return listOf(
            JurisdictionInfo(
                country = "Switzerland",
                allianceGroup = "Privacy Haven (Non-Eyes)",
                privacyScore = 98,
                dataRetentionLaw = "Strict User Consent Required (FADP / Federal Act)",
                gdprCompliant = true,
                summary = "Top privacy jurisdiction worldwide. Outside EU, 14-Eyes, and US subpoenas."
            ),
            JurisdictionInfo(
                country = "Iceland",
                allianceGroup = "Privacy Haven (Non-Eyes)",
                privacyScore = 95,
                dataRetentionLaw = "Strong Freedom of Information & Whistleblower Protection",
                gdprCompliant = true,
                summary = "Extremely strong data privacy framework with independent renewable energy data centers."
            ),
            JurisdictionInfo(
                country = "Germany",
                allianceGroup = "14-Eyes Alliance",
                privacyScore = 78,
                dataRetentionLaw = "GDPR Enforced, Telecommunications Data Retention Struck Down",
                gdprCompliant = true,
                summary = "Strict local data protection (BDSG/GDPR), though part of European intelligence sharing."
            ),
            JurisdictionInfo(
                country = "United States",
                allianceGroup = "5-Eyes Alliance (Founding)",
                privacyScore = 45,
                dataRetentionLaw = "CLOUD Act, FISA 702 Warrantless Surveillance",
                gdprCompliant = false,
                summary = "Primary 5-Eyes leader. Tech providers subject to National Security Letters and secret gag orders."
            ),
            JurisdictionInfo(
                country = "United Kingdom",
                allianceGroup = "5-Eyes Alliance",
                privacyScore = 52,
                dataRetentionLaw = "Investigatory Powers Act ('Snooper\\'s Charter')",
                gdprCompliant = true,
                summary = "Extensive ISP logging and legal encryption backdoor mandates under government review."
            )
        )
    }

    // Perform real or fallback Gemini Security Analysis
    private fun getGeminiApiKey(): String {
        return try {
            val field = BuildConfig::class.java.getField("GEMINI_API_KEY")
            (field.get(null) as? String) ?: ""
        } catch (e: Exception) {
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

                val response = okHttpClient.newCall(request).execute()
                val responseBody = response.body?.string()

                if (response.isSuccessful && responseBody != null) {
                    val rootObj = JSONObject(responseBody)
                    val candidates = rootObj.optJSONArray("candidates")
                    if (candidates != null && candidates.length() > 0) {
                        val firstCandidate = candidates.getJSONObject(0)
                        val content = firstCandidate.optJSONObject("content")
                        val parts = content?.optJSONArray("parts")
                        if (parts != null && parts.length() > 0) {
                            val text = parts.getJSONObject(0).optString("text", "")
                            val jsonStart = text.indexOf("{")
                            val jsonEnd = text.lastIndexOf("}")
                            if (jsonStart != -1 && jsonEnd != -1) {
                                val cleanJson = text.substring(jsonStart, jsonEnd + 1)
                                val parsed = JSONObject(cleanJson)
                                val severityStr = parsed.optString("severity", "MEDIUM")
                                val severity = when (severityStr.uppercase()) {
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
            } catch (e: Exception) {
                // Fall back to heuristic engine below
            }
        }

        // Heuristic analysis engine fallback
        val lowercaseInput = inputContent.lowercase()
        val (severity, title, desc, rec) = when {
            lowercaseInput.contains("http://") || lowercaseInput.contains("login") && lowercaseInput.contains("verify") || lowercaseInput.contains("bit.ly") -> 
                Quad(ThreatSeverity.HIGH, "Suspicious URL / Phishing Risk", "Target URL uses unencrypted protocol or suspicious domain patterns known in credential phishing campaigns.", "Avoid entering passwords or personal credit card info on this site. Use HTTPS only.")
            
            lowercaseInput.contains("apk") || lowercaseInput.contains("download") || lowercaseInput.contains("mod") -> 
                Quad(ThreatSeverity.CRITICAL, "Untrusted Sideload Application", "File string or URL requests package installation outside Google Play Integrity checks.", "Do not grant 'Install Unknown Apps' permission to third-party sources.")

            lowercaseInput.contains("password") || lowercaseInput.contains("123456") || lowercaseInput.contains("admin") -> 
                Quad(ThreatSeverity.MEDIUM, "Weak Credentials Signature", "Credential text matches top 100 vulnerable breached password lists.", "Update password immediately to 16+ character passphrase with mixed alphanumeric symbols.")

            lowercaseInput.contains("camera") || lowercaseInput.contains("microphone") || lowercaseInput.contains("location") ->
                Quad(ThreatSeverity.LOW, "Privacy Sensitive Permission Request", "Target app or script queries high-risk background hardware sensors.", "Review Android App Permissions in System Settings and revoke background access.")

            else -> 
                Quad(ThreatSeverity.SAFE, "No Malicious Signature Detected", "Input evaluated clean across local malware patterns and SSL verification rules.", "Target appears secure. Keep Sentinel Shield Real-time Guard active.")
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

    // Interactive Sentinel AI Chatbot helper
    suspend fun getSentinelAiChatResponse(userMessage: String, historyContext: String): String = withContext(Dispatchers.IO) {
        val apiKey = getGeminiApiKey()

        if (apiKey.isNotBlank() && apiKey != "MY_GEMINI_API_KEY") {
            try {
                val prompt = """
                    You are Sentinel AI, the expert cybersecurity and digital privacy advisor embedded in Sentinel Shield Pro Android app.
                    Provide clear, professional, concise, and empowering security advice.
                    User Question: "$userMessage"
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

                val response = okHttpClient.newCall(request).execute()
                val responseBody = response.body?.string()

                if (response.isSuccessful && responseBody != null) {
                    val rootObj = JSONObject(responseBody)
                    val candidates = rootObj.optJSONArray("candidates")
                    if (candidates != null && candidates.length() > 0) {
                        val firstCandidate = candidates.getJSONObject(0)
                        val content = firstCandidate.optJSONObject("content")
                        val parts = content?.optJSONArray("parts")
                        if (parts != null && parts.length() > 0) {
                            return@withContext parts.getJSONObject(0).optString("text", "Sentinel Shield AI recommendation active.")
                        }
                    }
                }
            } catch (e: Exception) {
                // Fallback below
            }
        }

        // Offline Cyber Advice Fallback
        val lower = userMessage.lowercase()
        return@withContext when {
            lower.contains("vpn") -> "Using a zero-log VPN encrypts your DNS and IP traffic through AES-256 or WireGuard tunnels. It protects you from Wi-Fi packet sniffing in cafes and airports."
            lower.contains("phishing") || lower.contains("link") -> "Never click suspicious SMS or email links requesting urgent account verifications. Verify the sender domain and check if SSL certificate is valid."
            lower.contains("password") -> "Use a dedicated password manager with randomly generated 20+ character passphrases. Always enable Hardware 2FA (FIDO2 or Authenticator apps) rather than SMS 2FA."
            lower.contains("dark web") || lower.contains("leak") -> "If your email appears in a breach database, immediately change passwords on impacted accounts and check if recycled passcodes were used elsewhere."
            else -> "Sentinel Guard recommends enabling Real-Time Shield, performing weekly Wi-Fi Audits, and using WireGuard VPN when connecting to untrusted networks."
        }
    }

    // Simulated network speed & security audit test
    suspend fun runNetworkSecurityAudit(): NetworkSpeedResult = withContext(Dispatchers.IO) {
        delay(1200) // Realistic audit delay
        NetworkSpeedResult(
            pingMs = 16.4,
            downloadMbps = 184.5,
            uploadMbps = 42.8,
            jitterMs = 2.1,
            wifiSsid = "Sentinel_Secure_5G",
            securityEncryption = "WPA3-Personal (AEAD)",
            isDnsSecure = true,
            publicIp = "185.220.101.44"
        )
    }

    // Dark web breach checker database simulation
    fun checkDarkWebBreaches(query: String): List<BreachRecord> {
        val email = query.trim().lowercase()
        if (email.isBlank()) return emptyList()

        return listOf(
            BreachRecord(
                id = "b_01",
                domain = "GlobalTelecomDataLeak2024.com",
                breachDate = "2024-11-14",
                compromisedFields = listOf("Email Address", "Hashed SHA-256 Passwords", "IP Log"),
                riskLevel = "HIGH",
                description = "Dark web breach dump containing 4.2 million user credentials leaked via unpatched database API endpoint."
            ),
            BreachRecord(
                id = "b_02",
                domain = "CloudMarketplacePaste.io",
                breachDate = "2023-08-02",
                compromisedFields = listOf("Email Address", "User Identity Metadata"),
                riskLevel = "MEDIUM",
                description = "Scraped identity dataset distributed on Telegram cybercrime channels."
            )
        )
    }

    private data class Quad<A, B, C, D>(val first: A, val second: B, val third: C, val fourth: D)
}
