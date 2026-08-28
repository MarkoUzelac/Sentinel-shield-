package com.example.security

/** UI-neutral projection so Radar and Tactical Map consume the same ThreatSnapshot. */
data class RadarContact(
  val id: String,
  val kind: ObservationKind,
  val title: String,
  val subtitle: String,
  val evidence: EvidenceState,
  val rssiDbm: Int? = null,
)

data class TacticalMapPoint(
  val id: String,
  val kind: ObservationKind,
  val latitude: Double,
  val longitude: Double,
  val accuracyMeters: Double?,
  val label: String,
  val locationState: String,
)

object ThreatSnapshotProjector {
  fun radar(snapshot: ThreatSnapshot, nowEpochMs: Long, staleAfterMs: Long = 60_000L): List<RadarContact> =
    snapshot.observations.map { observation ->
      val evidence = evidenceStateFor(
        observedAtEpochMs = observation.observedAtEpochMs,
        nowEpochMs = nowEpochMs,
        staleAfterMs = staleAfterMs,
        source = observation.source,
      )
      RadarContact(
        id = observation.id,
        kind = observation.kind,
        title = observation.payload["name"]?.ifBlank { null }
          ?: observation.payload["ssid"]?.ifBlank { null }
          ?: observation.payload["radio"]?.ifBlank { null }
          ?: observation.kind.name,
        subtitle = observation.payload.entries
          .filter { it.key in setOf("rssi_dbm", "bssid", "address", "mcc", "mnc", "cid", "ci") }
          .joinToString(" · ") { "${it.key}=${it.value}" },
        evidence = evidence,
        rssiDbm = observation.payload["rssi_dbm"]?.toIntOrNull(),
      )
    }

  fun tacticalMap(snapshot: ThreatSnapshot): List<TacticalMapPoint> =
    snapshot.observations.mapNotNull { observation ->
      val latitude = observation.payload["latitude"]?.toDoubleOrNull()
        ?: observation.payload["opencellid_lat"]?.toDoubleOrNull()
      val longitude = observation.payload["longitude"]?.toDoubleOrNull()
        ?: observation.payload["opencellid_lon"]?.toDoubleOrNull()
      if (latitude == null || longitude == null) return@mapNotNull null
      val accuracy = observation.payload["accuracy_m"]?.toDoubleOrNull()
        ?: observation.payload["opencellid_accuracy"]?.toDoubleOrNull()
      val locationState = when (observation.source) {
        EvidenceSource.LOCAL_ANDROID -> "KNOWN LOCATION"
        EvidenceSource.PROVIDER_ENRICHED -> "PROVIDER LOCATION"
        EvidenceSource.DERIVED -> "ESTIMATED ZONE"
        EvidenceSource.UNAVAILABLE -> "UNAVAILABLE"
      }
      TacticalMapPoint(
        id = observation.id,
        kind = observation.kind,
        latitude = latitude,
        longitude = longitude,
        accuracyMeters = accuracy,
        label = observation.payload["ssid"] ?: observation.payload["name"] ?: observation.kind.name,
        locationState = locationState,
      )
    }
}
