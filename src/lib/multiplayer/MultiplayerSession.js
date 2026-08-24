import {
  SESSION_MESSAGE,
  createMessage,
  parseMessage,
  ProtocolError,
} from "./protocol.js";
import {
  CONNECTION_STATE,
  DELIVERY,
} from "./transport/MultiplayerTransport.js";

const DEFAULT_DEDUPLICATION_WINDOW = 512;

/**
 * Owns transport-independent multiplayer lifecycle and recovery behavior.
 * Game code can subscribe to messages without depending on the concrete transport.
 */
export class MultiplayerSession {
  constructor({
    transport,
    getSnapshot = null,
    applySnapshot = null,
    createId = () => crypto.randomUUID(),
    deduplicationWindow = DEFAULT_DEDUPLICATION_WINDOW,
  }) {
    if (!transport) {
      throw new Error("A multiplayer transport is required");
    }

    this.transport = transport;
    this.getSnapshot = getSnapshot;
    this.applySnapshot = applySnapshot;
    this.createId = createId;
    this.sequence = 0;
    this.peerId = null;
    this.state = CONNECTION_STATE.IDLE;
    this.pendingStateRequestId = null;
    this.awaitingRecovery = false;
    this.recoveryPeerId = null;
    this.seenReliableMessages = new RecentMessageIds(deduplicationWindow);
    this.listeners = {
      message: new Set(),
      peerJoined: new Set(),
      peerLeft: new Set(),
      stateChanged: new Set(),
      protocolError: new Set(),
    };

    this.unsubscribeTransport = [
      transport.onMessage((event) => this._handleTransportMessage(event)),
      transport.onPeerJoined((peerId) => this._handlePeerJoined(peerId)),
      transport.onPeerLeft((peerId) => this._emit("peerLeft", peerId)),
      transport.onStateChanged((state) => this._handleTransportState(state)),
    ];
  }

  async connect({ roomId, peerId }) {
    if (!roomId || !peerId) {
      throw new Error("roomId and peerId are required");
    }

    this.peerId = peerId;

    try {
      await this.transport.connect({ roomId, peerId });
    } catch (error) {
      this.peerId = null;
      throw error;
    }
  }

  async disconnect() {
    this.pendingStateRequestId = null;
    this.awaitingRecovery = false;
    this.recoveryPeerId = null;
    await this.transport.disconnect();
    this.peerId = null;
  }

  async dispose() {
    try {
      await this.disconnect();
    } finally {
      for (const unsubscribe of this.unsubscribeTransport.splice(0)) {
        unsubscribe();
      }
      for (const listeners of Object.values(this.listeners)) {
        listeners.clear();
      }
    }
  }

  sendReliable(type, payload, options = {}) {
    const message = this._createOutgoingMessage(type, payload);
    this.transport.sendReliable(message, options);
    return message;
  }

  sendRealtime(type, payload, options = {}) {
    const message = this._createOutgoingMessage(type, payload);
    this.transport.sendRealtime(message, options);
    return message;
  }

  requestState(options = {}) {
    const requestId = this.createId();
    this.pendingStateRequestId = requestId;
    this.sendReliable(SESSION_MESSAGE.STATE_REQUEST, { requestId }, options);
    return requestId;
  }

  onMessage(handler) {
    return this._subscribe("message", handler);
  }

  onPeerJoined(handler) {
    return this._subscribe("peerJoined", handler);
  }

  onPeerLeft(handler) {
    return this._subscribe("peerLeft", handler);
  }

  onStateChanged(handler) {
    return this._subscribe("stateChanged", handler);
  }

  onProtocolError(handler) {
    return this._subscribe("protocolError", handler);
  }

  _createOutgoingMessage(type, payload) {
    if (!this.peerId) {
      throw new Error("Session must be connected before sending messages");
    }

    return createMessage({
      type,
      senderId: this.peerId,
      sequence: this.sequence++,
      payload,
      messageId: this.createId(),
    });
  }

  _handleTransportMessage(event) {
    let message;
    try {
      message = parseMessage(event.data);
    } catch (error) {
      if (error instanceof ProtocolError) {
        this._emit("protocolError", { error, event });
        return;
      }
      throw error;
    }

    if (message.senderId !== event.from) {
      this._emit("protocolError", {
        error: new ProtocolError("Message sender does not match transport peer"),
        event,
      });
      return;
    }

    if (
      event.delivery === DELIVERY.RELIABLE &&
      this.seenReliableMessages.has(message.messageId)
    ) {
      return;
    }

    if (event.delivery === DELIVERY.RELIABLE) {
      this.seenReliableMessages.add(message.messageId);
    }

    if (this._handleSessionMessage(message, event.from)) {
      return;
    }

    this._emit("message", { ...event, message });
  }

  _handleSessionMessage(message, from) {
    if (message.type === SESSION_MESSAGE.STATE_REQUEST) {
      const requestId = message.payload?.requestId;
      if (typeof requestId !== "string" || !this.getSnapshot) {
        return true;
      }

      this.sendReliable(
        SESSION_MESSAGE.STATE_SNAPSHOT,
        { requestId, state: this.getSnapshot() },
        { to: from },
      );
      return true;
    }

    if (message.type === SESSION_MESSAGE.STATE_SNAPSHOT) {
      const requestId = message.payload?.requestId;
      if (requestId !== this.pendingStateRequestId) {
        return true;
      }

      this.pendingStateRequestId = null;
      this.awaitingRecovery = false;
      this.recoveryPeerId = null;
      this.applySnapshot?.(message.payload.state, { from });
      return true;
    }

    return false;
  }

  _handlePeerJoined(peerId) {
    this._emit("peerJoined", peerId);

    if (!this.awaitingRecovery) {
      return;
    }

    if (this.state === CONNECTION_STATE.CONNECTED) {
      this.requestState({ to: peerId });
    } else {
      this.recoveryPeerId = peerId;
    }
  }

  _handleTransportState(state) {
    const previousState = this.state;
    this.state = state;
    this._emit("stateChanged", state);

    if (state === CONNECTION_STATE.RECONNECTING) {
      this.awaitingRecovery = true;
      return;
    }

    if (
      state === CONNECTION_STATE.CONNECTED &&
      previousState === CONNECTION_STATE.RECONNECTING
    ) {
      const options = this.recoveryPeerId ? { to: this.recoveryPeerId } : {};
      this.requestState(options);
    }
  }

  _subscribe(eventName, handler) {
    if (typeof handler !== "function") {
      throw new TypeError("Listener must be a function");
    }

    const listeners = this.listeners[eventName];
    listeners.add(handler);
    return () => listeners.delete(handler);
  }

  _emit(eventName, value) {
    for (const listener of [...this.listeners[eventName]]) {
      listener(value);
    }
  }
}

class RecentMessageIds {
  constructor(limit) {
    if (!Number.isSafeInteger(limit) || limit < 1) {
      throw new RangeError("Deduplication window must be a positive integer");
    }

    this.limit = limit;
    this.ids = new Set();
    this.queue = [];
  }

  has(id) {
    return this.ids.has(id);
  }

  add(id) {
    if (this.ids.has(id)) {
      return;
    }

    this.ids.add(id);
    this.queue.push(id);

    if (this.queue.length > this.limit) {
      this.ids.delete(this.queue.shift());
    }
  }
}
