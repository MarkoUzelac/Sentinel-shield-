# 🛡️ Sentinel Shield Pro — Production Readiness

## 📊 Progress

```text
████████████████████████████████████████████████████████████████████████████████████████████░░░░░░░░  94%
```

**94% = engineering/readiness estimate, not a security certification.**

### ✅ Closed engineering work

| Area | Status |
|---|---|
| Premium Android UI | ✅ |
| Central Capability/Evidence model | ✅ |
| Evidence provenance | ✅ |
| `VERIFIED / UNVERIFIED / UNAVAILABLE` | ✅ |
| Lazy freshness / expiry | ✅ |
| Injectable evidence clock | ✅ |
| WireGuard GoBackend lifecycle | ✅ |
| Post-start handshake verification | ✅ |
| Fail-closed transport cleanup | ✅ |
| Transition journal + invariant tests | ✅ |
| Reactive `ConnectivityManager.NetworkCallback` | ✅ |
| `NetworkCapabilities` / `LinkProperties` evidence | ✅ |
| Real HTTPS reachability probe | ✅ |
| HIBP provider adapter | ✅ |
| Production-signing guard | ✅ |
| CI build/test/lint + secret security workflow | ✅ |

## ⏳ Remaining hard gates

### 🔴 1. Real WireGuard production endpoint

A real client/server configuration must be provisioned outside source control:

- server endpoint
- server public key
- client private key
- allowed IPs / routing policy
- DNS policy

No placeholder endpoint is accepted as production evidence.

### 🔴 2. Physical Android device validation

The following must be exercised on real devices across representative Android versions:

- VPN consent
- foreground lifecycle
- network transition Wi-Fi ↔ cellular
- VPN appearance in Android network state
- handshake refresh/staleness
- fail-closed behavior
- background/Doze behavior
- reboot / reconnect behavior

### 🔴 3. Release signing

CI/build logic now supports a strict production mode:

```text
RELEASE_SIGNING_REQUIRED=true
KEYSTORE_PATH=...
STORE_PASSWORD=...
KEY_ALIAS=...
KEY_PASSWORD=...
```

When strict mode is enabled without a release keystore, the release build fails instead of silently falling back to the debug key.

### 🔴 4. Final CI production gate

The gate is only considered green after all of these succeed on the same commit:

```text
Gradle configuration
        ↓
assembleRelease
        ↓
unit tests
        ↓
lint
        ↓
secret/dependency security
        ↓
PRODUCTION GATE
```

## 🟠 Important capability limitations

### Network

`NetworkCapabilities.NET_CAPABILITY_VALIDATED` means Android considers the network validated. It is not independent proof that the network is secure.

The app therefore keeps network evidence conservative:

```text
runtime connectivity evidence → UNVERIFIED
```

### Radar / IMSI

Cell information is real device evidence, but `CellInfo` alone is not proof of an IMSI catcher.

```text
TelephonyManager / CellInfo → UNVERIFIED
```

### AI

AI classification is analysis, not independent compromise evidence.

```text
AI result → UNVERIFIED
```

### Breach intelligence

HIBP account lookup is breach intelligence. It is **not** equivalent to a full dark-web crawl. Without a configured HIBP API key, the capability remains unavailable rather than generating synthetic results.

## 🧪 Verification matrix

| Test family | Required result |
|---|---|
| Expired `VERIFIED` evidence | `UNVERIFIED` |
| Missing provider | `UNAVAILABLE` |
| Duplicate capability ID | Test failure |
| Connected without fresh handshake | Never `VERIFIED` |
| Old VPN timeout vs new handshake | New session survives |
| Network transition | Evidence refreshes reactively |
| Network lost | `UNAVAILABLE` |
| Release strict signing without key | Build fails |
| Secret scan | Pass |

## ✅ Definition of 100%

The project reaches **100% Production Readiness** only when:

1. the CI production gate is green on the final release commit;
2. a real WireGuard endpoint is provisioned and a complete handshake is observed;
3. representative physical Android device tests pass;
4. final Android foreground-service/manifest behavior is validated against the targeted API levels;
5. the release APK/AAB is signed with the real production key through the controlled build environment;
6. no capability shown as `VERIFIED` relies on synthetic evidence.

Until those conditions are met, the remaining percentage is intentionally held below 100%.
