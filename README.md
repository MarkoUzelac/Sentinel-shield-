# 🛡️ SENTINEL SHIELD PRO

> Premium native Android security and privacy application. Real Android telemetry, network protection, signal intelligence, tactical mapping and evidence-driven threat analysis — with **no fabricated detection states**.

[![Android](https://img.shields.io/badge/Platform-Android-3DDC84?logo=android&logoColor=white)](#)
[![UI](https://img.shields.io/badge/UI-Premium%20Compose-blue)](#)
[![Evidence](https://img.shields.io/badge/Evidence-VERIFIED%20%2F%20ESTIMATED%20%2F%20UNAVAILABLE-black)](#)
[![Release](https://img.shields.io/badge/Release-1.0%20Gate-orange)](#)

## Legal & ownership

**Copyright © 2026 Marko Uzelac. All rights reserved.**

See [`LEGAL.md`](LEGAL.md) and [`LICENSE`](LICENSE). Third-party dependencies remain governed by their own licenses.

**Project owner:** Marko Uzelac  
**Project:** Sentinel Shield  
**Repository:** `MarkoUzelac/Sentinel-shield-`

### Contact

For legal, licensing, copyright, security, privacy, or support inquiries, use the official contact channel published with the project distribution. Private credentials and API keys must never be posted in public issues.

---

## Product direction

Sentinel Shield is being consolidated around a **native Android experience** while preserving the premium visual identity of the web edition. The Android application is the production target; the web edition is a UX and information-architecture reference.

### Non-negotiable rules

- **No mock detections.** Signals, devices, towers and threats are never invented.
- **Real provenance.** Values identify whether they are locally measured, provider-enriched, estimated, stale or unavailable.
- **One security source of truth.** Radar, Shield and reports consume the same evidence pipeline / `ThreatSnapshot`.
- **Graceful degradation.** Unsupported Android capabilities are `UNAVAILABLE`, never guessed.
- **Premium UX stays.** Phosphor Matrix and the established premium themes remain part of the product identity.

# 📡 Signal Intelligence

```text
ANDROID HARDWARE / OS
 GPS/GNSS • Cellular • BLE • Wi‑Fi • Connectivity
                    ↓
           SIGNAL INGESTION
                    ↓
        NORMALIZATION / CORRELATION
                    ↓
              THREAT ENGINE
                    ↓
             EVIDENCE ENGINE
                    ↓
              TACTICAL UI
```

### BLE

Where Android permissions and device capabilities allow scanning, expose real advertised information such as device name when present, manufacturer data, service UUIDs/capabilities, RSSI, observation count, first/last seen, signal trend and a clearly labeled range estimate. A BLE observation does **not** establish another device's GPS coordinate.

### Wi‑Fi

Where Android exposes scan results, show SSID when available, `Hidden SSID` when the name is not broadcast, BSSID where permitted, frequency/channel, RSSI, security capabilities, timestamps, observation count and signal trend.

### Cellular

Use `TelephonyManager` / `CellInfo` for serving and neighboring cells when exposed, including MCC/MNC, LAC/TAC where available, Cell ID/CI, PCI, radio technology, signal metrics and observation freshness. An anomaly score is heuristic and is **not proof of an IMSI catcher or surveillance**.

### GPS / GNSS

The phone's own location is authoritative for local observations. Store latitude/longitude, accuracy, altitude, speed, bearing, provider/source, GNSS data where exposed, and freshness.

### Connectivity / VPN

Correlate active transport, network changes, observable DNS state, VPN state, tunnel lifecycle and handshake freshness. VPN protection is shown as verified only when actual tunnel evidence satisfies the verification rules.

# 🗺️ Tactical Map + Physical Finder

Mapped objects use explicit location confidence:

- **KNOWN LOCATION** — verified provider-backed or directly measured coordinate.
- **ESTIMATED ZONE** — derived from multiple real observations, GPS positions and signal trends.
- **LAST SEEN** — actual location of the user's device when the signal was observed.
- **UNAVAILABLE** — no defensible location exists.

When exact physical coordinates cannot be established, Physical Finder uses real RSSI trends, closer/farther guidance, GPS observation trails, heat/search zones, repeated measurements and last-seen data. Estimated results are always labeled **ESTIMATED**.

The app must never fabricate coordinates or claim to read GPS from another device.

# 🧠 Device Intelligence

Selecting a radar object opens detailed intelligence including type, advertised name, manufacturer where supported, identifier/privacy ID, RSSI, range estimate, first/last seen, observation count, services/capabilities, location status, risk score, evidence status and source provenance.

Identification confidence is explicit: `VERIFIED`, `HIGH CONFIDENCE`, `ESTIMATED`, `UNVERIFIED`, `UNAVAILABLE`.

# 🚦 Threat & Correlation Engine

Observations are correlated over time rather than treated as isolated signals. Example inputs include cell changes, network changes, location inconsistency and VPN handshake degradation.

Suggested heuristic bands:

```text
0–24 NORMAL • 25–49 WATCH • 50–74 SUSPICIOUS • 75–100 HIGH RISK
```

These scores are heuristic and never constitute proof of surveillance, interception or an IMSI catcher.

# 🛡️ Evidence Model

Shared states:

```text
VERIFIED • UNVERIFIED • ESTIMATED • STALE • UNAVAILABLE
```

Every important observation distinguishes local measurement, provider enrichment, derived estimation and unavailable capability.

```text
BLE / CELL / Wi‑Fi / GPS / NETWORK / VPN / OPEN CELL DATABASES
                              ↓
                        ThreatSnapshot
                         ↙           ↘
                      RADAR        SHIELD
```

No screen may maintain a separate hardcoded “secured” state.

# 🔐 Privacy / Stealth

Stealth Mode is a **digital-exposure reduction mode**, not a promise of radio invisibility. Depending on Android capabilities and configuration it may provide verified VPN protection, DNS/network protection, background network reduction, tracker/ad filtering, Bluetooth discoverability guidance, location/permission audits, public-IP awareness and sensitive-app exposure review.

The UI must always state which protection is active and which is unavailable.

# 🛡️ Defensive Actions

Actions are restricted to capabilities Android can legitimately perform: VPN/routing policy where supported, local signal filtering, dismissing findings and opening Android privacy/permission settings.

Sentinel Shield does not claim to physically disable third-party phones, trackers, towers or transmitters.

# 🧩 Existing Features — Preserve

Migration must retain existing product capabilities while replacing demo-only providers wherever technically possible:

- Dashboard
- Radar
- Tactical Map
- Device Geolocation
- Cellular telemetry
- BLE radar
- Wi‑Fi/network audit
- VPN / WireGuard lifecycle and handshake verification
- Call Security
- Network Security / latency testing
- AI Scanner / Security Advisor
- Dark Web monitoring when a real provider is configured
- Legal / privacy information
- Vault / themes / skins
- Language localization
- Side navigation and premium navigation flow

Unsupported capabilities remain visibly `UNAVAILABLE` rather than simulated.

# 🎨 Premium UI / UX

**Primary skin:** Phosphor Matrix — CRT-inspired phosphor-green tactical interface.

**Additional themes:** Cyber Cyan, Stealth Midnight, Solar Tactical Amber, Titanium Clean.

Design target:

```text
PREMIUM + FAST + CLEAR + TOUCH FRIENDLY + DATA HONEST
```

Radar and Tactical Map prioritize a clear touch-first action hierarchy.

# ⏱️ Deterministic freshness

Evidence pipelines use an injectable clock so tests can deterministically validate `LIVE → STALE → UNVERIFIED → UNAVAILABLE` for VPN handshakes, BLE history, cellular observations, GPS and network evidence.

# 🧪 Production CI Gate

```text
Verify Gradle configuration
        ↓
release compilation / assembleRelease
        ↓
unit tests
        ↓
Android lint
        ↓
security / secret scan
        ↓
production gate
        ↓
physical Android validation
        ↓
production signing
        ↓
1.0 RELEASE
```

No production-ready claim is made until corresponding evidence exists.

# 🔑 Secrets

API keys and provider credentials must never be committed to source control. OpenCellID and other provider credentials belong in the configured secret store / CI secrets. Empty credentials must result in a clear provider-unavailable state, never fabricated enrichment.

# 📱 Native Android migration

1. Preserve established premium UX and navigation.
2. Reuse feature concepts/models where appropriate.
3. Replace browser stores with Android ViewModels/repositories.
4. Replace simulated hardware data with real Android providers.
5. Consolidate security state through `ThreatSnapshot` / evidence.
6. Keep unsupported capabilities explicit.
7. Validate every migration step in CI and on physical Android hardware.

# 🚀 Release 1.0 definition

Sentinel Shield 1.0 is ready only when the native Android build is reproducible, Gradle configuration is clean, tests pass, lint/security gates pass, real hardware providers are integrated where supported, Radar/Tactical Map consume live evidence, `ThreatSnapshot` is shared, VPN state is verified from the actual tunnel, production signing is secure, and physical-device validation is complete.

Until then the project remains in **Production Hardening / Release Gate**.

---

## 📋 Implementation backlog — v1.0

This section is the canonical implementation checklist for the remaining work. Items are ordered by release dependency, not by UI priority.

### P0 — Build and release foundation

- [ ] Make `main` reproducible from a clean checkout with the committed Gradle wrapper.
- [ ] Keep `Verify Gradle configuration → assembleRelease → unit tests → lint → security → production gate` authoritative.
- [ ] Eliminate all Gradle/version-catalog/plugin blockers; do not solve failures with disabled checks.
- [ ] Keep CI runs isolated by commit and prevent accidental cancellation of the production gate.
- [ ] Add release artifact verification (APK/AAB existence, version code/name, manifest sanity, checksum).
- [ ] Configure production signing from protected CI secrets only.
- [ ] Create release tag `v1.0.0` only after all release gates are green.

### P0 — Native Android parity

- [ ] Keep Android as the primary product target; retain web code as UX/reference only.
- [ ] Preserve Dashboard, Radar, Tactical Map, VPN, Call Security, Network Security, AI Scanner, Dark Web, Legal, Vault, localization and side navigation.
- [ ] Remove or replace demo-only data paths wherever a real Android/provider implementation exists.
- [ ] Ensure unsupported functions resolve to `UNAVAILABLE`, not synthetic success.

### P0 — Signal ingestion

- [ ] Cellular: serving + neighboring `CellInfo` ingestion with radio type, MCC/MNC, CID/CI, TAC/LAC and signal metrics where Android exposes them.
- [ ] BLE: real scanner ingestion with advertised identity, manufacturer/service metadata when exposed, RSSI and observation timestamps.
- [ ] Wi‑Fi: real scan ingestion with SSID/Hidden SSID, BSSID where permitted, frequency/channel, RSSI and security capabilities.
- [ ] GPS/GNSS: device location, accuracy, altitude, speed, bearing and freshness.
- [ ] Connectivity: network capability/state changes through Android network APIs.
- [ ] VPN: real tunnel lifecycle and fresh WireGuard handshake evidence.

### P0 — Correlation and evidence

- [ ] Normalize all inputs into `SecurityObservation` / equivalent canonical models.
- [ ] Feed all relevant observations into the shared `SignalIntelligenceEngine` / coordinator.
- [ ] Produce exactly one authoritative `ThreatSnapshot` consumed by Radar, Dashboard and reports.
- [ ] Preserve provenance for every provider-backed or derived value.
- [ ] Apply one injectable `EvidenceClock` to all freshness-sensitive security data.
- [ ] Enforce retention and stale transitions without real-time test waits.

### P1 — Tactical Map and Physical Finder

- [ ] Render only real observations and provider-backed coordinates.
- [ ] Distinguish `KNOWN LOCATION`, `ESTIMATED ZONE`, `LAST SEEN` and `UNAVAILABLE`.
- [ ] Store real observation trails based on the phone's own GPS position.
- [ ] Add RSSI trend / closer-farther guidance for BLE and Wi‑Fi physical finding.
- [ ] Add signal persistence and heat/search zones derived from actual measurements.
- [ ] Prevent another device's GPS location from being inferred without an authorized location-sharing mechanism.
- [ ] Add interactive object details and map actions without fabricating precision.

### P1 — Device Intelligence

- [ ] Identify device class only when supported by advertised metadata, known fingerprints or other defensible evidence.
- [ ] Expose name/manufacturer/services only when actually available.
- [ ] Keep private/local identifiers instead of creating unnecessary persistent tracking identifiers.
- [ ] Show confidence and provenance beside every inferred field.

### P1 — Threat detection

- [ ] Implement explainable heuristic scoring for cell, BLE, Wi‑Fi and network anomalies.
- [ ] Correlate rapid cell changes with network/VPN changes and location inconsistencies.
- [ ] Keep anomaly scoring explicitly separate from proof of IMSI catcher, interception or wiretap activity.
- [ ] Add finding history and state transitions without duplicating `ThreatSnapshot` state.

### P1 — Privacy / Stealth

- [ ] Implement privacy exposure audit.
- [ ] Show verified VPN/DNS/network protection state.
- [ ] Add Android permission/location-sharing review.
- [ ] Add Bluetooth discoverability guidance.
- [ ] Add public-IP exposure check and supported tracker/telemetry filtering.
- [ ] Never describe the mode as radio-frequency invisibility.

### P1 — Legal / Contact / licensing

- [ ] Ship `LEGAL.md` with product limitations, privacy/legal notices and supported jurisdictions/references.
- [ ] Ship `LICENSE` with the exact rights granted by Marko Uzelac; do not use a permissive license unless intentionally chosen by the copyright holder.
- [ ] Keep copyright notices consistent across Android source, web reference code and release documentation.
- [ ] Provide a visible official support/contact channel in the production distribution.

### P2 — Validation

- [ ] Add deterministic tests for BLE persistence and RSSI trend calculation.
- [ ] Add deterministic tests for cell ↔ OpenCellID correlation and location mismatch handling.
- [ ] Add deterministic tests for `ThreatSnapshot` consistency across Radar and Dashboard.
- [ ] Add freshness/race tests for VPN, network, cellular, BLE and GPS observations.
- [ ] Validate on a physical Android device matrix covering supported Android versions and OEM behavior.
- [ ] Validate permission denial and hardware-unavailable paths.
- [ ] Produce a final release evidence report before publishing 1.0.

### Definition of done

```text
ALL P0 ──────────────── ✅
P1 security/privacy ─── ✅
P2 validation ───────── ✅
CI production gate ──── ✅
Signed artifact ─────── ✅
Physical device test ── ✅

                 ↓

            SENTINEL SHIELD 1.0
```
