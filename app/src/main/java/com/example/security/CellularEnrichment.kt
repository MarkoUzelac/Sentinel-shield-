package com.example.security

import com.example.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Enriches locally observed cell identities with OpenCellID when credentials are configured.
 * No network fallback is treated as local truth; provider failures remain UNAVAILABLE.
 */
class OpenCellIdEnricher(
  private val apiKey: String = BuildConfig.OPEN_CELL_ID_API_KEY,
  private val baseUrl: String = "https://opencellid.org/cell/get",
) {
  suspend fun enrich(observation: SecurityObservation): SecurityObservation = withContext(Dispatchers.IO) {
    if (observation.kind != ObservationKind.CELLULAR || apiKey.isBlank()) return@withContext observation.copy(
      source = if (observation.source == EvidenceSource.LOCAL_ANDROID) observation.source else EvidenceSource.UNAVAILABLE,
      payload = observation.payload + ("enrichment" to "unavailable_api_key"),
    )

    val mcc = observation.payload["mcc"] ?: return@withContext observation.copy(payload = observation.payload + ("enrichment" to "unavailable_mcc"))
    val mnc = observation.payload["mnc"] ?: return@withContext observation.copy(payload = observation.payload + ("enrichment" to "unavailable_mnc"))
    val lac = observation.payload["lac"] ?: observation.payload["tac"] ?: return@withContext observation.copy(payload = observation.payload + ("enrichment" to "unavailable_lac_tac"))
    val cid = observation.payload["cid"] ?: observation.payload["ci"] ?: return@withContext observation.copy(payload = observation.payload + ("enrichment" to "unavailable_cid"))

    runCatching {
      val url = URL("$baseUrl?key=$apiKey&mcc=$mcc&mnc=$mnc&lac=$lac&cellid=$cid&format=json")
      val connection = (url.openConnection() as HttpURLConnection).apply {
        requestMethod = "GET"
        connectTimeout = 8_000
        readTimeout = 8_000
      }
      connection.use {
        if (it.responseCode !in 200..299) error("HTTP ${it.responseCode}")
        val json = JSONObject(it.inputStream.bufferedReader().use { reader -> reader.readText() })
        val enriched = observation.payload.toMutableMap()
        listOf("lat", "lon", "accuracy", "address", "range").forEach { key ->
          if (json.has(key)) enriched["opencellid_$key"] = json.optString(key)
        }
        enriched["enrichment"] = "provider_enriched"
        observation.copy(source = EvidenceSource.PROVIDER_ENRICHED, payload = enriched)
      }
    }.getOrElse { observation.copy(payload = observation.payload + ("enrichment" to "unavailable_provider")) }
  }
}

object CellularIdentityExtractor {
  fun enrichIdentity(observation: SecurityObservation, mcc: String?, mnc: String?, lacTac: String?, cid: String?, pci: String?, radio: String?): SecurityObservation {
    if (observation.kind != ObservationKind.CELLULAR) return observation
    val payload = observation.payload.toMutableMap()
    mcc?.let { payload["mcc"] = it }
    mnc?.let { payload["mnc"] = it }
    lacTac?.let { value -> payload[if (radio.equals("NR", true) || radio.equals("LTE", true)) "tac" else "lac"] = value }
    cid?.let { payload["cid"] = it }
    pci?.let { payload["pci"] = it }
    radio?.let { payload["radio"] = it }
    return observation.copy(payload = payload)
  }
}
