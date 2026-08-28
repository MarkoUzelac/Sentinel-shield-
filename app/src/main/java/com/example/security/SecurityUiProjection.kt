package com.example.security

enum class MapLocationStatus { KNOWN_LOCATION, ESTIMATED_ZONE, LAST_SEEN, UNAVAILABLE }

data class RadarContact(val id:String,val kind:ObservationKind,val label:String,val rssiDbm:Int?,val evidence:EvidenceState)
data class TacticalMapPoint(val id:String,val label:String,val latitude:Double?,val longitude:Double?,val status:MapLocationStatus,val source:EvidenceSource)

object ThreatSnapshotProjector {
  fun radar(snapshot:ThreatSnapshot, nowEpochMs:Long, staleAfterMs:Long=30_000L)=snapshot.observations.map { o ->
    RadarContact(o.id,o.kind,when(o.kind){
      ObservationKind.BLE->o.payload["name"].orEmpty().ifBlank{"BLE device"}
      ObservationKind.WIFI->o.payload["ssid"].orEmpty()
      ObservationKind.CELLULAR->o.payload["radio"].orEmpty().ifBlank{"Cell"}
      ObservationKind.GPS->"Device location"
      ObservationKind.VPN->o.payload["backend"].orEmpty().ifBlank{"VPN"}
      ObservationKind.NETWORK->o.payload["transport"].orEmpty().ifBlank{"Network"}
      ObservationKind.UNKNOWN->"Unknown"
    },o.payload["rssi_dbm"]?.toIntOrNull(),evidenceStateFor(o.observedAtEpochMs,nowEpochMs,staleAfterMs,o.source))
  }

  fun tacticalMap(snapshot:ThreatSnapshot)=snapshot.observations.mapNotNull { o ->
    val lat=o.payload["latitude"]?.toDoubleOrNull()?:o.payload["opencellid_lat"]?.toDoubleOrNull()
    val lon=o.payload["longitude"]?.toDoubleOrNull()?:o.payload["opencellid_lon"]?.toDoubleOrNull()
    val status=when{
      lat!=null&&lon!=null&&o.source==EvidenceSource.PROVIDER_ENRICHED->MapLocationStatus.KNOWN_LOCATION
      lat!=null&&lon!=null&&o.kind==ObservationKind.GPS->MapLocationStatus.LAST_SEEN
      else->MapLocationStatus.UNAVAILABLE
    }
    TacticalMapPoint(o.id,when(o.kind){ObservationKind.CELLULAR->"Cell ${o.payload["cid"]?:o.payload["ci"]?:"unknown"}";ObservationKind.GPS->"My device";else->o.kind.name},lat,lon,status,o.source).takeIf{it.status!=MapLocationStatus.UNAVAILABLE}
  }
}
