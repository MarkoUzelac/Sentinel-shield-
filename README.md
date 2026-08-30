# 🛡️ Sentinel Shield Pro

**Native Android network-security and privacy intelligence application** with an evidence-first architecture, real device telemetry, cellular/RF intelligence, WireGuard verification, tactical mapping, and a production APK pipeline.

> **Project rule:** never invent telemetry. When Android, hardware, permissions, providers, or the VPN backend cannot prove a value, the UI must show `UNAVAILABLE`, `STALE`, or `ACTIVE_UNVERIFIED` rather than fabricate a result.

## 1. Project Mission

Build Sentinel Shield as a premium, native Android security application that gives users maximum insight into their own network, cellular, VPN, location, Wi-Fi, BLE, and security state while clearly separating observed evidence from inference.

The application must prefer **real Android APIs and local/native telemetry** over browser/WebView telemetry. The final deliverable is an Android APK, not a web wrapper pretending to be native.

Core objectives:

- Real Android telemetry only.
- Evidence provenance for every security-sensitive value.
- Deterministic freshness/TTL semantics.
- One canonical `ThreatSnapshot` consumed by Dashboard, Radar, Tactical Map, VPN, and future security screens.
- No mock/test data in production UI.
- Graceful handling of unsupported hardware, denied permissions, unavailable APIs, stale data, provider errors, and offline operation.
- Premium, precise, user-friendly UI with explanations for technical terms.
- Reproducible Gradle builds and GitHub Actions APK generation.

---

## 2. Canonical Evidence Contract

Every observation belongs to an evidence pipeline and must retain its source and timestamp.

Recommended states:

- `VERIFIED` — directly supported by fresh runtime evidence.
- `ACTIVE_UNVERIFIED` — activity exists, but cryptographic/provenance proof is incomplete.
- `STALE` — evidence existed previously but has exceeded its freshness TTL.
- `UNAVAILABLE` — missing permission, unsupported capability, inactive transport, missing provider result, or unavailable data source.

Never upgrade a state merely to make the UI look complete.

### Canonical model

The application should maintain one shared model conceptually equivalent to:

```kotlin
ThreatSnapshot
SecurityObservation
ThreatFinding
EvidenceState
EvidenceSource
ObservationKind
```

The exact package names may evolve, but the architecture must remain single-source-of-truth.

Radar, Tactical Map, Dashboard, history, and security findings must consume projections of the same snapshot rather than independently inventing state.

---

## 3. Native Android Telemetry

Implement and preserve native Android ingestion for:

### GPS / Location

Use Android location APIs with explicit runtime permission handling.

Capture only values actually available from Android:

- latitude
- longitude
- accuracy
- timestamp
- provider when available
- freshness

Do not create fallback/fake coordinates. A missing location is `UNAVAILABLE`.

### Cellular

Use `TelephonyManager` / `CellInfo` and radio-specific Android APIs.

Expose, when actually available:

- RAT / radio technology
- MCC
- MNC
- TAC / LAC
- CID / CI
- NCI
- PCI / PSC
- EARFCN
- NRARFCN
- RSRP
- RSRQ
- SINR / RSSNR
- registration state
- connection/data state
- neighboring-cell observations when Android permits them

Support LTE, 5G NR, GSM, WCDMA, CDMA, TD-SCDMA and other platform-available types without inventing unsupported fields.

### Wi-Fi

Use native `WifiManager` APIs and modern Android permission rules.

Capture real values such as:

- SSID/BSSID when accessible
- RSSI
- frequency/channel
- link speed where available
- Wi-Fi connection state
- scan timestamp
- capability limitations

### BLE

Use native Bluetooth LE scanning with Android runtime permissions and correct scan lifecycle.

Never display fictitious nearby devices.

### Connectivity

Use native `ConnectivityManager` / `NetworkCapabilities`.

Track:

- active transport
- Wi-Fi / cellular / Ethernet / VPN presence
- validated internet state when available
- network capability changes
- VPN transport state

---

## 4. Cellular Identity + OpenCellID

The cellular pipeline should normalize Android `CellInfo` into a canonical identity model before enrichment.

OpenCellID is an optional **provider enrichment layer**, never the primary source of truth.

Rules:

1. Read cellular identity from Android.
2. Enrich only when the identity is sufficient.
3. Use `OPEN_CELL_ID_API_KEY` only from secure build/runtime configuration.
4. Store the provider result with provenance.
5. Preserve `UNAVAILABLE` when the provider is inaccessible, denied, rate-limited, or has no matching result.
6. Never substitute provider data for device GPS without labeling it as provider-derived.

Map labels must make the distinction obvious, for example:

- `MY DEVICE — GPS`
- `CELL — OpenCellID provider`
- `LAST SEEN`
- `UNAVAILABLE`

---

## 5. Persistent Observation History

Use Room (or the project-approved local persistence layer) for durable observation history.

Persist enough metadata to reconstruct evidence state:

- observation ID
- observation kind
- source
- payload/normalized fields
- observed timestamp
- freshness/expiry information where applicable
- related threat/finding IDs

History must survive process death and application restart.

Do not silently overwrite evidence in a way that destroys provenance.

---

## 6. WireGuard Verification

WireGuard must use the real Android tunnel/GoBackend integration.

The verifier must not equate "VPN connected" with "WireGuard handshake verified".

The verified state requires, as applicable:

1. real WireGuard backend/tunnel state is `UP`;
2. the configured peer exists in runtime statistics;
3. `latestHandshakeEpochMillis > 0`;
4. the handshake is not before the tunnel startup baseline;
5. the handshake is not in the future beyond an accepted clock-skew tolerance;
6. the handshake is within the configured freshness TTL.

Where the backend exposes them, also retain:

- RX bytes
- TX bytes
- endpoint
- peer/public-key identity
- latest handshake timestamp

Failure behavior:

- VPN active but no cryptographic evidence → `ACTIVE_UNVERIFIED`.
- Old handshake → `STALE`.
- No backend/tunnel/peer statistics → `UNAVAILABLE`.
- Never display `VERIFIED` based solely on Android VPN transport state.

---

## 7. Radar

Radar is an evidence visualization, not a device generator.

It must derive contacts from actual observations in `ThreatSnapshot`.

Supported categories may include:

- Cellular
- Wi-Fi
- BLE
- VPN / network state
- Device location context where meaningful

When there are no real contacts:

> `NO VERIFIED CONTACTS`

not a set of fake rings or generated devices.

Show:

- signal strength where available
- observation type
- evidence state
- source
- freshness
- last observed time

---

## 8. Tactical Map

Use a native Android map implementation appropriate to the final product architecture.

The Android app must not depend on a browser map as its core telemetry layer.

Map points must come from real data only:

- current device GPS
- provider-enriched cellular locations
- other evidence-backed coordinates explicitly supported by the source

Each point must expose provenance/freshness. Examples:

- `KNOWN_LOCATION`
- `LAST_SEEN`
- `PROVIDER_ENRICHED`
- `UNAVAILABLE`

Do not place remote devices at arbitrary or visually convenient coordinates.

The map should support:

- zoom
- recenter/reset
- current location
- evidence point selection
- source/freshness details
- graceful no-data state
- offline/no-provider state

---

## 9. Dashboard / Premium UI

The production Android UI should feel like a premium security console, but remain understandable to normal users.

Recommended top-level areas:

- Security Overview
- Live Network
- Cellular Intelligence
- Radar
- Tactical Map
- WireGuard / VPN
- Observation History
- Evidence / Diagnostics
- Settings / Permissions

Use strong visual hierarchy without fake alarmism.

Show explicit states such as:

- `VERIFIED`
- `ACTIVE — UNVERIFIED`
- `STALE`
- `UNAVAILABLE`

Every technical value should have an accessible explanation.

Examples that must be explained in the UI:

- RAT
- MCC
- MNC
- TAC / LAC
- CID / CI
- NCI
- PCI / PSC
- EARFCN
- NRARFCN
- RSRP
- RSRQ
- SINR / RSSNR
- Registered state

Also explain other advanced terms when exposed.

Do not force the user to already understand cellular engineering terminology.

---

## 10. Security Analysis

Security analysis may combine deterministic rules and AI-assisted interpretation, but AI output must never overwrite raw evidence.

Separate:

1. raw observation;
2. deterministic finding;
3. heuristic interpretation;
4. AI-generated explanation.

A threat score must be traceable to actual evidence and rules.

Avoid false-positive theatrics such as "critical" solely because a network is unfamiliar.

---

## 11. Privacy Rules

The app is privacy-first.

Requirements:

- no hidden telemetry collection;
- no secret API keys committed to source;
- explicit permission requests;
- clear explanation of why each permission is required;
- local-first evidence storage where practical;
- provider calls only when necessary and clearly labeled;
- no fake privacy claims;
- no fabricated VPN verification.

---

## 12. APK Build & GitHub Actions

The project must produce a real Android APK through GitHub Actions.

Required release pipeline:

```text
checkout
→ JDK 17
→ Gradle wrapper
→ Android SDK
→ dependency/security checks
→ assembleRelease
→ unit tests
→ lint
→ APK existence check
→ APK signature verification
→ upload APK artifact
```

### Gradle wrapper

The repository must contain a real executable Gradle wrapper, not a shell shim that assumes a globally installed Gradle binary.

Required files:

```text
gradlew
gradlew.bat
gradle/wrapper/gradle-wrapper.jar
gradle/wrapper/gradle-wrapper.properties
```

The wrapper distribution must match the project's tested Gradle version.

CI should invoke:

```bash
./gradlew assembleRelease
./gradlew test
./gradlew lint
```

not a globally installed `gradle` command.

### APK artifact

Successful builds must upload the actual `.apk` file as a downloadable GitHub Actions artifact.

Artifact verification should confirm:

- file exists;
- file is non-empty;
- expected package/application ID is present where practical;
- release APK is signed when production signing is requested;
- `apksigner verify` succeeds for signed builds.

---

## 13. Release Signing

Never commit a keystore.

Use GitHub Secrets:

```text
KEYSTORE_BASE64
KEYSTORE_PASSWORD
KEY_ALIAS
KEY_PASSWORD
OPEN_CELL_ID_API_KEY
```

Workflow behavior:

1. validate that required signing secrets exist;
2. decode `KEYSTORE_BASE64` into `$RUNNER_TEMP`;
3. pass signing paths/passwords through environment variables;
4. run `assembleRelease`;
5. verify signature with `apksigner`;
6. upload the signed release APK;
7. never print passwords or keystore contents.

For local keystore creation:

```bash
keytool -genkeypair \
  -v \
  -keystore sentinel-shield-release.keystore \
  -alias sentinel-shield \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000
```

Base64 on Linux/macOS:

```bash
base64 -w 0 sentinel-shield-release.keystore > keystore.base64
```

Windows PowerShell:

```powershell
[Convert]::ToBase64String(
  [IO.File]::ReadAllBytes("sentinel-shield-release.keystore")
) | Set-Content keystore.base64
```

Never put the resulting Base64 content into README or source code.

---

## 14. CI Reliability / Cleanup

Keep workflows intentional and non-duplicative.

Recommended split:

- `android-ci.yml` — PR validation: compile/release build, tests, lint, security.
- `build-apk.yml` — manual or `main` release APK artifact build.
- `dependency-submission.yml` — dependency graph submission only if the repository can support it successfully.

Do not maintain multiple workflows that duplicate the same release build unless there is a clear reason.

After every CI failure:

1. inspect the actual GitHub Actions log;
2. identify the first real failure;
3. fix only the relevant code/configuration;
4. push a deterministic change;
5. rerun the affected gate;
6. continue until the complete required chain passes.

Never claim a green build without a real successful workflow run.

---

## 15. Tests

At minimum, cover:

### Evidence

- fresh → verified
- fresh → active-unverified
- stale transitions
- unavailable states
- future timestamps
- deterministic timestamps via injected clock

### WireGuard

- tunnel down
- tunnel up with no peer stats
- peer with zero handshake
- fresh handshake
- stale handshake
- pre-startup handshake
- future handshake
- RX/TX extraction

### Cellular

- LTE parsing
- NR parsing
- missing fields
- unknown RAT
- permission denied
- provider unavailable
- OpenCellID enrichment with valid and invalid results

### Radar / Map

- real observations project correctly
- no observations → empty state
- unavailable coordinates omitted
- provenance preserved
- freshness preserved

### UI

- permission denied
- sensor unavailable
- no VPN
- active-unverified VPN
- stale VPN
- verified VPN
- no-map-data state
- no-radar-data state

---

## 16. Architecture Constraints

Preserve these boundaries:

```text
Native Android APIs
        ↓
Signal / Telemetry Ingest
        ↓
Normalization
        ↓
Evidence / Freshness Engine
        ↓
ThreatSnapshot
        ↓
├── Dashboard
├── Radar
├── Tactical Map
├── WireGuard/VPN
├── History
└── Security Findings
```

Provider enrichment is downstream of native observation, never a replacement.

AI analysis is downstream of evidence, never a replacement.

UI projections are downstream of evidence, never a replacement.

---

## 17. Current Known Repository Guardrails

Before implementing anything, inspect the actual current repository and preserve valid code rather than blindly recreating it.

Important current checks discovered during the project:

- Previous CI failures included unresolved Compose symbols and incorrect `HttpURLConnection.use` handling.
- Those classes/files were iteratively repaired through GitHub Actions feedback.
- The repository previously contained a `gradlew` shell shim that delegated to a globally installed `gradle`; this is not sufficient for reproducible Android builds and should be replaced with the standard Gradle wrapper.
- The Android build currently targets modern SDK/tooling and must be kept internally consistent.
- `MainActivity` has previously contained direct UI wiring and must ultimately be decomposed into production screens rather than remaining a bootstrap-only dashboard.
- `SecurityUiProjection` and the shared `ThreatSnapshot` concept must remain the canonical source for Radar/Map state.

Treat GitHub Actions logs as authoritative for build failures.

---

# 🤖 MASTER IMPLEMENTATION PROMPT — GOOGLE AI STUDIO

Copy everything below into Google AI Studio / Gemini coding mode when asking it to continue the project.

```text
You are the lead Android platform engineer, security architect, RF/cellular telemetry engineer, CI/CD engineer, QA engineer, and premium UI/UX engineer for the Sentinel Shield project.

REPOSITORY:
https://github.com/MarkoUzelac/Sentinel-shield-

PRIMARY OBJECTIVE:
Take the current repository from its actual state to a production-quality, buildable, testable, installable native Android security application and leave the repository in a state where the APK can be built reproducibly through GitHub Actions.

DO NOT merely describe changes. Inspect the repository, implement the required changes, build/test them, inspect failures, fix them, and continue until the configured build gate is genuinely successful.

CORE NON-NEGOTIABLE RULE:
NEVER FABRICATE TELEMETRY.

Do not invent:
- devices
- Wi-Fi networks
- BLE devices
- cellular towers
- GPS positions
- signal measurements
- threats
- VPN handshakes
- network statistics
- security states
- scan results

When information is unavailable, explicitly show UNAVAILABLE.
When previous evidence is old, show STALE.
When an active condition exists but verification is incomplete, show ACTIVE_UNVERIFIED.
Only show VERIFIED when the required evidence actually exists and is fresh.

PHASE 1 — REPOSITORY AUDIT
1. Inspect every relevant Gradle, Kotlin, AndroidManifest, resource, UI, provider, repository, test, and GitHub Actions file.
2. Determine the real project structure.
3. Detect stale/duplicate workflows.
4. Detect fake/mock/test-data paths used by production UI.
5. Detect non-native/browser-based telemetry dependencies.
6. Detect missing Gradle wrapper components.
7. Detect compile/test/lint problems.
8. Do not rewrite working code unnecessarily.

PHASE 2 — BUILD FOUNDATION
Ensure the repository has a real standard Gradle wrapper:
- gradlew
- gradlew.bat
- gradle/wrapper/gradle-wrapper.jar
- gradle/wrapper/gradle-wrapper.properties

CI must call ./gradlew, never rely on a globally installed Gradle binary.

Use JDK 17 unless the actual project requires another compatible version and document the decision.

Run:
./gradlew tasks
./gradlew assembleDebug
./gradlew assembleRelease
./gradlew test
./gradlew lint

Fix the first real error, rerun, and continue.

PHASE 3 — CANONICAL EVIDENCE
Implement or preserve a single canonical evidence architecture around:
- EvidenceState
- EvidenceSource
- ObservationKind
- SecurityObservation
- ThreatFinding
- ThreatSnapshot
- freshness/TTL
- deterministic injected clock

Required states:
VERIFIED
ACTIVE_UNVERIFIED
STALE
UNAVAILABLE

Every observation must retain provenance and timestamp.

PHASE 4 — REAL ANDROID INGEST
Use native Android APIs for:

GPS:
- latitude
- longitude
- accuracy
- timestamp
- provider when available

CELLULAR:
- RAT
- MCC
- MNC
- TAC/LAC
- CID/CI
- NCI
- PCI/PSC
- EARFCN
- NRARFCN
- RSRP
- RSRQ
- SINR/RSSNR
- registration state

Wi-Fi:
- SSID/BSSID when permitted
- RSSI
- frequency/channel
- link information
- scan freshness

BLE:
- native LE scan lifecycle
- device identity/name where permitted
- RSSI
- timestamps

CONNECTIVITY:
- active network
- transports
- validated state when available
- VPN transport

Respect Android runtime permission requirements and hardware/API limitations.

PHASE 5 — CELLULAR NORMALIZATION + OPENCELLID
Create a canonical cellular identity parser/normalizer.
Add provider enrichment only downstream of native Android cellular evidence.
Use OPEN_CELL_ID_API_KEY securely.
Never turn provider data into device GPS without explicit provider provenance.

PHASE 6 — ROOM HISTORY
Implement persistent observation storage.
The last known evidence must survive process death/restart.
Preserve source, timestamp, and payload provenance.

PHASE 7 — REAL WIREGUARD VERIFICATION
Use the actual com.wireguard.android:tunnel GoBackend API used by the project.
Read real runtime state and peer statistics.
Require:
- tunnel UP
- configured peer exists
- latest handshake timestamp > 0
- handshake is after tunnel startup baseline
- handshake is not impossibly in the future
- handshake is within freshness TTL

Use the runtime-provided RX/TX counters and endpoint when available.

Generic VPN transport MUST NOT equal VERIFIED WireGuard.

PHASE 8 — RADAR
Implement a production Radar screen driven only from ThreatSnapshot.
Do not create visual-only contacts.
Show evidence status, type, signal, source, timestamp.
No data means a professional empty state.

PHASE 9 — TACTICAL MAP
Implement a real native Android tactical map.
Use only evidence-backed coordinates:
- device GPS
- provider-enriched cellular positions
- other explicitly supported coordinates

Include:
- current location
- evidence markers
- recenter/reset
- provenance
- freshness
- no-data state

No arbitrary/fabricated coordinates.

PHASE 10 — PREMIUM DASHBOARD
Replace bootstrap-only UI with proper production navigation and screens.
Create a premium security-console visual language while keeping it understandable.

Recommended navigation:
Dashboard
Radar
Tactical Map
Cellular
Network
WireGuard
History
Evidence
Settings

Every technical metric must have a user-friendly explanation.

Explicitly explain:
RAT
MCC
MNC
TAC/LAC
CID/CI
NCI
PCI/PSC
EARFCN
NRARFCN
RSRP
RSRQ
SINR/RSSNR
registered state
and other advanced cellular/network terminology.

PHASE 11 — SECURITY FINDINGS
Separate raw evidence from:
- deterministic rules
- heuristics
- AI explanation

Never allow AI to overwrite or fabricate raw telemetry.

PHASE 12 — TESTS
Implement deterministic tests for:
- evidence freshness
- future timestamps
- unavailable states
- cellular parser
- OpenCellID failure modes
- WireGuard handshake verification
- Radar projection
- Tactical Map projection
- permission-denied states
- empty states

PHASE 13 — GITHUB ACTIONS CLEANUP
Consolidate workflows.
Avoid duplicate release builders.
Recommended:
1. android-ci.yml for PR validation.
2. build-apk.yml for APK artifact generation.
3. dependency-submission.yml only if it actually succeeds.

Use actions/setup-java@v5 and the current supported Gradle setup action compatible with the repository.

CI must run:
- checkout
- JDK 17
- Gradle wrapper validation
- dependency/security scan
- assembleRelease
- test
- lint
- APK artifact verification

PHASE 14 — DEBUG APK
Provide a reliable debug APK workflow that does not require production signing secrets.
It must:
- run assembleDebug
- locate the actual APK
- verify that it is non-empty
- upload it as an artifact

PHASE 15 — SIGNED RELEASE APK
Release build must support GitHub Secrets:
KEYSTORE_BASE64
KEYSTORE_PASSWORD
KEY_ALIAS
KEY_PASSWORD
OPEN_CELL_ID_API_KEY

Decode the keystore only in RUNNER_TEMP.
Never print secret values.
Run assembleRelease.
Run apksigner verify.
Upload the actual signed APK artifact.

PHASE 16 — AUTOFIX LOOP
For every real CI failure:
1. fetch the workflow result;
2. inspect the first failing step/log;
3. identify root cause;
4. modify the minimum required files;
5. commit the fix;
6. rerun the appropriate workflow;
7. repeat until the complete gate passes.

Do not claim success without a real successful workflow result.

PHASE 17 — README / DOCUMENTATION
Keep README.md synchronized with actual implementation.
Document:
- architecture
- evidence states
- native telemetry
- cellular data
- OpenCellID
- WireGuard verification
- Radar
- Tactical Map
- permissions
- testing
- CI
- APK artifacts
- signing

PHASE 18 — FINAL ACCEPTANCE GATE
Do not stop at “code compiled locally”.
Final acceptance requires:

1. ./gradlew assembleRelease — PASS
2. ./gradlew test — PASS
3. ./gradlew lint — PASS
4. APK exists — PASS
5. APK is non-empty — PASS
6. Signed APK verification passes when signing is configured — PASS
7. GitHub Actions reflects the successful run — PASS
8. No production mock telemetry — PASS
9. Radar and Tactical Map use canonical ThreatSnapshot — PASS
10. WireGuard VERIFIED requires real handshake evidence — PASS
11. No secret values committed — PASS

OUTPUT:
When finished, summarize:
- changed files
- major architecture changes
- real telemetry sources
- CI workflow changes
- exact build commands executed
- exact workflow/run used for final verification
- artifact name/path
- any remaining limitation that is genuinely outside the repository's control

DO NOT fabricate a green build or APK if GitHub did not actually produce one.
```

---

## 18. Definition of Done

Sentinel Shield is considered ready only when all of the following are true:

- The Android project is genuinely native.
- The app can be built from a clean checkout using the Gradle wrapper.
- Real Android telemetry flows into the canonical evidence model.
- No production mock telemetry remains.
- Cellular identity is normalized and optionally provider-enriched.
- Persistent history works.
- WireGuard verification is based on actual GoBackend peer handshake evidence.
- Radar uses real observations.
- Tactical Map uses evidence-backed coordinates.
- Technical terms have user-friendly explanations.
- Tests, lint, and release build pass.
- GitHub Actions can produce a downloadable APK artifact.
- Signed release APK verification passes when production secrets are configured.
- README and implementation remain synchronized.

**The repository, not the chat, is the source of truth.**