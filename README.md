# 🛡️ SENTINEL SHIELD PRO

> **Privacy-first Android security console with real WireGuard lifecycle verification, evidence provenance, reactive network telemetry, hardware-backed device location and passive radio radar.**

[![Android](https://img.shields.io/badge/Android-24%2B-3DDC84?logo=android&logoColor=white)](https://developer.android.com/)
[![Kotlin](https://img.shields.io/badge/Kotlin-2.x-7F52FF?logo=kotlin&logoColor=white)](https://kotlinlang.org/)
[![WireGuard](https://img.shields.io/badge/WireGuard-Real%20backend-88171A?logo=wireguard&logoColor=white)](https://www.wireguard.com/)
[![CI](https://img.shields.io/badge/CI-Android%20build%20%2F%20test%20%2F%20lint-0B5FFF)](.github/workflows/android-ci.yml)

---

## 📊 PROJECT PROGRESS

### Current engineering completion: **94%**

```text
████████████████████████████████████████████████████████████████████████████████████████████░░░░  94%

IMPLEMENTED / HARDENED                                           EXTERNAL RELEASE GATES
└───────────────────────────────────────────────────────────────┴─────────────────────────┘
```

> 94% is an engineering/readiness estimate, not a security certification. 100% requires successful real-device and production-release validation.

---

## 🎯 CURRENT PRODUCT SCOPE

Sentinel Shield is intentionally centered on a small set of user-facing capabilities:

- **Shield** — centralized security score and Capability/Evidence status.
- **Radar** — passive cellular + Bluetooth LE observations and tactical visualization.
- **VPN** — real WireGuard userspace backend with lifecycle + handshake verification.
- **Call Security** — telephony/MMI checks.
- **Legal** — jurisdictional guidance.
- **Vault** — subscription/licensing surface.

The primary UX avoids fake “secured” states, fake server telemetry and fake device detections.

---

## 📡 REAL PASSIVE RADAR

The Radar module now consumes hardware/OS-backed observations instead of mock signals.

### Cellular telemetry

`SignalRadarProvider` reads the Android `TelephonyManager.allCellInfo` stream and normalizes supported records into a common model:

- 2G GSM
- 3G WCDMA
- 4G LTE
- 5G NR (on supported Android/API levels)
- serving vs. neighboring cells
- signal level / RSSI when exposed
- cell ID and area code when exposed

The app does **not** claim that a cell observation is proof of an IMSI catcher. A suspicious cellular pattern is treated as heuristic/anomalous evidence and remains `UNVERIFIED`.

### Bluetooth LE telemetry

The radar uses the Android BLE scanner to observe nearby advertisements when the user grants the required permissions. Each observation includes:

- RSSI
- runtime timestamp
- stable privacy-preserving local identifier (hash, not raw MAC in the UI)
- BLE technology classification
- coarse RSSI-derived distance estimate when TX power is available

The app does not claim to know the owner or identity of a nearby device from BLE advertising alone.

### Device geolocation

`DeviceLocationProvider` uses Android location providers and GNSS status to expose the device's own runtime location:

- latitude / longitude
- accuracy
- altitude
- speed
- bearing
- satellite count
- provider name
- timestamp / freshness

No coordinates are invented when the OS does not provide a valid fix.

### Tactical visualization

`TacticalRadarMap` renders the runtime signal picture around the **actual device position**. Important distinction:

- device GPS position = real coordinate
- BLE distance = estimate, without invented direction
- cellular observation = real radio observation; tower coordinates are shown only when an external tower-geolocation provider supplies real coordinates
- no fake tower pins are generated from arbitrary offsets

---

## 🧭 WHAT THE PHONE CAN AND CANNOT DETECT

Android applications are constrained by the radio hardware, OS permissions and privacy model. Sentinel therefore uses a strict capability boundary.

### Supported

- passive BLE advertisement discovery
- Android-exposed cellular neighbor/serving-cell telemetry
- the device's own GPS/GNSS position
- current network transports and validated state
- VPN transport state and WireGuard peer handshake evidence

### Not claimed

Sentinel cannot, using ordinary Android application APIs alone:

- extract IMSIs of surrounding subscribers
- identify a person from a nearby phone's radio signal
- reliably determine the GPS coordinate of a third-party phone from RSSI alone
- physically disable an external cell tower
- jam cellular/Bluetooth frequencies
- guarantee that a cell site is malicious from `CellInfo` alone
- scan arbitrary Internet devices without an explicit, authorized network-access workflow

This is intentional. The UI communicates uncertainty instead of turning weak signals into false certainty.

---

## 🔐 EVIDENCE MODEL

Every security capability is normalized to:

```text
VERIFIED
UNVERIFIED
UNAVAILABLE
```

Evidence carries provenance and expiry. A stale non-available result automatically degrades to `UNVERIFIED` rather than remaining visually trustworthy forever.

### Examples

```text
WireGuard transport + fresh peer handshake
                ↓
             VERIFIED

Cellular telemetry / BLE observation
                ↓
            UNVERIFIED

No telephony capability / missing required permission
                ↓
           UNAVAILABLE
```

---

## 🔒 VPN ARCHITECTURE

The VPN uses the official WireGuard Android userspace backend.

```text
Android VPN permission
        ↓
WireGuard GoBackend
        ↓
Tunnel lifecycle
        ↓
Handshake verifier
        ↓
Fresh peer evidence
        ↓
VERIFIED
```

If transport or handshake health disappears, the controller fails closed and stops the transport.

The primary UI no longer requires the user to understand `.conf` files. A real managed endpoint/profile must still exist somewhere outside the UI flow; Sentinel will not invent a server or credential.

---

## 🌐 NETWORK LAYER

Network state is observed reactively through `ConnectivityManager.NetworkCallback`.

The model can surface:

- active transports
- network validation state
- VPN transport state
- DNS servers from `LinkProperties`
- interface name
- blocked state

Network telemetry is evidence, not a blanket claim that the current network is safe.

The app intentionally avoids aggressive network-wide probing as a default security feature. This reduces battery usage and keeps the product focused on defensive, OS-mediated telemetry.

---

## 📍 TACTICAL MAP RULES

The map follows a strict provenance policy:

```text
REAL LOCATION → allowed to render as coordinate
REAL RADIO OBSERVATION → allowed to render as signal evidence
ESTIMATE → explicitly labeled estimate
UNKNOWN → never promoted into a fake coordinate
```

Google Maps can be opened for the device's own current coordinates using a standard geo intent. A future tower-geolocation adapter may enrich cell observations only when it returns real provider-backed coordinates.

---

## 🧪 TESTING

The project includes deterministic evidence freshness testing and WireGuard state-machine invariant coverage.

Recommended verification order:

```text
Gradle configuration
        ↓
assembleRelease
        ↓
unit tests
        ↓
lint
        ↓
security checks
        ↓
production gate
        ↓
physical Android validation
```

Virtual coroutine time (`runTest` + dispatcher-controlled time advancement) should be used for lifecycle timeout tests so no test waits on real time.

---

## 🚦 PRODUCTION READINESS GATES

The remaining gates are external validation items rather than reasons to add more UI:

- real WireGuard endpoint/profile provisioning
- physical Android device validation across relevant API levels
- release keystore/signing verification
- final CI production gate
- end-to-end freshness/race validation on device

---

## 🛡️ DESIGN PRINCIPLES

### 1. No fake verification

A switch or UI animation never equals proof of security.

### 2. No fake coordinates

If Android does not provide a coordinate, Sentinel does not manufacture one.

### 3. No invasive radio claims

BLE and cellular observations are treated as telemetry, not identity extraction.

### 4. Fail closed

A missing critical VPN health signal stops the tunnel rather than presenting stale protection.

### 5. Premium UX, minimal cognitive load

Primary screens expose the action and the security state first. Advanced diagnostics remain secondary.

---

## 📁 IMPORTANT RUNTIME COMPONENTS

```text
app/src/main/java/com/example/
├── data/
│   ├── AndroidNetworkEvidenceProvider.kt
│   ├── DeviceLocationProvider.kt
│   ├── SignalRadarProvider.kt
│   └── model/
│       ├── CapabilityEvidence.kt
│       ├── CapabilityEvidenceSnapshot.kt
│       ├── DeviceLocationState.kt
│       └── SignalRadarModels.kt
├── ui/
│   ├── components/
│   │   └── TacticalRadarMap.kt
│   └── screens/
│       └── ImsiRadarScreen.kt
└── vpn/
    ├── WireGuardProfileStore.kt
    └── WireGuardTunnelController.kt
```

---

## ⚠️ SECURITY / PRIVACY NOTE

Sentinel Shield is designed as a defensive local security console. It deliberately does not provide frequency jamming, subscriber-identity extraction, or covert tracking of third-party devices. All “threat” conclusions are tied to the strength and provenance of the evidence actually available to the Android runtime.

---

## 📌 CURRENT CHECKPOINT

```text
94%
 │
 ├── ✅ Premium UI / navigation
 ├── ✅ Central Evidence model
 ├── ✅ Reactive network telemetry
 ├── ✅ Hardware-backed device geolocation
 ├── ✅ Passive BLE radar
 ├── ✅ Cellular telemetry radar
 ├── ✅ Tactical signal visualization
 ├── ✅ WireGuard lifecycle + handshake verification
 │
 ├── ⏳ CI production PASS
 ├── ⏳ real WireGuard endpoint
 ├── ⏳ physical device matrix
 ├── ⏳ production signing
 └── ⏳ final release validation
 │
 ▼
100% PRODUCTION READINESS
```
