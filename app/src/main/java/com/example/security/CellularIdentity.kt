package com.example.security

/** Canonical cellular identity fields shared by local telemetry and provider enrichment. */
data class CellularIdentity(
  val radio: String?,
  val mcc: String?,
  val mnc: String?,
  val areaCode: String?,
  val cellId: String?,
  val physicalCellId: String?,
  val channel: String?,
)

object CellularIdentityParser {
  fun parse(observation: SecurityObservation): CellularIdentity? {
    if (observation.kind != ObservationKind.CELLULAR) return null
    val p = observation.payload
    return CellularIdentity(
      radio = p["radio"],
      mcc = p["mcc"],
      mnc = p["mnc"],
      areaCode = p["tac"] ?: p["lac"],
      cellId = p["ci"] ?: p["cid"] ?: p["nci"],
      physicalCellId = p["pci"] ?: p["psc"] ?: p["cpid"],
      channel = p["earfcn"] ?: p["nrarfcn"] ?: p["arfcn"] ?: p["uarfcn"],
    )
  }
}
