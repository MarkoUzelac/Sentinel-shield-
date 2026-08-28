package com.example.security

import com.example.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class OpenCellIdEnricher(
  private val apiKey: String = BuildConfig.OPEN_CELL_ID_API_KEY,
  private val baseUrl: String = "https://opencellid.org/cell/get",
) {
  suspend fun enrich(observation: SecurityObservation): SecurityObservation = withContext(Dispatchers.IO) {
    if (observation.kind != ObservationKind.CELLULAR || apiKey.isBlank()) return@withContext observation.copy(
      payload = observation.payload + ("enrichment" to "unavailable_api_key"),
    )

    val mcc = observation.payload["mcc"] ?: return@withContext observation.copy(payload = observation.payload + ("enrichment" to "unavailable_mcc"))
    val mnc = observation.payload["mnc"] ?: return@withContext observation.copy(payload = observation.payload + ("enrichment" to "unavailable_mnc"))
    val lac = observation.payload["lac"] ?: observation.payload["tac"] ?: return@withContext observation.copy(payload = observation.payload + ("enrichment" to "unavailable_lac_tac"))
    val cid = observation.payload["cid"] ?: observation.payload["ci"] ?: observation.payload["nci"] ?: return@withContext observation.copy(payload = observation.payload + ("enrichment" to "unavailable_cid"))

    runCatching {
      val url = URL("$baseUrl?key=$apiKey&mcc=$mcc&mnc=$mnc&lac=$lac&cellid=$cid&format=json")
      val connection = url.openConnection() as HttpURLConnection
      try {
        connection.requestMethod = "GET"
        connection.connectTimeout = 8_000
        connection.readTimeout = 8_000
        if (connection.responseCode !in 200..299) error("HTTP ${connection.responseCode}")
        val body = connection.inputStream.bufferedReader().use { reader -> reader.readText() }
        val json = JSONObject(body)
        val enriched = observation.payload.toMutableMap()
        listOf("lat", "lon", "accuracy", "address", "range").forEach { key ->
          if (json.has(key)) enriched["opencellid_$key"] = json.optString(key)
        }
        enriched["enrichment"] = "provider_enriched"
        observation.copy(source = EvidenceSource.PROVIDER_ENRICHED, payload = enriched)
      } finally {
        connection.disconnect()
      }
    }.getOrElse { observation.copy(payload = observation.payload + ("enrichment" to "unavailable_provider")) }
  }
}
