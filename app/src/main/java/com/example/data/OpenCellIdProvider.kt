package com.example.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/**
 * OpenCellID tower geolocation adapter.
 * The API key is read from BuildConfig when configured and is never stored in source.
 */
class OpenCellIdProvider {
    private val client = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    private val cache = ConcurrentHashMap<String, CellLocation>()

    suspend fun lookup(
        mcc: Int?,
        mnc: Int?,
        areaCode: Int?,
        cellId: Long?,
        radio: String?
    ): CellLocation? = withContext(Dispatchers.IO) {
        val key = listOf(mcc, mnc, areaCode, cellId, radio).joinToString(":")
        cache[key]?.let { return@withContext it }

        val apiKey = runCatching {
            BuildConfig::class.java.getField("OPEN_CELL_ID_API_KEY").get(null) as? String
        }.getOrNull().orEmpty()
        if (apiKey.isBlank() || apiKey.startsWith("MY_")) return@withContext null
        if (mcc == null || mnc == null || areaCode == null || cellId == null) return@withContext null

        val url = buildString {
            append("https://opencellid.org/cell/get")
            append("?key=").append(apiKey)
            append("&mcc=").append(mcc)
            append("&mnc=").append(mnc)
            append("&lac=").append(areaCode)
            append("&cellid=").append(cellId)
            if (!radio.isNullOrBlank()) append("&radio=").append(radio)
            append("&format=json")
        }

        runCatching {
            client.newCall(Request.Builder().url(url).get().build()).execute().use { response ->
                if (!response.isSuccessful) return@withContext null
                val json = JSONObject(response.body?.string().orEmpty())
                val lat = json.optDouble("lat", Double.NaN)
                val lon = json.optDouble("lon", Double.NaN)
                if (!lat.isFinite() || !lon.isFinite()) return@withContext null
                val result = CellLocation(
                    latitude = lat,
                    longitude = lon,
                    rangeMeters = json.optDouble("range", Double.NaN).takeIf { it.isFinite() },
                    samples = json.optInt("samples", 0),
                    source = "OpenCellID"
                )
                cache[key] = result
                result
            }
        }.getOrNull()
    }

    data class CellLocation(
        val latitude: Double,
        val longitude: Double,
        val rangeMeters: Double?,
        val samples: Int,
        val source: String
    )
}
