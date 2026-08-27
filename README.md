# 🛡️ SENTINEL SHIELD PRO

> Privacy-first Android security console built around evidence-backed network telemetry, passive radio observations, device geolocation, threat correlation and verified WireGuard lifecycle.

[![Android](https://img.shields.io/badge/Android-24%2B-3DDC84?logo=android&logoColor=white)](https://developer.android.com/)
[![Kotlin](https://img.shields.io/badge/Kotlin-2.x-7F52FF?logo=kotlin&logoColor=white)](https://kotlinlang.org/)
[![WireGuard](https://img.shields.io/badge/WireGuard-Real%20backend-88171A?logo=wireguard&logoColor=white)](https://www.wireguard.com/)
[![CI](https://img.shields.io/badge/CI-Android%20build%20%2F%20test%20%2F%20lint-0B5FFF)](.github/workflows/android-ci.yml)

---

## 📊 PROJECT STATUS

### Current engineering checkpoint: **94%**

```text
████████████████████████████████████████████████████████████████████████████████████████████░░░░  94%

IMPLEMENTED / HARDENED                         RELEASE EVIDENCE STILL REQUIRED
───────────────────────────────────────────    ─────────────────────────────────
✅ Signal / evidence model                     ⏳ Complete CI production PASS
✅ GPS/GNSS telemetry                          ⏳ Real WireGuard endpoint
✅ Cellular telemetry                          ⏳ Physical Android validation
✅ BLE radar + signal history                  ⏳ Production keystore/signing
✅ OpenCellID enrichment                       ⏳ Final release validation
✅ Reactive network telemetry                  
✅ Signal Intelligence / correlation           
✅ ThreatSnapshot                              
✅ Unified anomaly history                     
✅ WireGuard lifecycle + handshake evidence    
✅ Production signing guard                   
```

**94% is an engineering/readiness indicator, not production certification.** The percentage does not increase until the required release evidence is actually demonstrated.

---

## 🚦 CURRENT CI CHECKPOINT

The current `main` branch is commit:

```text
bf40a2f358ff8a8c50c27e33f515c567dde90b28
fix: restore valid Gradle catalog aliases
```

The latest inspected **Android CI #194** completed with:

```text
Checkout                         PASS
JDK 17                           PASS
Set up Gradle                    PASS
Verify Gradle configuration     FAIL
Assemble release                 SKIPPED
Unit tests                       SKIPPED
Android lint                     SKIPPED
Production gate                  FAIL
```

The separate **Dependency and secret security** job in the same Android CI run passed, including Gitleaks.

The failure is therefore still a **Gradle configuration gate blocker**. The stack trace/exit code alone is not treated as the root cause; the first actionable Gradle/Kotlin error must be identified from the lines above the stack trace before applying another fix.

### CI release gate

The required order is:

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

A run is **not PASS** merely because Gradle starts or the security job succeeds. The production gate must observe the complete successful chain.

> **Rule:** no percentage increase and no production-ready claim while `Verify Gradle configuration` or any downstream release gate is red.

---

## 🎯 PRODUCT DIRECTION

Sentinel Shield follows one architectural principle: **one evidence stream, one security source of truth, multiple presentation surfaces.**

```text
ANDROID / OS TELEMETRY
   ├── GPS / GNSS
   ├── Cellular
   ├── Bluetooth LE
   └── Network / VPN
            │
            ▼
     SIGNAL OBSERVATIONS
            │
            ▼
   NORMALIZATION + HISTORY
            │
            ▼
    CORRELATION / ANOMALY
            │
            ▼
      THREATSNAPSHOT
            │
      ┌─────┴─────┐
      ▼           ▼
    RADAR       SHIELD
```

Shield, Radar and future security surfaces must consume the same evidence-derived `ThreatSnapshot`. Independent hardcoded warning logic is not considered an acceptable security architecture.

---

## 📡 SIGNAL INTELLIGENCE / CORRELATION ENGINE

The radar is an evidence correlation system rather than a collection of decorative status cards.

The normalized evidence stream combines:

```text
CELL + OpenCellID + GPS + BLE + NETWORK + VPN
                    │
                    ▼
             SignalObservation
                    │
                    ▼
          Unified signal history
                    │
                    ▼
            Anomaly correlation
                    │
                    ▼
              ThreatSnapshot
```

### Evidence sources

- **Cellular:** serving/neighboring cells, MCC/MNC, LAC/TAC/CID when Android exposes them, radio technology and signal strength.
- **OpenCellID:** provider enrichment for observed cell identities; provider provenance and accuracy must remain visible.
- **GPS/GNSS:** the user's own device location, accuracy, speed, bearing and freshness where exposed.
- **BLE:** advertisement observations, RSSI, timestamps and privacy-preserving local identifiers.
- **Network:** active transport, validation, VPN state and exposed link/DNS evidence.
- **WireGuard:** lifecycle state plus peer handshake freshness.

### Unified history

Signal observations are time-correlated so persistence and changes can be evaluated across samples. Historical data must not be presented as proof of ownership, identity or exact third-party location.

Example heuristic score:

```text
0–24    NORMAL
25–49   WATCH
50–74   SUSPICIOUS
75–100  HIGH RISK
```

Anomaly scoring is a defensive heuristic. **A suspicious score is not proof of an IMSI catcher or another specific attack.**

---

## 🧭 THREATSNAPSHOT — SINGLE SOURCE OF TRUTH

`ThreatSnapshot` is the canonical security state produced by correlation.

```text
Signal observations
      +
Network evidence
      +
VPN evidence
      +
Historical anomalies
      ↓
Correlation engine
      ↓
ThreatSnapshot
      ↓
Shield + Radar + security surfaces
```

The same snapshot must drive:

- threat severity
- evidence freshness
- anomaly history presentation
- security summary
- Radar alerts
- Shield dashboard state

No UI surface should manufacture a separate `SECURED`, `THREAT`, `VERIFIED` or equivalent state that conflicts with the canonical snapshot.

---

## 🔐 CAPABILITY / EVIDENCE STATES

Capabilities use explicit evidence states:

```text
VERIFIED
UNVERIFIED
UNAVAILABLE
```

Time-sensitive evidence is freshness-aware:

```text
LIVE → STALE → UNVERIFIED → UNAVAILABLE
```

An injectable `EvidenceClock` is preferred for deterministic tests so freshness transitions can be validated without waiting for wall-clock time.

`VERIFIED` means the available evidence supports that exact claim. It must never be used merely because a feature is enabled or a UI toggle is active.

---

## 🔒 WIREGUARD ARCHITECTURE

Sentinel uses the real WireGuard Android userspace backend and treats lifecycle state and peer handshake freshness as transport evidence.

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
VERIFIED transport evidence
```

A real production VPN still requires a real endpoint, peer credentials and valid cryptographic configuration. A local UI switch cannot create a working remote VPN service.

If critical transport evidence disappears, the application must not continue presenting a stale protected state.

---

## 🗼 OPENCELLID ENRICHMENT

OpenCellID is an enrichment provider, not an unquestionable source of truth.

```text
TelephonyManager
      ↓
Observed cell identity
      ↓
OpenCellID lookup
      ↓
Provider-backed tower evidence
      ↓
GPS / distance / consistency correlation
```

Never commit a real API key. The repository should contain only a placeholder such as:

```text
OPEN_CELL_ID_API_KEY=...
```

Any key exposed in source, screenshots, chat or logs should be rotated before production use.

---

## 🗺️ TACTICAL MAP PRINCIPLES

The map visualizes evidence; it does not invent intelligence.

```text
📍 DEVICE   = real device GNSS evidence
◎ CELL     = Android cell observation
🗼 TOWER    = provider-backed enrichment only
◯ BLE      = signal zone / distance estimate only
```

The application must not claim to know a nearby third-party phone's exact GPS location from BLE RSSI, cellular observations or the user's own GPS.

No fabricated tower coordinates, arbitrary "rogue" pins or unsupported military-grade location claims.

---

## 🕶️ PRIVACY / STEALTH MODE

"Stealth" means reduced digital exposure, not invisibility from radio networks.

A defensible privacy mode may combine:

- verified VPN when available
- DNS/network protection and audit
- background network reduction
- telemetry/ad filtering where technically supported
- Bluetooth discoverability guidance
- location-sharing audit
- permission audit
- public-IP verification
- sensitive-app exposure review

Every component should report its own evidence state. The entire mode must not become a blanket `SECURED` claim without supporting evidence.

---

## 🚨 ANDROID CAPABILITY BOUNDARIES

Using ordinary Android application APIs alone, Sentinel cannot reliably:

- read IMSIs of surrounding subscribers
- identify the owner of a nearby phone from passive BLE/cellular telemetry
- retrieve another person's GPS location simply because the phone is nearby
- infer arbitrary third-party exact GPS coordinates from RSSI
- jam cellular/Bluetooth frequencies
- remotely disable an external cell tower
- prove an IMSI catcher solely from `CellInfo`
- silently access another person's location-sharing service

These are platform/security boundaries, not missing UI controls.

---

## 🛡️ DEFENSIVE ACTIONS

Actions are named according to what Android can actually enforce.

| Action | Meaning |
|---|---|
| **BLOCK NETWORK** | Apply supported local VPN/routing policy to restrict traffic. |
| **BLOCK APP** | Use Android-supported controls where available; never imply universal process termination. |
| **IGNORE SIGNAL** | Suppress a local observation from repeated warnings. |
| **DISMISS** | Close an alert without changing the underlying radio/network state. |

Sentinel does not claim to disable external towers, jam frequencies or control unrelated devices.

---

## 📁 CORE ARCHITECTURE

```text
app/src/main/java/com/example/
├── data/
│   ├── AndroidNetworkEvidenceProvider.kt
│   ├── DeviceLocationProvider.kt
│   ├── OpenCellIdProvider.kt
│   ├── SecurityRepository.kt
│   ├── SignalIntelligenceCoordinator.kt
│   ├── SignalIntelligenceEngine.kt
│   ├── SignalRadarProvider.kt
│   ├── ThreatSnapshotStore.kt
│   ├── local/
│   │   ├── AppDatabase.kt
│   │   ├── ScanLogDao.kt
│   │   └── ScanLogEntity.kt
│   └── model/
│       └── evidence / signal / threat models
│
├── ui/
│   ├── components/
│   │   ├── CapabilityEvidenceCard.kt
│   │   ├── ShieldGaugeCard.kt
│   │   └── tactical radar/map components
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

Architectural invariant:

```text
one observation model
        ↓
one correlation engine
        ↓
one ThreatSnapshot
        ↓
one evidence truth
        ↓
multiple presentation surfaces
```

---

## 🧪 TESTING / VALIDATION POLICY

The test suite must cover the correlation engine and its boundary conditions, including:

- deterministic evidence freshness
- cellular/BLE/network/VPN correlation
- historical anomaly accumulation
- severity transitions
- stale evidence degradation
- ThreatSnapshot consistency
- Shield/Radar shared-state behavior
- WireGuard handshake verification
- unavailable/permission-denied capability states

A test is considered implemented only after it is actually present in the repository and executed by CI. A proposed or locally described test does not count as repository evidence.

---

## 🔑 SECRETS

Never commit:

- API keys
- signing credentials
- Firebase secrets
- WireGuard private keys
- provider tokens
- production credentials

Use the CI/project secret store and repository placeholders only.

---

## 🚀 RELEASE DEFINITION

Sentinel Shield is production-ready only when all of the following are demonstrated:

```text
✅ Gradle configuration PASS
✅ assembleRelease PASS
✅ unit tests PASS
✅ Android lint PASS
✅ security / secret checks PASS
✅ production gate PASS
✅ real WireGuard endpoint + fresh handshake
✅ physical Android validation
✅ production signing + signed artifact
✅ final evidence freshness/race validation
✅ no mock telemetry presented as real
✅ no hardcoded VERIFIED state
```

Until every required gate is green, the project remains below 100% and is not presented as production-certified.

---

## 📌 CURRENT CHECKPOINT

```text
94%
 │
 ├── ✅ Device geolocation
 ├── ✅ Cellular telemetry
 ├── ✅ BLE radar + signal history
 ├── ✅ OpenCellID tower enrichment
 ├── ✅ Reactive network
 ├── ✅ WireGuard lifecycle / handshake evidence
 ├── ✅ Unified signal observation model
 ├── ✅ Signal Intelligence Engine
 ├── ✅ Threat correlation / ThreatSnapshot
 ├── ✅ Unified anomaly history
 │
 ├── 🔴 CI production gate
 │      └── Verify Gradle configuration currently FAILS
 ├── ⏳ Physical Android validation
 ├── ⏳ Real WireGuard endpoint validation
 ├── ⏳ Production signing credentials
 └── ⏳ Final release validation
 │
 ▼
100%
```

**Do not increase the percentage until the complete CI chain is green.**

---

## 🔗 PROJECT

- Repository: https://github.com/MarkoUzelac/Sentinel-shield-
- Actions: https://github.com/MarkoUzelac/Sentinel-shield-/actions
- Latest Android CI run observed: #194
- Current main commit: `bf40a2f358ff8a8c50c27e33f515c567dde90b28`

_Last status update: 2026-08-27._
