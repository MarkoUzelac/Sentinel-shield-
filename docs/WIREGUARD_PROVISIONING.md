# Sentinel Shield — WireGuard provisioning

Sentinel Shield now uses the official `com.wireguard.android:tunnel` library and its userspace `GoBackend`. The app does **not** contain a hard-coded private key, peer public key, or VPN credential.

## Required runtime profile

Provision an app-private file named:

`wireguard.conf`

The profile must contain a normal WireGuard configuration, for example:

```ini
[Interface]
PrivateKey = <CLIENT_PRIVATE_KEY_BASE64>
Address = 10.77.0.2/32
DNS = 1.1.1.1

[Peer]
PublicKey = <SERVER_PUBLIC_KEY_BASE64>
Endpoint = vpn.example.com:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
```

Do **not** commit this file. The repository ignores `wireguard.conf` because the interface private key is sensitive.

## Provisioning requirements

The VPN server must be configured with the corresponding client public key and must expose the peer endpoint over UDP. A server IP address in the UI catalog is only metadata; it is not treated as a usable WireGuard endpoint unless the runtime profile contains the complete peer configuration.

The current Android implementation reads the profile only from the app-private `filesDir`, so it is not exposed through public storage.

## Verified tunnel semantics

The UI reports `TUNNEL VERIFIED` only after all of these conditions are true:

1. Android VPN consent is granted.
2. The official WireGuard `GoBackend` enters `UP` state.
3. The configured peer is present in backend statistics.
4. `latestHandshakeEpochMillis` is non-zero.
5. The handshake timestamp is newer than the current tunnel startup timestamp.

A successful TUN creation or TCP/UDP endpoint reachability check alone is **not** considered a verified WireGuard connection.

## Production provisioning architecture

For a production service, the recommended flow is:

`authenticated user → provisioning API → allocate server/peer → generate client profile → deliver profile over authenticated TLS → store in app-private storage → start GoBackend → verify peer handshake`

The provisioning API must never return another user's private key and must revoke/rotate profiles when an account or device is removed.
