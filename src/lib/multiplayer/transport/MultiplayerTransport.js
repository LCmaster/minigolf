export const CONNECTION_STATE = Object.freeze({
  IDLE: "idle",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  DISCONNECTED: "disconnected",
});

export const DELIVERY = Object.freeze({
  RELIABLE: "reliable",
  REALTIME: "realtime",
});

/**
 * Transport contract used by MultiplayerSession.
 *
 * Implementations are responsible only for peer connectivity and delivery.
 * Session recovery and game-specific behavior belong above this layer.
 *
 * Reliable delivery is ordered while connected. Realtime delivery is best-effort
 * and may discard stale data. Disconnect recovery is handled by the session.
 */
export class MultiplayerTransport {
  async connect(_options) {
    throw new Error("connect() must be implemented by the transport");
  }

  async disconnect() {
    throw new Error("disconnect() must be implemented by the transport");
  }

  sendReliable(_message, _options = {}) {
    throw new Error("sendReliable() must be implemented by the transport");
  }

  sendRealtime(_message, _options = {}) {
    throw new Error("sendRealtime() must be implemented by the transport");
  }

  onMessage(_handler) {
    throw new Error("onMessage() must be implemented by the transport");
  }

  onPeerJoined(_handler) {
    throw new Error("onPeerJoined() must be implemented by the transport");
  }

  onPeerLeft(_handler) {
    throw new Error("onPeerLeft() must be implemented by the transport");
  }

  onStateChanged(_handler) {
    throw new Error("onStateChanged() must be implemented by the transport");
  }
}
