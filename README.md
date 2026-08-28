# 🛡️ SENTINEL SHIELD PRO

> Premium native Android security and privacy application. Real Android telemetry, network protection, signal intelligence, tactical mapping and evidence-driven threat analysis — with **no fabricated detection states**.

[![Android](https://img.shields.io/badge/Platform-Android-3DDC84?logo=android&logoColor=white)](#)
[![Jetpack Compose](https://img.shields.io/badge/UI-Jetpack%20Compose-4285F4?logo=jetpackcompose&logoColor=white)](#)
[![Security Model](https://img.shields.io/badge/Evidence-VERIFIED%20%2F%20UNVERIFIED%20%2F%20UNAVAILABLE-black)](#)
[![Release](https://img.shields.io/badge/Release-1.0%20Gate-orange)](#)

---

## 🎯 Product Direction

Sentinel Shield is being consolidated around a **native Android experience** while preserving the premium visual identity of the web edition.

The Android application is the primary product surface. The web edition is a reference for UX, information architecture and existing feature behavior; its modules are being migrated to native Android rather than embedded in a WebView.

### Non-negotiable product rules

- **No mock detections.** A signal, device, tower or threat must never be invented for the UI.
- **Real source provenance.** Every important value identifies whether it is measured locally, provider-enriched, estimated or unavailable.
- **One security source of truth.** Radar, Shield and reports consume the same `ThreatSnapshot` / evidence pipeline.
- **Graceful degradation.** When Android cannot expose a value, Sentinel explicitly reports `UNAVAILABLE` instead of guessing.
- **Premium UX stays.** Phosphor Matrix and the established premium themes remain part of the product identity.

---

# 📡 Signal Intelligence

The radar is evolving from a static scanner screen into a time-correlated **Signal Intelligence Engine**.

```text
ANDROID HARDWARE / OS
        │
        ├── GPS / GNSS
        ├── Cellular
        ├── BLE
        ├── Wi‑Fi
        └── Connectivity
                │
                ▼
       SIGNAL INGESTION ENGINE
                │
                ▼
      NORMALIZATION + CORRELATION
                │
                ▼
          THREAT ENGINE
                │
                ▼
          EVIDENCE ENGINE
                │
                ▼
          TACTICAL UI
```

## Supported real sources

### BLE

Use Android Bluetooth LE scanning where the OS and permissions allow it.

The application may expose:

- advertised device name, when present
- manufacturer data, when available
- service UUIDs / advertised capabilities, when exposed
- RSSI
- observation count
- first/last observed timestamps
- signal-strength trend
- estimated distance/range
- persistent-signal analysis

Sentinel must not infer a precise GPS coordinate for another device merely because BLE is visible.

### Wi‑Fi

Use Android Wi‑Fi scan results where scanning is permitted.

Possible fields include:

- SSID, when exposed
- `Hidden SSID` when the network name is not broadcast
- BSSID where the platform exposes it to the application
- frequency/channel information
- RSSI
- security/capability information
- first/last observation
- observation count
- signal trend

### Cellular

Use `TelephonyManager` / `CellInfo` data exposed by the device and carrier configuration.

Possible fields include:

- serving cell
- neighboring cells, when exposed
- MCC / MNC
- LAC/TAC where exposed
- Cell ID / CI
- PCI where exposed
- radio technology
- signal strength / quality values available for the technology
- timestamp and persistence history

Sentinel may calculate an **anomaly score**, but an anomaly score is not proof of an IMSI catcher.

### GPS / GNSS

The device's own location is the authoritative local location source.

The location layer may include:

- latitude / longitude
- accuracy
- altitude
- speed
- bearing
- provider/source
- GNSS information when exposed
- location age/freshness

### Connectivity / VPN

Use Android network state and the real WireGuard lifecycle to correlate:

- active transport
- network changes
- DNS state where observable
- VPN state
- tunnel lifecycle
- handshake freshness
- protection degradation

A VPN is displayed as protected only when the actual tunnel state and evidence satisfy the product's verification rules.

---

# 🗺️ Tactical Map + Signal Location Finder

Every mapped object must be classified by location confidence.

```text
KNOWN LOCATION
    ↓
Verified provider-backed / directly measured coordinate

ESTIMATED ZONE
    ↓
Derived from multiple observations, GPS positions and signal trends

LAST SEEN
    ↓
Actual location of the user's device when the signal was observed

UNAVAILABLE
    ↓
No defensible location can be established
```

### Physical Finder

When Sentinel cannot know the exact physical coordinate of a nearby signal, it can still help the user locate it using real observations:

```text
RSSI → signal trend → closer / farther
GPS observation trail
heatmap / search zone
repeated measurements
last-seen location
```

This must always be labeled as an **estimate** when it is not a verified coordinate.

The application must never invent a coordinate for a BLE, Wi‑Fi or cellular object.

---

# 🧠 Device Intelligence

Selecting any radar object opens a detailed intelligence view.

```text
DEVICE / SIGNAL
───────────────
Type
Name
Manufacturer
Identifier / privacy ID
RSSI
Distance estimate
First seen
Last seen
Observation count
Services / capabilities
Location status
Risk score
Evidence status
Source provenance
```

Identification confidence must be explicit:

- `VERIFIED`
- `HIGH CONFIDENCE`
- `ESTIMATED`
- `UNVERIFIED`
- `UNAVAILABLE`

A hidden or private identifier must not be presented as a confirmed device identity.

---

# 🚦 Threat & Correlation Engine

The engine correlates observations over a time window rather than treating each signal as an isolated event.

Example:

```text
CELL CHANGE
     +
NETWORK CHANGE
     +
GPS / LOCATION INCONSISTENCY
     +
VPN HANDSHAKE DEGRADATION
            │
            ▼
      CORRELATED FINDING
```

Suggested anomaly bands:

```text
0–24     NORMAL
25–49    WATCH
50–74    SUSPICIOUS
75–100   HIGH RISK
```

The score is **heuristic**. It must never be rendered as proof of surveillance, interception or an IMSI catcher without an actual evidence source capable of supporting that claim.

---

# 🛡️ Evidence Model

All major modules consume a shared evidence state:

```text
VERIFIED
UNVERIFIED
UNAVAILABLE
STALE
```

The UI must always communicate the distinction between:

- locally measured data
- provider-backed enrichment
- derived/estimated data
- stale evidence
- unavailable capabilities

### Shared `ThreatSnapshot`

```text
BLE
CELL
Wi‑Fi
GPS
NETWORK
VPN
OPEN CELL DATABASES
        │
        ▼
  ThreatSnapshot
        │
   ┌────┴────┐
   ▼         ▼
 RADAR     SHIELD
```

There must not be parallel hardcoded “secured” states in individual screens.

---

# 🔐 Privacy / Stealth Mode

Stealth mode is a **digital-exposure reduction mode**, not a promise of radio invisibility.

Possible protections include:

- verified VPN protection when available
- DNS/network protection where supported
- background network reduction
- tracker/ad filtering where technically supported
- Bluetooth discoverability guidance
- location-sharing audit
- permission audit
- public-IP awareness
- sensitive-app exposure review

Sentinel must clearly state which protections are active and which are unavailable.

---

# 🛡️ Defensive Actions

Actions are limited to capabilities Android can legitimately perform.

```text
BLOCK NETWORK
    → VPN / routing / kill-switch policy where supported

IGNORE SIGNAL
    → local filtering / suppression of an observed identifier

DISMISS
    → remove a finding from the active view

OPEN SETTINGS
    → Android privacy / permission controls
```

The UI must not claim that Sentinel can physically disable a third-party tower, phone, tracker or radio transmitter.

---

# 🧩 Existing Features — Preserve During Migration

The Android migration must retain the existing application capabilities, while replacing demo-only implementations where possible with real providers.

- Dashboard
- Radar
- Tactical Map
- Device Geolocation
- Cellular telemetry
- BLE radar
- Wi‑Fi / network audit capabilities where Android exposes them
- VPN / WireGuard lifecycle and handshake verification
- Call Security
- Network Security / latency testing
- AI Scanner / Security Advisor
- Dark Web monitoring where a real provider is configured
- Legal / privacy information
- Vault / themes / skins
- Language localization
- Side navigation and premium navigation flow

Features that cannot be made real on the target Android API level must remain visibly `UNAVAILABLE` rather than simulated.

---

# 🎨 Premium UI / UX

The native Android application preserves the established visual identity.

## Primary skin

**Phosphor Matrix** — CRT-inspired phosphor green / tactical interface.

## Additional themes

- Cyber Cyan
- Stealth Midnight
- Solar Tactical Amber
- Titanium Clean

The design goal is:

```text
PREMIUM
  +
FAST
  +
CLEAR
  +
TOUCH FRIENDLY
  +
DATA HONEST
```

Radar and Tactical Map should prioritize a single clear action hierarchy instead of multiple competing panels.

---

# ⏱️ Deterministic Time & Freshness

All evidence pipelines should use an injectable clock.

This allows tests to deterministically simulate:

```text
LIVE
 ↓
STALE
 ↓
UNVERIFIED
 ↓
UNAVAILABLE
```

without sleeping for real time.

The same principle applies to:

- VPN handshake age
- BLE signal history
- cellular observations
- GPS freshness
- network evidence

---

# 🧪 Production CI Gate

A production release is not considered complete merely because the application compiles locally.

Required gate:

```text
Verify Gradle configuration
        ↓
compile / release compilation
        ↓
assembleRelease
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

**No percentage is increased and no production-ready claim is made until the corresponding evidence exists.**

---

# 🔑 Secrets

API keys must never be committed to source control.

OpenCellID and other provider credentials belong in the configured secret store / CI secrets.

The application must still compile with an empty provider credential and report the provider as unavailable rather than inventing enrichment.

---

# 📱 Native Android Migration

The web edition provides the visual and functional reference. The Android build is the production target.

Migration principles:

1. Preserve established premium UX and navigation.
2. Reuse feature concepts and models where appropriate.
3. Replace browser stores with Android ViewModels / repositories.
4. Replace simulated hardware data with real Android providers.
5. Consolidate all security state through `ThreatSnapshot` / evidence.
6. Keep unsupported capabilities explicit.
7. Test every migration step in CI.

---

# 🚀 Release 1.0 Definition

Sentinel Shield 1.0 is considered ready only when:

- native Android build is reproducible
- production Gradle configuration is clean
- unit and integration tests pass
- lint is clean or reviewed with justified baselines
- security/secret checks pass
- real hardware signal providers are integrated where supported
- Radar and Tactical Map consume live evidence
- ThreatSnapshot is shared across the product
- VPN protection is verified from actual tunnel state
- production signing is configured securely
- physical-device validation is completed

Until those conditions are met, the project remains in **Production Hardening / Release Gate** rather than being presented as a finished 1.0 release.

---

## 📚 Development

The current repository contains both the legacy web/cloud implementation and the evolving native Android implementation. The Android source is the target for the production application.

For contributors, see repository contribution and security documentation where present.
