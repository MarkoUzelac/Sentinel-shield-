# 🛡️ SENTINEL SHIELD PRO

> **Privacy-first Android security console with real WireGuard transport, verified lifecycle state, evidence provenance and fail-closed security semantics.**

[![Android](https://img.shields.io/badge/Android-24%2B-3DDC84?logo=android&logoColor=white)](https://developer.android.com/)
[![Kotlin](https://img.shields.io/badge/Kotlin-2.x-7F52FF?logo=kotlin&logoColor=white)](https://kotlinlang.org/)
[![WireGuard](https://img.shields.io/badge/WireGuard-Real%20backend-88171A?logo=wireguard&logoColor=white)](https://www.wireguard.com/)
[![CI](https://img.shields.io/badge/CI-Android%20build%20%2F%20test%20%2F%20lint-0B5FFF)](.github/workflows/android-ci.yml)
[![Security model](https://img.shields.io/badge/Security-VERIFIED%20%2F%20UNVERIFIED%20%2F%20UNAVAILABLE-111827)](#-evidence-and-verification-model)

---

## 📊 PROJECT PROGRESS

### Current engineering completion: **90%**

```text
██████████████████████████████████████████████████████████████████████████████████████████░░░░░░░░░░  90%

IMPLEMENTED / HARDENED                                                   REMAINING
└─────────────────────────────────────────────────────────────────────────┴──────────────┘
                          90%                                             10%
```

**Što ovaj postotak znači:** ovo je **inženjerska procjena dovršenosti arhitekture i implementacijskog scopea**, a ne sigurnosna certifikacija i ne jamstvo produkcijske sigurnosti. Preostalih ~10% odnosi se prvenstveno na stvarnu produkcijsku infrastrukturu, završni CI verification gate, realni WireGuard endpoint/configuration i zamjenu svih preostalih ograničenih ili heurističkih izvora podataka.

### ✅ Završeno

| Područje | Status |
|---|---|
| Premium Sentinel Shield UI / navigation | ✅ Implementirano |
| Centralni Capability / Evidence model | ✅ Implementirano |
| Evidence provenance | ✅ Implementirano |
| `VERIFIED / UNVERIFIED / UNAVAILABLE` semantika | ✅ Implementirano |
| Lazy evidence expiry | ✅ Implementirano |
| WireGuard GoBackend transport | ✅ Implementirano |
| VPN lifecycle state machine | ✅ Implementirano |
| Handshake verification | ✅ Implementirano |
| Post-start handshake requirement | ✅ Implementirano |
| Fail-closed cleanup | ✅ Implementirano |
| Transition journal | ✅ Implementirano |
| Network `ConnectivityManager` provider | ✅ Implementirano |
| `NetworkCallback` reactive updates | ✅ Implementirano |
| `NetworkCapabilities` / `LinkProperties` evidence | ✅ Implementirano |
| Real HTTPS network probe | ✅ Implementirano |
| HIBP breach provider adapter | ✅ Implementirano |
| Radar / Telephony evidence | ✅ Implementirano |
| CI build/test/lint pipeline | ✅ Implementirano |
| Secret scan / security job | ✅ Implementirano |

### ⏳ Preostalo do 100%

| Stavka | Prioritet |
|---|---|
| Završiti i potvrditi posljednji CI production gate | 🔴 Kritično |
| Potpuno vezati `MainViewModel` na reactive network provider | 🔴 Kritično |
| Injektabilni clock kroz cijeli evidence pipeline | 🔴 Kritično |
| End-to-end virtual-time/race testovi za VPN + freshness | 🔴 Kritično |
| Stvarni WireGuard server endpoint i produkcijski profil | 🔴 Kritično |
| HIBP API key konfiguracija u stvarnom deploy okruženju | 🟠 Visoko |
| Jači network security proof beyond connectivity evidence | 🟠 Visoko |
| Završni Android manifest / foreground-service production audit | 🟠 Visoko |
| Release signing + reproducible release process | 🟠 Visoko |
| Device/integration testing na fizičkom Android uređaju | 🟠 Visoko |

---

## 🎯 PRODUCT GOAL

Sentinel Shield Pro je zamišljen kao Android security console koja objedinjuje:

- 🛡️ **Shield** — jedinstveni prikaz sigurnosnog stanja
- 📡 **Radar & IMSI** — stvarna telephony/cell evidencija uz konzervativnu interpretaciju
- 🔐 **VPN Tunnel** — WireGuard transport i provjereni handshake lifecycle
- ☎️ **Call Security** — MMI / call-security pomoćni sloj
- 🤖 **AI Threat Analysis** — analiza prijetnji bez automatskog proglašavanja kompromitiranosti uređaja
- 🌐 **Network Audit** — stvarno mrežno stanje + HTTPS/TLS probe
- 🌑 **Breach Lookup** — provider-based breach intelligence
- ⚖️ **Legal Rights** — lokalni informativni vodiči i reference
- ⚙️ **Vault / Settings** — konfiguracija, licence i vizualni skinovi

---

## 🧠 ARCHITECTURE

```text
┌────────────────────────────────────────────────────────────┐
│                    SENTINEL SHIELD UI                     │
│ Dashboard · Radar · VPN · Call Security · AI · Network    │
└──────────────────────────────┬─────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────┐
│             Capability / Evidence Snapshot                 │
│        Single source of truth for security status           │
└──────────────────────────────┬─────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────┐
│                 Evidence Provenance Layer                   │
│ source · collectedAt · runtimeBacked · verificationRule   │
│ freshness / expiry                                          │
└───────────────┬─────────────────┬───────────────────────────┘
                │                 │
        ┌───────▼───────┐ ┌──────▼────────────────────────┐
        │ Android APIs  │ │     Runtime security engines   │
        │ Telephony     │ │ WireGuard · HTTPS · HIBP       │
        │ Connectivity  │ │ handshake · lifecycle · probe  │
        └───────────────┘ └──────────────────────────────────┘
```

### Design principle

> **UI does not decide security. Evidence does.**

Svaki modul vraća dokaz koji ima izvor, timestamp, verification rule i status. UI samo prikazuje rezultat centralnog modela.

---

## 🔐 EVIDENCE & VERIFICATION MODEL

Tri dopuštena statusa:

```text
VERIFIED
  │
  ├─ postoji konkretan runtime/device dokaz
  ├─ verification rule je zadovoljen
  └─ evidence je još uvijek svjež

UNVERIFIED
  │
  ├─ postoji djelomičan ili heuristički dokaz
  ├─ dokaz je nepotpun
  └─ ili je prethodno VERIFIED evidence istekao

UNAVAILABLE
  │
  ├─ izvor nije dostupan
  ├─ potrebna permission/capability nedostaje
  └─ ili provider nije konfiguriran
```

### Primjer: WireGuard

```text
Profile exists
    ↓
Transport starts
    ↓
Peer handshake observed
    ↓
Handshake is post-start + fresh
    ↓
VERIFIED
```

Ako handshake istekne:

```text
VERIFIED
   ↓ expiresAt
UNVERIFIED
```

Stari dokaz ne postaje automatski novi dokaz.

### Primjer: Radar

```text
TelephonyManager + CellInfo
        ↓
real observation
        ↓
UNVERIFIED
```

Sentinel **ne proglašava IMSI catcher samo zato što postoji neobična ćelijska evidencija**. To je namjerno konzervativan sigurnosni model.

---

## ⏱️ FRESHNESS / EXPIRY

Evidence ima:

```kotlin
lastCheckedEpochMs
expiresAtEpochMs
```

Status se može evaluirati lijeno:

```text
now < expiresAt     → originalni status
now ≥ expiresAt     → UNVERIFIED
UNAVAILABLE         → UNAVAILABLE
```

Ne postoji globalni ticker koji umjetno mijenja svaki capability. Kritični sustavi poput VPN-a mogu imati vlastiti aktivni watchdog.

---

## 📡 NETWORK EVIDENCE

Mrežni sloj koristi Android `ConnectivityManager.NetworkCallback` za reaktivno praćenje promjena mreže.

Prikupljeni runtime signali uključuju:

- transport (`WIFI`, `CELLULAR`, `VPN`, `ETHERNET`, ...)
- validated state
- blocked state
- DNS poslužitelje
- interface name
- link properties
- VPN transport presence

Dodatno postoji stvarni HTTPS probe za mjerenje dostupnosti i round-trip ponašanja.

### Važno

```text
VALIDATED NETWORK
       ≠
SECURE NETWORK
```

Android može potvrditi mrežnu dostupnost/validaciju, ali to samo po sebi nije dokaz da mreža nema MITM, kompromitirani gateway, zlonamjerni DNS ili nadzor.

---

## 🛡️ WIREGUARD LIFECYCLE

Glavni lifecycle:

```text
DISCONNECTED
     ↓
AWAITING USER CONSENT
     ↓
STARTING
     ↓
VERIFYING
     ↓
CONNECTED
```

Failure path:

```text
VERIFYING / CONNECTED
        ↓
handshake stale / transport unhealthy
        ↓
FAIL CLOSED
        ↓
transport.stop()
        ↓
ERROR / DISCONNECTED
```

Cleanup koristi `NonCancellable` kako bi se kritični `transport.stop()` izvršio i kada je parent lifecycle coroutine već otkazan.

### Invariant

`CONNECTED` nije valjano stanje bez odgovarajućeg handshake dokaza.

Svaki prijelaz prolazi kroz centralni invariant layer prije objave u state stream.

---

## 🧪 TEST STRATEGY

Test suite je organiziran oko nekoliko razina:

```text
Transition contract tests
        ↓
Invariant tests
        ↓
Freshness / expiry tests
        ↓
Handshake tests
        ↓
Race-condition tests
        ↓
Integration / device tests
```

Za coroutine vrijeme koristi se virtualno vrijeme (`runTest`, test dispatcher i scheduler), tako da timeout testovi ne ovise o stvarnom čekanju.

Posebno važni scenariji:

- `CONNECTED → stale handshake → failClosed`
- stari timeout ne smije srušiti novu verificiranu sesiju
- `BACKEND_UP + NO_HANDSHAKE → VERIFYING → ERROR`
- expired `VERIFIED → UNVERIFIED`
- nedostupan provider → `UNAVAILABLE`
- duplicate capability IDs moraju pasti na validationu

---

## 🌑 BREACH INTELLIGENCE

Sentinel koristi provider/adaptor princip za breach intelligence.

HIBP account lookup je stvarni eksterni provider. Bez odgovarajućeg API ključa Sentinel ne smije simulirati rezultate; capability mora ostati `UNAVAILABLE`.

Važno:

> **Breach lookup nije isto što i potpuni dark-web crawling.**

UI i dokumentacija trebaju koristiti terminologiju koja odgovara stvarnoj sposobnosti providera.

---

## 🤖 AI THREAT ANALYSIS

AI rezultat je tretiran kao **analitički output**, ne kao dokaz kompromitiranosti uređaja.

Primjer:

```text
AI says: HIGH RISK
        ↓
AI_THREAT_ANALYSIS = UNVERIFIED
```

Za `VERIFIED` potrebna je odgovarajuća neovisna runtime evidence, a ne samo AI klasifikacija.

---

## ⚖️ LEGAL / PRIVACY

Legal modul služi kao informativni vodič. Ne predstavlja pravno zastupanje i ne bi trebao prikazivati dinamične pravne zaključke kao činjenice bez provjerenog izvora i jurisdikcijskog konteksta.

---

## 🧩 PROJECT STRUCTURE

```text
app/
├── src/main/java/com/example/
│   ├── data/
│   │   ├── model/
│   │   │   ├── CapabilityEvidence.kt
│   │   │   ├── CapabilityEvidenceSnapshot.kt
│   │   │   └── SecurityModels.kt
│   │   ├── SecurityRepository.kt
│   │   └── local/
│   │
│   ├── ui/
│   │   ├── screens/
│   │   └── viewmodel/
│   │       └── MainViewModel.kt
│   │
│   └── vpn/
│       ├── WireGuardHandshakeVerifier.kt
│       ├── WireGuardTunnelController.kt
│       ├── WireGuardTunnelState.kt
│       └── WireGuardTransitionJournal.kt
│
├── src/test/java/com/example/
│   ├── CapabilityEvidenceEngineTest.kt
│   ├── CapabilityEvidenceSnapshotTest.kt
│   └── vpn/
│       ├── WireGuardHandshakeVerifierTest.kt
│       ├── WireGuardInvariantTest.kt
│       ├── WireGuardInvariantMatrixTest.kt
│       ├── WireGuardTransitionJournalTest.kt
│       └── WireGuardTunnelStateTest.kt
│
└── build.gradle.kts

.github/workflows/
└── android-ci.yml
```

---

## 🚦 CI PIPELINE

Current workflow:

```text
Checkout
   ↓
JDK 17
   ↓
Gradle 9.3.1
   ↓
Verify Gradle configuration
   ↓
Assemble release
   ↓
Unit tests
   ↓
Android lint

Parallel security job:
   ├── Dependency review (when supported)
   └── Gitleaks secret scan

                ↓
        PRODUCTION GATE
```

The production gate requires both build/test/lint and dependency/secret security jobs to succeed. fileciteturn354file0L1-L6

---

## ⚙️ CONFIGURATION

The repository intentionally does not contain production credentials.

Expected optional provider configuration:

```text
HIBP_API_KEY=<your HIBP API key>
GEMINI_API_KEY=<your Gemini API key>
```

Use the project's secret/configuration mechanism in the actual build environment. Never commit real API keys, private keys or WireGuard client private keys to Git.

---

## 📱 ANDROID VPN REQUIREMENTS

The Android application uses `VpnService` authorization and the WireGuard Android tunnel backend. The manifest currently declares the WireGuard `GoBackend$VpnService` and foreground-service configuration. The final release still requires a dedicated production audit of permissions, service type and Android-version behavior.

---

## 🔒 SECURITY RULES

1. **Never turn a missing source into fake success.**
2. **Never treat a local UI toggle as independent proof of protection.**
3. **Never treat AI output as direct device compromise proof.**
4. **Never treat cell information alone as IMSI-catcher proof.**
5. **Never report a stale `VERIFIED` evidence item as current.**
6. **Never ship production secrets in source control.**
7. **Fail closed when critical WireGuard evidence disappears.**

---

## 📌 CURRENT PRODUCTION READINESS

### 🟢 Strongly implemented

- Real WireGuard backend integration
- Lifecycle/state hardening
- Handshake verification
- Invariant enforcement
- Transition journaling
- Centralized capability evidence
- Evidence provenance
- Freshness/expiry semantics
- Reactive network observation
- Real network probe
- Real breach-provider adapter
- Security-focused CI structure

### 🟡 Needs final validation

- Physical-device integration testing
- Production WireGuard endpoint/profile
- Full reactive wiring of every UI consumer
- End-to-end virtual-time race matrix
- Provider credentials/configuration in deploy environment
- Android foreground-service production audit
- Release signing / reproducible release process

### 🔴 Not claimed as implemented

- Universal IMSI-catcher detection
- Complete dark-web crawling
- Device-wide malware detection
- Guaranteed anonymity/privacy against all adversaries
- Proven security of every external network

---

## 🏁 DEFINITION OF DONE — 100%

Sentinel Shield can be considered **production-ready for the defined scope** only when all of the following are true:

```text
[ ] Android CI: build PASS
[ ] Unit tests: PASS
[ ] Lint: PASS
[ ] Security gate: PASS
[ ] Physical device integration: PASS
[ ] Real WireGuard server handshake: PASS
[ ] VPN fail-closed tests: PASS
[ ] Freshness/race matrix: PASS
[ ] Connectivity callback end-to-end wiring: PASS
[ ] HIBP production configuration: PASS
[ ] No demo data presented as live evidence
[ ] No secrets committed
[ ] Release signing verified
[ ] Production manifest/FGS audit verified
```

---

## 📚 PRIMARY SOURCES

- [Android `VpnService`](https://developer.android.com/reference/android/net/VpnService)
- [Android `ConnectivityManager.NetworkCallback`](https://developer.android.com/reference/android/net/ConnectivityManager.NetworkCallback)
- [Android reading network state](https://developer.android.com/develop/connectivity/network-ops/reading-network-state)
- [WireGuard](https://www.wireguard.com/)
- [WireGuard Android](https://github.com/WireGuard/wireguard-android)
- [Have I Been Pwned API](https://haveibeenpwned.com/API/v3)
- [Kotlin Coroutines Test](https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-test/)

---

## 🛠️ DEVELOPMENT PRINCIPLE

> **Make the security claim no stronger than the evidence behind it.**

To je temelj cijelog Sentinel Shield arhitektonskog modela: stvarni signal → provenance → verification rule → capability status → UI.
