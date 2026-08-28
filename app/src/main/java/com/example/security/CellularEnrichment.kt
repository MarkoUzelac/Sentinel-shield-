package com.example.security

import com.example.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/** Provider enrichment only; failures never become local truth. */
class OpenCellIdEnricher(
  private val apiKey: String = BuildConfig.OPEN_CELL_ID_API_KEY,
  private val baseUrl: String = "https://opencellid.org/cell/get",
) {
  suspend fun enrich(observation: SecurityObservation): SecurityObservation = withContext(Dispatchers.IO) {
    if (observation.kind != ObservationKind.CELLULAR) return@withContext observation
    if (apiKey.isBlank()) return@withContext observation.copy(
      payload = observation.payload + ("enrichment" to "unavailable_api_key"),
    )

    val mcc = observation.payload["mcc"]
    val mnc = observation.payload["mnc"]
    val area = observation.payload["lac"] ?: observation.payload["tac"]
    val cellId = observation.payload["cid"] ?: observation.payload["ci"] ?: observation.payload["nci"]
    if (listOf(mcc, mnc, area, cellId).any { it.isNullOrBlank() }) {
      return@withContext observation.copy(
        payload = observation.payload + ("enrichment" to "unavailable_identity"),
      )
    }

    runCatching {
      val url = URL("$baseUrl?key=$apiKey&mcc=$mcc&mnc=$mnc&lac=$area&cellid=$cellId&format=json")
      val connection = (url.openConnection() as HttpURLConnection).apply {
        requestMethod = "GET"
        connectTimeout = 8_000
        readTimeout = 8_000
      }
      connection.use {
        if (it.responseCode !in 200..299) error("HTTP ${it.responseCode}")
        val json = JSONObject(it.inputStream.bufferedReader().use { reader -> reader.readText() })
        val enriched = observation.payload.toMutableMap()
        json.optString("lat").takeIf(String::isNotBlank)?.let { enriched["opencellid_lat"] = it }
        json.optString("lon").takeIf(String::isNotBlank)?.let { enriched["opencellid_lon"] = it }
        json.optString("accuracy").takeIf(String::isNotBlank)?.let { enriched["opencellid_accuracy"] = it }
        json.optString("range").takeIf(String::isNotBlank)?.let { enriched["opencellid_range"] = it }
        json.optString("address").takeIf(String::isNotBlank)?.let { enriched["opencellid_address"] = it }
        enriched["enrichment"] = "provider_enriched"
        observation.copy(source = EvidenceSource.PROVIDER_ENRICHED, payload = enriched)
      }
    }.getOrElse { error ->
      observation.copy(
        payload = observation.payload + (
          "enrichment" to "unavailable_provider:${error::class.simpleName.orEmpty()}"
        ),
      )
    }
  }
}

object CellularIdentityExtractor {
  fun enrichIdentity(
    observation: SecurityObservation,
    identity: CellularIdentity,
  ): SecurityObservation {
    if (observation.kind != ObservationKind.CELLULAR) return observation
    val payload = observation.payload.toMutableMap()
    identity.mcc?.let { payload["mcc"] = it }
    identity.mnc?.let { payload["mnc"] = it }
    identity.areaCode?.let { payload[if (identity.radio.equals("NR", true) || identity.radio.equals("LTE", true)) "tac" else "lac"] = it }
    identity.cellId?.let { payload[if (identity.radio.equals("NR", true)) "nci" else if (identity.radio.equals("LTE", true)) "ci" else "cid"] = it }
    identity.physicalCellId?.let { payload["pci"] = it }
    identity.radio?.let { payload["radio"] = it }
    identity.channel?.let { payload["channel"] = it }
    return observation.copy(payload = payload)
  }
}
