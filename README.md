# 🛡️ SENTINEL SHIELD PRO

> **Privacy-first Android security console with evidence-backed network telemetry, passive radio observations, device geolocation and verified WireGuard lifecycle.**

[![Android](https://img.shields.io/badge/Android-24%2B-3DDC84?logo=android&logoColor=white)](https://developer.android.com/)
[![Kotlin](https://img.shields.io/badge/Kotlin-2.x-7F52FF?logo=kotlin&logoColor=white)](https://kotlinlang.org/)
[![WireGuard](https://img.shields.io/badge/WireGuard-Real%20backend-88171A?logo=wireguard&logoColor=white)](https://www.wireguard.com/)
[![CI](https://img.shields.io/badge/CI-Android%20build%20%2F%20test%20%2F%20lint-0B5FFF)](.github/workflows/android-ci.yml)

---

## 📊 PROJECT STATUS

### Current engineering checkpoint: **94%**

```text
████████████████████████████████████████████████████████████████████████████████████████████░░░░  94%

IMPLEMENTED / HARDENED                                  REMAINING RELEASE GATES
└───────────────────────────────────────────────────────┴───────────────────────────────┘

✅ Evidence model / freshness                         ⏳ CI production PASS
✅ Reactive network                                   ⏳ real WireGuard endpoint
✅ Device GPS/GNSS                                   ⏳ physical Android validation
✅ Cellular + BLE radar                              ⏳ production keystore/signing
✅ OpenCellID enrichment                             ⏳ final release validation
✅ WireGuard lifecycle + handshake                   
✅ Premium navigation / side menu                    
✅ Production signing guard                         
```

> **94% is an engineering/readiness indicator, not a certification.** The final percentage is reserved for external release evidence: green CI, real endpoint validation, physical-device validation and signed release validation.

---

## 🎯 PRODUCT DIRECTION

Sentinel Shield is being consolidated around a single principle:

```text
ANDROID HARDWARE / OS
        │
        ├── GPS / GNSS
        ├── Cellular
        ├── Bluetooth LE
        └── Connectivity / VPN
                │
                ▼
       SIGNAL / NETWORK INGESTION
                │
                ▼
       NORMALIZATION + CORRELATION
                │
                ▼
         THREAT / ANOMALY ENGINE
                │
                ▼
        CAPABILITY / EVIDENCE
                │
                ▼
              SHIELD
                │
                ▼
          TACTICAL MAP UI
```

The UI must consume the same evidence-backed state rather than maintaining independent hardcoded security claims.

### Primary user surfaces

- **Shield** — centralized security state and protection overview.
- **Radar** — passive cellular/BLE observations, signal history and tactical visualization.
- **VPN** — real WireGuard userspace backend, lifecycle monitoring and handshake verification.
- **Call Security** — telephony/MMI diagnostics that Android actually exposes.
- **Legal** — privacy and jurisdiction information.
- **Vault** — subscription/licensing and appearance settings.

Unnecessary dashboards and duplicate status logic should not be added merely to increase feature count.

---

## 📡 SIGNAL INTELLIGENCE MODEL

The radar is designed as a **Signal Intelligence / Correlation Engine**, not a collection of decorative cards.

Each observation is normalized into a common timeline so different data sources can be correlated without pretending they are equivalent.

```text
CELL + OpenCellID + GPS + BLE + NETWORK + VPN
                    │
                    ▼
             SignalObservation
                    │
                    ▼
          Correlation / Anomaly
                    │
                    ▼
              ThreatSnapshot
```

### Signal history

A nearby BLE observation can accumulate a history instead of being treated as a one-shot detection:

```text
BLE-A8F2
RSSI:       -51 → -57 → -49 → -43 dBm
duration:   23 s
distance:   estimated ~4–7 m
risk:       LOW / WATCH / SUSPICIOUS
```

The history expresses persistence and movement of the signal. It does **not** establish ownership, identity or GPS coordinates of the other device.

### Cell correlation

For cellular observations, Sentinel can correlate:

- serving cell
- neighboring cells
- MCC / MNC
- LAC / TAC / CID when exposed
- radio technology
- signal strength
- device GPS
- provider-backed tower coordinates
- network/VPN changes

Example heuristic classification:

```text
0–24    NORMAL
25–49   WATCH
50–74   SUSPICIOUS
75–100  HIGH RISK
```

> **Anomaly score ≠ proof of an IMSI catcher.** A suspicious score is a defensive heuristic. A `VERIFIED` security claim requires evidence strong enough to support that exact claim.

---

## 🗼 OPENCELLID TOWER ENRICHMENT

`OpenCellIdProvider` is an enrichment adapter. It is not treated as an unquestionable source of truth.

```text
TelephonyManager
      ↓
real cell identity
      ↓
OpenCellID lookup
      ↓
provider-backed tower coordinate
      ↓
GPS / distance / consistency correlation
```

The adapter uses the observed cell identity where available:

- MCC
- MNC
- LAC/TAC
- Cell ID
- radio technology

The resulting evidence carries provenance and reported location accuracy/range where the provider supplies it.

### Location consistency

Sentinel should detect inconsistent combinations such as:

```text
DEVICE GPS = A
TOWER = B
EXPECTED RANGE = X
ACTUAL GEOMETRY = inconsistent
```

and surface **LOCATION INCONSISTENCY** rather than silently drawing a trustworthy-looking pin.

The repository intentionally keeps only an API-key placeholder. Never commit a real OpenCellID secret.

```text
OPEN_CELL_ID_API_KEY=...
```

A key that has appeared in chat, screenshots, commits or public logs must be revoked/rotated before production use.

---

## 📶 PASSIVE RADIO CAPABILITIES

### Cellular

Android `TelephonyManager` is used for OS-exposed serving/neighbor cell information. Depending on device, carrier and Android version, the app may receive:

- GSM / 2G
- WCDMA / 3G
- LTE / 4G
- NR / 5G
- serving and neighboring cells
- signal strength
- cell identity fields

Availability differs by hardware, carrier, permission and platform behavior.

### Bluetooth LE

The app uses Android's BLE scanning APIs when the relevant permissions are granted. Observations can include:

- advertisement presence
- RSSI
- timestamp
- local privacy-preserving identifier
- estimated distance when adequate telemetry is available

### Device GPS/GNSS

The user's own device location can include:

- latitude / longitude
- accuracy
- altitude
- speed
- bearing
- provider
- satellite information
- timestamp / freshness

The app must not manufacture a location when Android has not provided a valid fix.

---

## 🗺️ TACTICAL MAP

The tactical map is a visualization of **evidence**, not a fictional military-grade locator.

```text
📍 DEVICE
   real GNSS coordinate

◯ BLE
   signal zone / distance estimate
   no invented direction

◎ CELL
   Android cell observation

🗼 TOWER
   pin only when backed by provider evidence
```

The map can provide:

- live device position
- recentering
- cell/tower overlays
- BLE signal zones
- signal-detail panels
- provider provenance
- map/open-location actions for supported evidence
- radar sweep visualization
- zoom/pan controls

A nearby device's precise GPS location is **not** inferred from the phone's own location service. Precise third-party location requires that device's own consented sharing mechanism or another authorized service.

---

## 🧭 THREAT CORRELATION

Threat detection is based on combining independent observations instead of turning one weak signal into a definitive accusation.

Example:

```text
RADAR
LTE anomaly
   +
NETWORK
unexpected transport change
   +
LOCATION
rapid cell transition
   +
VPN
fresh handshake missing
   ↓
CORRELATION ENGINE
   ↓
THREATSNAPSHOT
   ↓
WATCH / SUSPICIOUS / HIGH RISK
```

The same `ThreatSnapshot` should feed both Radar and Shield so the application has one security source of truth.

---

## 🔐 CAPABILITY / EVIDENCE STATES

Every capability uses the canonical state model:

```text
VERIFIED
UNVERIFIED
UNAVAILABLE
```

Evidence is time-aware and provenance-aware.

```text
fresh + authoritative evidence
            ↓
         VERIFIED

available observation, insufficient proof
            ↓
        UNVERIFIED

unsupported / denied / unavailable
            ↓
        UNAVAILABLE
```

Stale evidence must degrade rather than remain visually trustworthy forever.

All major time-sensitive capabilities should use the same injectable `EvidenceClock` so deterministic tests can exercise:

```text
LIVE → STALE → UNVERIFIED → UNAVAILABLE
```

without waiting on wall-clock time.

---

## 🔒 VPN ARCHITECTURE

Sentinel uses the real WireGuard Android userspace backend and verifies tunnel health using lifecycle state plus peer handshake evidence.

```text
VPN permission
      ↓
GoBackend
      ↓
Tunnel lifecycle
      ↓
Peer handshake
      ↓
Freshness / provenance
      ↓
VERIFIED
```

If critical transport evidence disappears, the controller fails closed instead of showing a stale protected state.

### No `.conf` burden in the primary UX

The user-facing flow should not require manually browsing for and importing `.conf` files.

However, a **real WireGuard endpoint, peer credentials and provisioning source must still exist**. UI code cannot legitimately create a working remote VPN service without an actual server/endpoint and valid cryptographic configuration.

The production goal is:

```text
managed provisioning
      ↓
secure profile delivery
      ↓
GoBackend
      ↓
real handshake
      ↓
VERIFIED
```

not:

```text
fake toggle
      ↓
"Protected Connection"
```

---

## 🛡️ DEFENSIVE ACTIONS

Actions are named according to what Android can actually enforce.

| Action | Meaning |
|---|---|
| **BLOCK NETWORK** | Apply supported local VPN/routing policy to restrict traffic. |
| **BLOCK APP** | Use Android-supported controls where available; never imply universal app termination. |
| **IGNORE SIGNAL** | Suppress a local BLE/cellular observation from repeated warnings. |
| **DISMISS** | Close an alert without changing the underlying radio/network state. |

Sentinel does **not** claim it can physically disable external towers, jam frequencies, extract IMSIs from unrelated subscribers, or shut down another person's phone.

---

## 🕶️ PRIVACY / STEALTH MODE

The practical meaning of "stealth" is **reduced digital exposure**, not radio-spectrum invisibility.

A defensible privacy mode can combine:

- verified VPN when available
- DNS protection / audit
- background network reduction
- ad/telemetry filtering
- Bluetooth discoverability guidance
- location-sharing audit
- permission audit
- public-IP check
- sensitive-app exposure review

Each item should report its own evidence state instead of turning the entire mode into a blanket `SECURED` label.

---

## 🚨 WHAT ANDROID CANNOT PROVIDE

Using ordinary Android application APIs alone, Sentinel cannot reliably:

- read IMSIs of surrounding subscribers
- identify the owner of a nearby phone from passive BLE/cellular telemetry
- retrieve another person's GPS location simply because the phone is nearby
- infer an arbitrary nearby phone's exact GPS position from RSSI
- jam cellular/Bluetooth frequencies
- remotely disable an external cell tower
- prove an IMSI catcher solely from `CellInfo`
- silently access another person's location-sharing service
- scan arbitrary Internet devices without an explicit, authorized workflow

These are product boundaries, not missing UI buttons.

---

## 🌐 NETWORK TELEMETRY

The network layer is reactive and should prefer `ConnectivityManager.NetworkCallback` over continuous polling.

It can expose evidence such as:

- active transport
- validation state
- VPN transport
- interface information
- DNS servers through `LinkProperties`
- blocked/restricted state

Network evidence is correlated into the same threat snapshot as radar and VPN evidence.

---

## 🧪 CI / VALIDATION

The required production validation order is:

```text
1. Verify Gradle configuration
            ↓
2. Assemble release
            ↓
3. Unit tests
            ↓
4. Android lint
            ↓
5. Security / secret checks
            ↓
6. Production gate
            ↓
7. Physical Android validation
            ↓
8. Signed release validation
```

The GitHub Actions workflow must not be considered green because configuration merely starts. The production gate is green only when the complete chain succeeds.

### Current CI blocker

The latest inspected run is **Android CI #185**, commit `3cb36ad5bf82967c589c7ee7098254117483e3a3`. The build stopped during **Verify Gradle configuration** because the Kotlin DSL referenced a non-existent version-catalog accessor:

```text
libs.compose.ui.test.manifest
```

The catalog defines the dependency as:

```text
androidx-compose-ui-test-manifest
```

so the correct Kotlin DSL accessor is:

```text
libs.androidx.compose.ui.test.manifest
```

This was corrected on `main` in commit:

```text
26185248e37b4b8c333d52e8849f8a1acadf09c5
```

Android CI #186 was automatically queued for that commit. Do not label the build PASS until its actual jobs report success.

---

## 📁 CORE ARCHITECTURE

```text
app/src/main/java/com/example/
├── data/
│   ├── AndroidNetworkEvidenceProvider.kt
│   ├── DeviceLocationProvider.kt
│   ├── OpenCellIdProvider.kt
│   ├── SignalRadarProvider.kt
│   └── model/
│       ├── CapabilityEvidence.kt
│       ├── CapabilityEvidenceSnapshot.kt
│       ├── DeviceLocationState.kt
│       └── signal / threat models
│
├── ui/
│   ├── components/
│   │   ├── CapabilityEvidenceCard.kt
│   │   ├── ShieldGaugeCard.kt
│   │   └── Tactical radar/map components
│   └── screens/
│       ├── DashboardScreen.kt
│       ├── ImsiRadarScreen.kt
│       ├── VpnManagerScreen.kt
│       └── CallSecurityScreen.kt
│
└── vpn/
    ├── WireGuardProfileStore.kt
    └── WireGuardTunnelController.kt
```

The long-term invariant is:

```text
one observation model
        ↓
one correlation engine
        ↓
one ThreatSnapshot
        ↓
one Capability/Evidence truth
        ↓
multiple presentation surfaces
```

---

## 🎨 PREMIUM UX PRINCIPLES

### One source of truth

Shield, Radar and other modules must render the same evidence-derived security state.

### Minimal cognitive load

Primary screens show:

```text
STATUS
WHAT WAS OBSERVED
WHY IT MATTERS
WHAT YOU CAN DO
```

Advanced diagnostics remain secondary.

### No fake certainty

Never use a green animation or switch to imply proof that the underlying capability did not provide.

### No fake maps

No invented tower coordinates, no fabricated nearby-phone GPS pins and no arbitrary "rogue" markers presented as real-world facts.

### Premium but honest

The interface can remain cinematic, tactical and visually distinctive while every security claim remains evidence-backed.

---

## 🔑 SECRETS

Never commit API keys, signing credentials, Firebase secrets, WireGuard private keys or provider tokens.

Use the project/CI secret store for values such as:

```text
OPEN_CELL_ID_API_KEY
```

and keep only placeholders in the repository.

Any secret exposed through chat, screenshots, public commits or logs should be considered compromised and rotated.

---

## ✅ RELEASE DEFINITION

Sentinel Shield is **production-ready** only when all of the following are demonstrated:

```text
✅ Complete CI compile/build/test/lint/security gate
✅ Real WireGuard endpoint and fresh handshake
✅ Physical Android validation on representative API levels
✅ Production signing credentials and signed artifact
✅ Final evidence freshness/race validation
✅ No mock data presented as real telemetry
✅ No hardcoded VERIFIED security state
```

Until those proofs exist, the correct state is **94% engineering completion**, not 100% production certification.

---

## 📌 CURRENT CHECKPOINT

```text
94%
 │
 ├── ✅ Evidence / provenance model
 ├── ✅ Reactive network telemetry
 ├── ✅ Device GPS/GNSS
 ├── ✅ Cellular telemetry
 ├── ✅ Passive BLE radar
 ├── ✅ OpenCellID enrichment
 ├── ✅ Signal correlation architecture
 ├── ✅ ThreatSnapshot direction
 ├── ✅ WireGuard lifecycle / handshake verification
 ├── ✅ Production signing guard
 ├── ✅ Premium UI / side navigation
 ├── ✅ CI Kotlin DSL accessor autofix
 │
 ├── 🔄 Android CI #186
 ├── ⏳ CI production PASS
 ├── ⏳ real WireGuard endpoint
 ├── ⏳ physical Android validation
 ├── ⏳ production signing credentials
 └── ⏳ final release validation
 │
 ▼
100% PRODUCTION READINESS
```

---

## 🔗 REPOSITORY

**Sentinel Shield Pro**  
https://github.com/MarkoUzelac/Sentinel-shield-

**GitHub Actions**  
https://github.com/MarkoUzelac/Sentinel-shield-/actions
