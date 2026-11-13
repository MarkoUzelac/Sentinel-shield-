# Sentinel Shield Pro

<p align="center">
  <strong>Native Android security · Network intelligence · Evidence-first privacy</strong><br/>
  <em>Know what your device can verify. Never mistake an assumption for evidence.</em>
</p>

<p align="center">
  <a href="https://github.com/MarkoUzelac/Sentinel-shield-/actions">GitHub Actions</a> ·
  <a href="https://github.com/MarkoUzelac/Sentinel-shield-/issues">Issues</a> ·
  <a href="LEGAL.md">Legal & privacy notes</a>
</p>

---

## Overview

**Sentinel Shield Pro** is a native Android security and network-intelligence project focused on transparent device telemetry, evidence provenance, and clear verification states. Its goal is to help users understand their own connectivity, cellular environment, VPN state, and available security signals—without manufacturing data or presenting speculation as fact.

> **Evidence-first rule:** if Android, the hardware, permissions, a provider, or the VPN backend cannot establish a value, the application must report it as unavailable, stale, or unverified. It must not invent telemetry.

## Project principles

- **Native Android first:** use platform APIs and device capabilities; do not substitute a WebView for native telemetry.
- **Evidence over appearance:** no fake towers, devices, Wi-Fi networks, BLE contacts, GPS points, handshakes, or threat alerts.
- **Traceable observations:** retain source, timestamp, and freshness wherever possible.
- **Honest verification:** distinguish a detected condition from a cryptographically or technically verified condition.
- **Privacy by design:** explicit permissions, local-first handling where practical, and no committed secrets.
- **Understandable security:** explain technical values and avoid alarmist conclusions.

## Evidence states

| State | Meaning |
|---|---|
| `VERIFIED` | Fresh evidence directly supports the claim and its verification requirements are met. |
| `ACTIVE_UNVERIFIED` | An activity or condition is present, but required proof is incomplete. |
| `STALE` | Previously observed evidence is outside its freshness window. |
| `UNAVAILABLE` | The value cannot currently be obtained or supported. |

A screen must never promote evidence to a stronger state merely to look complete.

## Architecture

The intended data flow is:

```text
Native Android APIs
        ↓
Telemetry ingestion
        ↓
Normalization & provenance
        ↓
Evidence / freshness engine
        ↓
Canonical ThreatSnapshot
        ↓
Dashboard · Radar · Tactical Map · VPN · History · Findings
```

The canonical evidence model (including concepts such as `ThreatSnapshot`, `SecurityObservation`, `ThreatFinding`, and `EvidenceState`) is the source of truth for security-facing screens. Provider enrichment and AI-assisted explanations are downstream of raw evidence and must never replace it.

## Telemetry scope

Capabilities depend on Android version, hardware, carrier, permissions, and system restrictions.

- **Location:** Android location APIs; coordinates, accuracy, provider, and timestamp only when available.
- **Cellular:** Android `TelephonyManager` / `CellInfo`; radio technology, identifiers, registration and signal measurements when exposed by the platform.
- **Wi-Fi:** native `WifiManager`; connection and scan details subject to Android permissions and scan limits.
- **Bluetooth LE:** native BLE scanning with the appropriate permission and lifecycle.
- **Connectivity:** `ConnectivityManager` / `NetworkCapabilities`; active transport, validated connectivity where available, and VPN transport state.
- **Cell enrichment:** OpenCellID may enrich a sufficiently identified cell. Provider results must be labeled with their source and must not be represented as device GPS.
- **WireGuard:** verification must use the real tunnel/backend and peer statistics. A generic Android VPN connection alone is not proof of a WireGuard handshake.

## Privacy & security

- Request permissions only when needed and explain their purpose.
- Do not collect hidden telemetry.
- Do not commit API keys, signing credentials, keystores, or generated secret material.
- Keep observations local where practical; make external provider requests explicit and attributable.
- Separate raw observations, deterministic findings, heuristics, and AI-generated explanations.
- Treat unfamiliar networks or missing data as context—not automatic proof of malicious activity.

See **[LEGAL.md](LEGAL.md)** for project ownership, usage restrictions, and privacy/security disclaimers.

## Development

This repository targets a **native Android application**. Before changing code, inspect the current implementation and preserve working components.

### Prerequisites

- Android Studio or a compatible Android development environment
- JDK 17 (unless the project’s verified toolchain specifies otherwise)
- Android SDK components required by the project
- The repository’s standard Gradle wrapper

### Build and test

From the repository root:

```bash
./gradlew tasks
./gradlew assembleDebug
./gradlew assembleRelease
./gradlew test
./gradlew lint
```

On Windows, use:

```powershell
.\gradlew.bat assembleDebug
.\gradlew.bat test
.\gradlew.bat lint
```

Use the wrapper committed with the project; do not rely on a globally installed Gradle version. Build commands above describe the intended checks and are not a claim that every check currently passes.

## GitHub Actions & APK artifacts

The project is intended to use GitHub Actions for reproducible Android validation and APK artifacts. A release pipeline should:

1. Check out the repository and configure the compatible JDK.
2. Validate the Gradle wrapper and dependencies.
3. Run release build, tests, and lint.
4. Confirm that the APK exists and is non-empty.
5. Verify the APK signature when a signed release is requested.
6. Upload the actual APK as a workflow artifact.

A successful build or workflow must only be reported when a real run confirms it.

### Release signing

Production signing credentials belong in GitHub Actions Secrets—not in source files or documentation. The expected secret names are:

```text
KEYSTORE_BASE64
KEYSTORE_PASSWORD
KEY_ALIAS
KEY_PASSWORD
OPEN_CELL_ID_API_KEY
```

The keystore should be decoded only in a temporary runner directory and never printed or committed. A debug APK can be built without production signing secrets.

## Testing expectations

Tests should cover evidence freshness and state transitions, cellular normalization, provider failures, WireGuard handshake validation, permission-denied behavior, and Radar/Map projections—including empty and unavailable states.

## Project status

This README describes the project’s architecture and engineering requirements. It does **not** certify that every listed capability is implemented, that the app is production-ready, or that CI currently passes. Check the source tree and [Actions](https://github.com/MarkoUzelac/Sentinel-shield-/actions) for the current implementation and build status.

## Contributing

Changes should preserve evidence provenance, native telemetry, privacy controls, and truthful UI states. Please open an issue to discuss substantial changes before submitting a pull request. Do not include real personal telemetry, credentials, private keys, or other sensitive data in issues or commits.

## License & ownership

Copyright © 2026 **Marko Uzelac**. All rights reserved.

This repository is **proprietary / all rights reserved** unless the copyright holder expressly grants a separate written license. No permission to copy, modify, redistribute, sublicense, or commercially exploit the project is granted merely by viewing or cloning the repository.

See [LICENSE](LICENSE) and [LEGAL.md](LEGAL.md). The license notice does not replace legal advice or guarantee protection against unauthorized use.

---

<p align="center"><sub>Sentinel Shield Pro · Evidence first. Privacy by design. No fabricated telemetry.</sub></p>
