# Multiplayer foundation

This module keeps game state independent from the networking technology used to move it.

`MultiplayerSession` owns session-level concerns such as protocol envelopes, reliable-message deduplication and state recovery. `MultiplayerTransport` only owns connectivity and delivery. Game-specific messages and state remain outside both layers.

```text
Game
  -> MultiplayerSession
    -> MultiplayerTransport
      -> WebRTC / another transport
```

## Delivery semantics

The transport exposes two delivery intents:

- **Reliable** messages are ordered state transitions that should not be silently dropped while a connection is healthy. Transports are not required to buffer an unlimited history across a disconnect; recovery uses a fresh state snapshot instead.
- **Realtime** messages represent transient state where newer data supersedes older data. A transport may drop stale realtime messages rather than delaying current state.

These are semantic guarantees. A transport may implement them with separate data channels, a single socket, or another mechanism.

## Recovery

A session that enters `reconnecting` requests a fresh snapshot after connectivity returns. The first snapshot matching the current request is applied and later responses are ignored. This avoids replaying transient updates that are no longer useful after an interruption.

Initial room synchronization is intentionally explicit through `requestState()`. Peer discovery differs between transports, so the foundation does not assume that all existing peers are known when `connect()` resolves.

## Testing

`InMemoryTransport` provides deterministic room and peer behavior without a real network. It is used to test the same session contract that a WebRTC transport will implement later, including disconnect and reconnect scenarios.
