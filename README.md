# 🛡️ SENTINEL SHIELD PRO (Web & Cloud Edition)

> Cyber Security & Digital Privacy Shield with AI Threat Detection, Network Security Audit, Speed Test, Zero-Log WireGuard VPN Tunnel, IMSI / RF Radar Sweep, and Dark Web Monitor.

## 🚀 Overview

Sentinel Shield Pro has been ported from the original Android application into a modern, full-stack **React 18 + TypeScript + Express + Tailwind CSS** architecture. It preserves all cryptographic principles, zero-slop evidence tracking standards, tactical UI themes, multi-language localization, and server-side Gemini 2.5 threat intelligence models.

---

## 🔑 Core Features & Architectures

### 1. Capability Evidence Engine (`src/services/evidenceEngine.ts`)
- Implements strict **VERIFIED / UNVERIFIED / UNAVAILABLE** status tracking.
- Cryptographic Time-To-Live (TTL) decay (5 minutes).
- Zero fabricated mock states: reachability and observation are tracked with clear provenance.

### 2. Tactical RF & IMSI Radar Sweep (`src/views/RadarView.tsx`)
- Animated canvas-based tactical sweep map.
- Real-time observation of Cellular Base Stations (eNodeB / gNodeB, MCC/MNC, CID/LAC), BLE Beacons, and Wi-Fi Access Points.
- Signal persistence tracking, RSSI anomaly correlation, and OpenCellID enrichment.

### 3. Zero-Log WireGuard VPN Tunnel (`src/views/VpnView.tsx`)
- ChaCha20-Poly1305 WireGuard interface manager.
- Live RX/TX traffic meters and handshake freshness verification.
- Verified privacy havens (Switzerland, Iceland, Norway, Sweden, etc.).
- Custom `.conf` configuration importer and manual editor.

### 4. Gemini 2.5 Cyber Threat Scanner & Advisor (`server.ts`, `src/views/AiScannerView.tsx`)
- Server-side Gemini 2.5 Flash threat evaluation proxy for URLs, phishing SMS/emails, suspicious APK metadata, and weak credentials.
- Interactive Sentinel AI Security Advisor modal for cybersecurity inquiries.

### 5. Wiretap & SS7 Carrier Call Redirection Audit (`src/views/CallSecurityView.tsx`)
- MMI GSM service code dials (`*#21#`, `*#62#`, `*#67#`, `*#61#`, `##002#`).
- Background microphone access and silent Type-0 SMS alert monitors.

### 6. Network Security & Latency Probe (`src/views/NetworkAuditView.tsx`)
- Live HTTPS round-trip latency probe.
- DNS-over-HTTPS (DoH) / DNSSEC validation.
- TLS 1.3 cipher suite evaluation.

### 7. Dark Web Credential Exposure Surveillance (`src/views/DarkWebView.tsx`)
- HaveIBeenPwned API proxy and security leak database auditor.
- Zero-slop data fidelity: real provider lookups or clean zero-state guidance.

### 8. Legal Jurisdiction Vault & Constitutional Privacy Guide (`src/views/LegalView.tsx`)
- 5-Eyes, 9-Eyes, and 14-Eyes surveillance alliances breakdown.
- Croatian Constitutional privacy protection articles (čl. 35–37) & EU GDPR references.

### 9. Customization & Theme Vault (`src/data/themes.ts`, `src/views/VaultView.tsx`)
- **Phosphor Matrix (CRT Green)**
- **Cyber Cyan (Tron Pro)**
- **Stealth Midnight (OLED Dark)**
- **Solar Tactical Amber**
- **Titanium Clean (Light Mode)**
- Multi-language localization (English, Croatian, German, Spanish).

---

## 🛠️ Development & Production

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Build production bundle
npm run build

# Start production server
npm start
```
