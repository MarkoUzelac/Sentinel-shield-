# 🛡️ Sentinel Shield Pro (Web & Cloud Architecture)

> Modern, zero-slop network security, tactical RF radar, and digital privacy intelligence application built on React 18, TypeScript, Express, MapLibre GL JS, and OpenFreeMap.

---

## 🎯 Architecture Principles & Data Integrity

Sentinel Shield strictly adheres to authentic evidence modeling and zero-trust engineering standards:
- **No Fabricated Telemetry**: Does not invent fake devices, locations, cellular towers, Wi-Fi access points, BLE devices, VPN handshakes, threats, or network statistics.
- **Canonical Evidence Model**: A single state machine (`ThreatSnapshotEngine`) serves as the single source of truth across all views (Dashboard, Tactical Radar Map, WireGuard VPN, Network Audit, AI Threat Scanner, and MMI Call Security).
- **Deterministic Freshness Lifecycle**:
  - `VERIFIED`: Proven by fresh, active runtime telemetry within strict cryptographic Time-To-Live (TTL) decay thresholds.
  - `ACTIVE_UNVERIFIED`: Active connection or heuristic present, but missing verifiable cryptographic proof (e.g., VPN connected without confirmed peer handshake).
  - `STALE`: Previously verified evidence whose freshness TTL has expired without updated telemetry.
  - `UNAVAILABLE`: Hardware sensor, permission, or tunnel state is unprovisioned, denied, or inactive.

---

## 🗺️ Map Architecture (MapLibre GL + OpenFreeMap)

- **Vector Tiles & Rendering**: Uses **MapLibre GL JS** (`react-map-gl/maplibre`) powered by public vector tile styles from **OpenFreeMap** (`https://tiles.openfreemap.org/styles/dark`).
- **Privacy-First Geolocation**: Browser geolocation is invoked only upon explicit user grant with graceful fallback coordinates and permission status alerts.
- **Interactive Tactical Controls**: Interactive zoom controls, custom tactical radar overlay mode, bounding box centering, signal marker popups, and reset-map fly-to controls.
- **Modular Provider Interface**: Pluggable map configuration (`src/services/geo/geoConfig.ts`) and OpenStreetMap Nominatim geocoding provider (`src/services/geo/GeocodingProvider.ts`).

---

## 🔒 WireGuard Handshake Verification Engine

- **Peer Handshake Validation**: Does not claim a tunnel is `VERIFIED` merely because generic OS/network connectivity exists.
- **Cryptographic Freshness TTL**: Requires an authentic peer handshake timestamp within a strict 3-minute (`180,000 ms`) window. If the tunnel remains active but keepalive handshakes lapse, the status transitions automatically to `STALE` / `UNVERIFIED`.
- **Traffic Accounting**: Real-time monotonic RX/TX byte counters and endpoint inspection (`ch1.sentinel-shield.net:51820`).
- **Profile & Configuration Management**: Supports `.conf` WireGuard profiles, pre-configured zero-log privacy jurisdictions (Switzerland, Iceland, Norway, Sweden), and custom server endpoints.

---

## 🤖 Server-Side Gemini Cyber Intelligence (`server.ts`)

- **Secure Backend API Routes**: All Gemini API interactions are secured through server-side proxy routes (`/api/threat-scan`, `/api/chat`), never exposing credentials to the client bundle.
- **AI Threat Scanner**: Heuristic + Gemini 2.5 Flash analysis for suspicious URLs, phishing SMS/email payloads, sideloaded APK packages, and weak credential patterns.
- **Interactive Security Advisor**: Interactive chat assistant grounded in zero-trust cybersecurity guidance.
- **Dark Web OSINT Monitor**: Integration with public breach intelligence via `/api/darkweb-search`.
- **HTTPS & TLS Latency Probe**: Round-trip socket latency, TLS 1.3 encryption verification, and DoH resolver validation via `/api/network-probe`.

---

## 🧪 Testing & Continuous Integration (CI)

The repository includes a comprehensive Vitest test suite and automated GitHub Actions CI pipeline:

### Test Suites (`src/services/__tests__/`)
- `threatSnapshotEngine.test.ts`: Canonical snapshot state transitions, subscriber synchronization, and GPS location freshness.
- `wireguardVerification.test.ts`: Handshake TTL decay, stale transitions, unverified states, and byte counter resets.
- `tacticalRadarProjection.test.ts`: Anomaly scoring, signal aggregation (Cellular, BLE, Wi-Fi), and empty state fidelity.
- `evidenceEngine.test.ts`: Deterministic capability scoring and provenance verification rules.
- `permissions.test.ts` & `geoConfig.test.ts`: Sensor permission handling and OpenFreeMap configuration validation.

### GitHub Actions CI (`.github/workflows/web-ci.yml`)
1. `npm ci`: Deterministic dependency installation.
2. `npm run typecheck`: Strict TypeScript typechecking (`tsc --noEmit`).
3. `npm run lint`: Static codebase validation.
4. `npm test`: Automated unit and component test execution.
5. `npm run build`: Production bundle verification with standalone server (`dist/server.cjs`) and SPA assets (`dist/index.html`).

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- npm 10+

### Development
```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev
```

### Production Build & Execution
```bash
# Typecheck and lint codebase
npm run typecheck
npm run lint

# Run all unit tests
npm test

# Build production bundle
npm run build

# Start production server
npm start
```
