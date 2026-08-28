# WireGuard runtime evidence

Sentinel Shield uses `com.wireguard.android:tunnel` for the Android userspace backend.

The production evidence reader is `GoBackendWireGuardRuntimeReader`.

It reads:

- `Backend.getState(tunnel)` and requires `Tunnel.State.UP`.
- `Backend.getStatistics(tunnel)`.
- The configured peer public key through `Statistics.peer(Key)`.
- `PeerStats.latestHandshakeEpochMillis`, `rxBytes`, and `txBytes`.

The upstream WireGuard `Statistics.PeerStats` contract defines the handshake value as epoch milliseconds, so Sentinel Shield does not parse logs or infer a handshake from VPN transport state. The reader also requires the supplied backend to be the official `GoBackend`.

## Verification semantics

`HANDSHAKE_VERIFIED` requires:

1. backend state `UP`;
2. the configured peer is present in backend statistics;
3. handshake timestamp is non-zero;
4. handshake occurred at or after the tunnel startup timestamp;
5. handshake is not in the future;
6. handshake age is within the configured freshness window.

Missing statistics remain `ACTIVE_UNVERIFIED` or `UNAVAILABLE`; they are never promoted to verified state.

## CI gate

`.github/workflows/evidence-gate.yml` runs Gradle configuration validation, unit tests, release compilation, Android lint, and release artifact verification. Production signing remains a separate protected gate until signing credentials are available in GitHub Actions.
