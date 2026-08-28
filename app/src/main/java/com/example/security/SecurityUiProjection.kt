package com.example.security

enum class MapLocationStatus { KNOWN_LOCATION, ESTIMATED_ZONE, LAST_SEEN, UNAVAILABLE }

data class RadarContact(
  val id: String,
  val kind: ObservationKind,
  val label: String,
  val rssiDbm: Int?,
  val evidence: EvidenceState,
)

data class TacticalMapPoint(
  val id: String,
  val label: String,
  val latitude: Double?,
  val longitude: Double?,
  val status: MapLocationStatus,
  val source: EvidenceSource,
)

object ThreatSnapshotProjector {
  fun radar(snapshot: ThreatSnapshot, nowEpochMs: Long, staleAfterMs: Long = 30_000L): List<RadarContact> =
    snapshot.observations.map { observation ->
      RadarContact(
        id = observation.id,
        kind = observation.kind,
        label = when (observation.kind) {
          ObservationKind.BLE -> observation.payload["name"].orEmpty().ifBlank { "BLE device" }
          ObservationKind.WIFI -> observation.payload["ssid"].orEmpty().ifBlank { "Wi-Fi" }
          ObservationKind.CELLULAR -> observation.payload["radio"].orEmpty().ifBlank { "Cell" }
          ObservationKind.GPS -> "Device location"
          ObservationKind.VPN -> observation.payload["backend"].orEmpty().ifBlank { "VPN" }
          ObservationKind.NETWORK -> observation.payload["transport"].orEmpty().ifBlank { "Network" }
          ObservationKind.UNKNOWN -> "Unknown"
        },
        rssiDbm = observation.payload["rssi_dbm"]?.toIntOrNull(),
        evidence = evidenceStateFor(observation.observedAtEpochMs, nowEpochMs, staleAfterMs, observation.source),
      )
    }

  fun tacticalMap(snapshot: ThreatSnapshot): List<TacticalMapPoint> = snapshot.observations.mapNotNull { observation ->
    val lat = observation.payload["latitude"]?.toDoubleOrNull() ?: observation.payload["opencellid_lat"]?.toDoubleOrNull()
    val lon = observation.payload["longitude"]?.toDoubleOrNull() ?: observation.payload["opencellid_lon"]?.toDoubleOrNull()
    val status = when {
      lat != null && lon != null && observation.source == EvidenceSource.PROVIDER_ENRICHED -> MapLocationStatus.KNOWN_LOCATION
      lat != null && lon != null && observation.kind == ObservationKind.GPS -> MapLocationStatus.LAST_SEEN
      else -> MapLocationStatus.UNAVAILABLE
    }
    TacticalMapPoint(
      id = observation.id,
      label = when (observation.kind) {
        ObservationKind.CELLULAR -> "Cell ${observation.payload["cid"] ?: observation.payload["ci"] ?: observation.payload["nci"] ?: "unknown"}"
        ObservationKind.GPS -> "My device"
        else -> observation.kind.name
      },
      latitude = lat,
      longitude = lon,
      status = status,
      source = observation.source,
    ).takeIf { it.status != MapLocationStatus.UNAVAILABLE }
  }
}
