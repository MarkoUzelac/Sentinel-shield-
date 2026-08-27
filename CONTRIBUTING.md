# Contributing

## Production gate

Every change targeting `main` must pass the Android CI workflow before merge.

Required checks:

- `assembleRelease`
- unit tests
- Android lint
- dependency review on pull requests
- repository secret scan with Gitleaks

The VPN UI must not report a verified connection unless a real WireGuard transport has completed its handshake/health verification. The Android `VpnService` TUN interface alone is not proof of an established VPN tunnel.
