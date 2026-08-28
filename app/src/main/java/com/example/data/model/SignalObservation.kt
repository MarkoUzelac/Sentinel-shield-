package com.example.data.model

import java.time.Instant

enum class SignalSource { BLE, WIFI, CELLULAR, GNSS, NETWORK, VPN, EXTERNAL }
enum class EvidenceStatus { VERIFIED, UNVERIFIED, ESTIMATED, STALE, UNAVAILABLE }

data class SignalObservation(
  val source: SignalSource,
  val id: String?,
  val name: String?,
  val manufacturer: String?,
  val rssiDbm: Int?,
  val latitude: Double?,
  val longitude: Double?,
  val accuracyMeters: Double?,
  val timestamp: Instant,
  val status: EvidenceStatus,
  val provenance: String
)
