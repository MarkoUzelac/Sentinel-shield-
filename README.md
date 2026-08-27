# 🛡️ SENTINEL SHIELD PRO

> **Privacy-first Android security console with real WireGuard transport, verified lifecycle state, evidence provenance, reactive network telemetry and fail-closed security semantics.**

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

> **Napomena:** 90% je inženjerska procjena dovršenosti arhitekture i implementacijskog scopea. Nije sigurnosna certifikacija niti jamstvo produkcijske sigurnosti.

### ✅ Završeno

| Područje | Status |
|---|---|
| Premium Sentinel Shield UI / navigation | ✅ |
| Centralni Capability / Evidence model | ✅ |
| Evidence provenance | ✅ |
| `VERIFIED / UNVERIFIED / UNAVAILABLE` semantika | ✅ |
| Lazy evidence expiry | ✅ |
| Injectable evidence clock | ✅ |
| WireGuard GoBackend transport | ✅ |
| VPN lifecycle state machine | ✅ |
| Post-start handshake verification | ✅ |
| Fail-closed cleanup | ✅ |
| Transition journal / invariants | ✅ |
| Reactive `ConnectivityManager.NetworkCallback` | ✅ |
| `NetworkCapabilities` / `LinkProperties` evidence | ✅ |
| Real HTTPS network probe | ✅ |
| HIBP provider adapter | ✅ |
| Radar / Telephony evidence | ✅ |
| MainViewModel → reactive network integration | ✅ |
| Production signing guard | ✅ |
| CI build/test/lint/security workflow | ✅ |
| Production readiness documentation | ✅ |
| Compose BOM coordinate correction | ✅ |

### ⏳ Preostalo do 100%

| Gate | Prioritet | Stanje |
|---|---|---|
| Kotlin compile errors nakon `assembleRelease` | 🔴 Kritično | ⏳ |
| `google-services.json` / production Firebase konfiguracija | 🔴 Kritično | ⏳ |
| CI Production Gate = PASS | 🔴 Kritično | ⏳ |
| E2E virtual-time/race testovi na release buildu | 🔴 Kritično | ⏳ |
| Stvarni WireGuard server endpoint / production profile | 🔴 Kritično | ⏳ |
| Fizički Android device validation | 🟠 Visoko | ⏳ |
| Production keystore + signed AAB/APK | 🟠 Visoko | ⏳ |
| Konačni Android 14+ FGS / manifest audit | 🟠 Visoko | ⏳ |
| Final release verification | 🟠 Visoko | ⏳ |

---

## 🚦 CURRENT CI STATUS

### Android CI #108 — **FAIL**

Commit koji je CI izvršio:

```text
bd37a5f1bac36e0c079265b78ea27879e0bd3ab8
```

CI je dokazao da je Gradle konfiguracijski sloj sada prolazan:

```text
Set up job                  ✅
Checkout                    ✅
JDK 17                      ✅
Gradle 9.3.1                ✅
Verify Gradle configuration ✅
Assemble release             ❌
Unit tests                   ⏭️
Android lint                ⏭️
Production gate              ❌
```

### Što je #108 pronašao

Dependency resolution više nije primarni blocker. Build je došao do `compileReleaseKotlin`, a zatim pao na stvarnim Kotlin pogreškama.

Ključni compile-time problemi:

```text
SecurityRepository.kt:228
→ pogrešan Function2 / Function1 poziv u buildList izrazu

AiScannerScreen.kt:363
→ unresolved reference: sendSentinelChatMessage

DarkWebMonitorScreen.kt:128
→ unresolved reference: searchDarkWebBreaches

DashboardScreen.kt:42, 86, 173
→ unresolved reference: clip

NetworkSpeedScreen.kt
→ unresolved reference: MetricCard
→ unresolved reference: AuditItemRow

VpnManagerScreen.kt
→ Text(...) overload/type mismatch na više mjesta

MainViewModel.kt:331, 343, 358
→ više argument type mismatch grešaka i nedostajući detailsJson

WireGuardProfileStore.kt:22-23
→ Config.parse lambda/type problem
→ unresolved reference: getPeers
```

CI je također zabilježio:

```text
File google-services.json is missing.
The Google Services Plugin cannot function without it.
```

te manifest warning da je `foregroundServiceType` označen za replacement iako druga deklaracija nije pronađena. Warning trenutno nije glavni compile blocker, ali ostaje release-audit stavka.

### Zaključak

```text
OLD blocker
Compose / Gradle dependency resolution
             ↓
             ✅ ZATVORENO
             ↓
CURRENT blocker
Kotlin source compilation
             ↓
google-services.json configuration
             ↓
manifest cleanup / final audit
```

---

## 🎯 PRODUCT GOAL

Sentinel Shield Pro objedinjuje:

- 🛡️ **Shield** — centralni prikaz sigurnosnog stanja
- 📡 **Radar & IMSI** — stvarna telephony/cell evidencija uz konzervativnu interpretaciju
- 🔐 **VPN Tunnel** — WireGuard transport i verificirani handshake lifecycle
- ☎️ **Call Security** — MMI / call-security pomoćni sloj
- 🤖 **AI Threat Analysis** — analitički output bez automatskog proglašavanja kompromitiranosti
- 🌐 **Network Audit** — stvarno mrežno stanje + HTTPS/TLS probe
- 🌑 **Breach Lookup** — provider-based breach intelligence
- ⚖️ **Legal Rights** — informativni vodiči i pravne reference
- ⚙️ **Vault / Settings** — konfiguracija, licence i skinovi

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

Svaki modul proizvodi ili prikazuje evidence zapis koji ima izvor, vrijeme prikupljanja, verification rule, provenance i freshness. UI ne smije samostalno eskalirati status.

---

## 🔐 EVIDENCE & VERIFICATION MODEL

Tri dopuštena statusa:

```text
VERIFIED
  │
  ├─ postoji konkretan runtime/device dokaz
  ├─ verification rule je zadovoljen
  └─ evidence je svjež

UNVERIFIED
  │
  ├─ postoji djelomičan dokaz
  ├─ dokaz je heuristički/nepotpun
  └─ ili je prethodno VERIFIED evidence istekao

UNAVAILABLE
  │
  ├─ izvor nije dostupan
  ├─ permission/capability nedostaje
  └─ provider nije konfiguriran
```

### Pravilo svježine

```text
now < expiresAt     → originalni status
now ≥ expiresAt     → UNVERIFIED
UNAVAILABLE         → UNAVAILABLE
```

Istekli dokaz nije automatski novi dokaz.

---

## ⏱️ FRESHNESS / EXPIRY

Evidence nosi najmanje:

```text
lastCheckedEpochMs
expiresAtEpochMs
```

Valjanost se računa centralno preko injektabilnog clocka.

Za kritične protokole poput WireGuarda postoji dodatni aktivni watchdog. Za obične capabilityje koristi se lazy evaluation kako bi sustav ostao determinističan i bez nepotrebnog globalnog tickera.

---

## 📡 REACTIVE NETWORK EVIDENCE

Mrežni sloj koristi Android `ConnectivityManager.NetworkCallback`.

Runtime evidence uključuje:

- transport (`WIFI`, `CELLULAR`, `VPN`, `ETHERNET`, ...)
- validated state
- blocked state
- DNS servere
- interface name
- link properties
- VPN transport presence

`NetworkCallback` je povezan na `MainViewModel`, pa promjene mreže automatski osvježavaju centralni evidence snapshot.

### Važno

```text
VALIDATED NETWORK
       ≠
SECURE NETWORK
```

Mrežna validacija nije dokaz odsutnosti MITM-a, kompromitiranog gatewaya, zlonamjernog DNS-a ili nadzora.

---

## 🛡️ WIREGUARD LIFECYCLE

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

`CONNECTED` zahtijeva post-start, svježi handshake dokaz.

Kritični cleanup koristi `NonCancellable` kako bi `transport.stop()` završio i u slučaju otkaza parent coroutinea.

---

## 🧪 TEST STRATEGY

```text
Transition contracts
        ↓
Invariant checks
        ↓
Freshness / expiry
        ↓
Handshake verification
        ↓
Race-condition tests
        ↓
Integration / device tests
        ↓
Release validation
```

Coroutine timeout testovi koriste virtualno vrijeme (`runTest` + test dispatcher), tako da ne ovise o stvarnom čekanju.

Ključni scenariji:

- `BACKEND_UP + NO_HANDSHAKE → VERIFYING → ERROR`
- `CONNECTED + stale handshake → failClosed`
- stari timeout ne smije srušiti novu sesiju
- `VERIFIED → UNVERIFIED` nakon expiryja
- nedostajući provider → `UNAVAILABLE`
- duplicate capability ID → validation failure

---

## 🌑 BREACH INTELLIGENCE

Sentinel koristi provider/adaptor model.

HIBP account lookup je stvarni eksterni provider. Bez odgovarajućeg API ključa aplikacija ne smije simulirati breach rezultate.

> **Breach lookup nije isto što i potpuni dark-web crawling.**

UI i dokumentacija moraju koristiti terminologiju koja odgovara stvarnoj sposobnosti providera.

---

## 🤖 AI THREAT ANALYSIS

AI rezultat je analitički signal, a ne neovisni dokaz kompromitiranosti uređaja.

```text
AI says: HIGH RISK
        ↓
AI_THREAT_ANALYSIS = UNVERIFIED
```

Za `VERIFIED` potreban je odgovarajući runtime dokaz iz neovisnog izvora.

---

## ⚖️ LEGAL / PRIVACY

Legal modul služi kao informativni vodič. Ne predstavlja pravno zastupanje.

Sigurnosni statusi trebaju biti vezani uz stvarne izvore, jurisdikciju i datum provjere.

---

## ⚙️ BUILD TOOLCHAIN

Trenutačni deklarirani toolchain:

```text
AGP            9.1.1
Gradle         9.3.1
Kotlin         2.2.10
Compose BOM    2026.08.00
JDK            17
compileSdk     37
minSdk         24
targetSdk      36
```

Compose BOM koristi ispravnu artifact koordinatu:

```text
androidx.compose:compose-bom:2026.08.00
```

---

## 🔐 RELEASE SIGNING

Production signing je namjerno fail-closed.

```text
RELEASE_SIGNING_REQUIRED=true
            +
KEYSTORE_PATH
STORE_PASSWORD
KEY_ALIAS
KEY_PASSWORD
            ↓
     signed release
```

Ako je production signing obavezan, a keystore nije konfiguriran, build mora pasti umjesto da tiho koristi debug ključ.

**Nikada ne commitati production keystore, privatne ključeve, WireGuard private key ili API ključeve.**

---

## 📱 ANDROID VPN / FGS

Aplikacija koristi Android `VpnService` i WireGuard `GoBackend`.

Manifest release audit mora potvrditi:

- `BIND_VPN_SERVICE`
- `android.net.VpnService` intent filter
- foreground service permission
- odgovarajući `foregroundServiceType`
- Android 14+ ponašanje
- stvarni lifecycle VPN servisa

Trenutni CI emitira warning vezan uz `foregroundServiceType`; warning nije trenutačni compiler blocker, ali ostaje release gate.

---

## 🧩 PROJECT STRUCTURE

```text
app/
├── src/main/java/com/example/
│   ├── data/
│   │   ├── model/
│   │   └── SecurityRepository.kt
│   ├── ui/
│   │   ├── screens/
│   │   └── viewmodel/
│   │       └── MainViewModel.kt
│   └── vpn/
│       ├── WireGuardHandshakeVerifier.kt
│       ├── WireGuardTunnelController.kt
│       ├── WireGuardTunnelState.kt
│       └── WireGuardTransitionJournal.kt
│
├── src/test/java/com/example/
│   ├── CapabilityEvidence*
│   └── vpn/
│       ├── WireGuardHandshakeVerifierTest.kt
│       ├── WireGuardInvariantTest.kt
│       ├── WireGuardInvariantMatrixTest.kt
│       ├── WireGuardTransitionJournalTest.kt
│       └── WireGuardTunnelStateTest.kt
│
├── build.gradle.kts
└── proguard-rules.pro

.github/workflows/
└── android-ci.yml
```

---

## 🚦 CI PIPELINE

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

Parallel security job
   ├── Dependency review
   └── Gitleaks

             ↓
      PRODUCTION GATE
```

Production gate mora dobiti success i od build/test/lint posla i od security posla.

---

## 🧯 CURRENT INCIDENT / NEXT FIX

### Incident: CI #108 compile failure

Dependency resolution je sada dovoljno napredovala da je stvarni source-level problem postao vidljiv.

Primarni sljedeći rez:

```text
1. Fix SecurityRepository.kt buildList call
2. Restore/replace sendSentinelChatMessage()
3. Restore/replace searchDarkWebBreaches()
4. Fix DashboardScreen clip imports/API
5. Restore MetricCard + AuditItemRow
6. Fix VpnManagerScreen Text argument/type mismatches
7. Align MainViewModel CapabilityEvidence constructor calls
8. Fix WireGuardProfileStore Config parsing / peer access
9. Provide production-safe google-services.json strategy
10. Re-run assembleRelease
11. Run unit tests
12. Run lint
13. Require Production Gate PASS
```

Ne treba više dirati Compose BOM dok novi CI ne dokaže novi dependency blocker.

---

## 🔒 SECURITY RULES

1. Missing source ≠ fake success.
2. UI toggle ≠ proof of protection.
3. AI output ≠ direct compromise proof.
4. Cell observation ≠ automatic IMSI-catcher proof.
5. Stale `VERIFIED` ≠ current `VERIFIED`.
6. Missing provider/configuration → `UNAVAILABLE`.
7. Critical WireGuard failure → fail closed.
8. Production secret ≠ repository content.
9. Release signing failure ≠ silent debug fallback.
10. A green UI indicator must never outrun the evidence model.

---

## 🏁 DEFINITION OF 100% PRODUCTION READINESS

Sentinel Shield se ne smatra **100% production-ready** samo zato što se APK može izgraditi.

100% zahtijeva:

```text
✅ Source compilation
✅ assembleRelease
✅ unit tests
✅ lint
✅ security scan
✅ production gate PASS
✅ real WireGuard endpoint
✅ verified real handshake on device
✅ Android device validation
✅ Android 14+ foreground-service validation
✅ production HIBP configuration
✅ production signing
✅ reproducible release build
✅ final E2E evidence/freshness/race validation
```

Tek nakon svih tih uvjeta progress prelazi na:

```text
100% PRODUCTION READINESS
```

---

## 📈 RELEASE ROADMAP

```text
90%  ████████████████████████████████████████████████████████████████████████████████████████████░░░░░░░░░░
      │
      ├── ✅ Architecture / evidence model
      ├── ✅ WireGuard lifecycle / handshake
      ├── ✅ Reactive network layer
      ├── ✅ Freshness / provenance
      ├── ✅ Security workflow
      ├── ✅ Gradle configuration
      ├── ✅ Compose coordinate correction
      │
      ├── 🔴 Kotlin compilation
      ├── 🔴 Firebase release configuration
      ├── 🔴 CI Production Gate
      ├── 🟠 Real WireGuard endpoint
      ├── 🟠 Physical device matrix
      ├── 🟠 Production signing
      └── 🟠 Final release validation
      │
      ▼
100% PRODUCTION READINESS
```

---

## 📜 STATUS PHILOSOPHY

Sentinel Shield treba biti konzervativan u vlastitim tvrdnjama.

> **Bolje je prikazati `UNVERIFIED` nego pružiti lažni osjećaj sigurnosti.**

To je osnovni princip cijelog evidence, network i WireGuard sloja.
