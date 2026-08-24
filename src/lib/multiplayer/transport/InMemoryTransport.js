import {
  CONNECTION_STATE,
  DELIVERY,
  MultiplayerTransport,
} from "./MultiplayerTransport.js";

/**
 * Shared deterministic network used by InMemoryTransport instances.
 * It provides real room/peer behavior without sockets, timers, or external services.
 */
export class InMemoryNetwork {
  constructor() {
    this.rooms = new Map();
  }

  join(transport) {
    const room = this._getRoom(transport.roomId);
    const existingPeers = [...room.keys()];

    if (room.has(transport.peerId)) {
      throw new Error(`Peer '${transport.peerId}' is already connected to this room`);
    }

    room.set(transport.peerId, transport);

    for (const peerId of existingPeers) {
      transport.notifyPeerJoined(peerId);
      room.get(peerId)?.notifyPeerJoined(transport.peerId);
    }

  }

  leave(transport) {
    const room = this.rooms.get(transport.roomId);
    if (!room?.delete(transport.peerId)) {
      return;
    }

    for (const peer of room.values()) {
      peer.notifyPeerLeft(transport.peerId);
    }

    if (room.size === 0) {
      this.rooms.delete(transport.roomId);
    }
  }

  deliver(sender, delivery, message, to) {
    const room = this.rooms.get(sender.roomId);
    if (!room) {
      return;
    }

    if (to) {
      const recipient = room.get(to);
      if (recipient) {
        recipient.notifyMessage({ data: message, delivery, from: sender.peerId });
      }
      return;
    }

    for (const [peerId, recipient] of room) {
      if (peerId !== sender.peerId) {
        recipient.notifyMessage({ data: message, delivery, from: sender.peerId });
      }
    }
  }

  _getRoom(roomId) {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new Map();
      this.rooms.set(roomId, room);
    }
    return room;
  }
}

export class InMemoryTransport extends MultiplayerTransport {
  constructor(network = new InMemoryNetwork()) {
    super();
    this.network = network;
    this.state = CONNECTION_STATE.IDLE;
    this.roomId = null;
    this.peerId = null;
    this.listeners = {
      message: new Set(),
      peerJoined: new Set(),
      peerLeft: new Set(),
      stateChanged: new Set(),
    };
  }

  async connect({ roomId, peerId }) {
    if (this.state === CONNECTION_STATE.CONNECTED) {
      throw new Error("Transport is already connected");
    }
    if (!roomId || !peerId) {
      throw new Error("roomId and peerId are required");
    }

    this.roomId = roomId;
    this.peerId = peerId;
    this._setState(CONNECTION_STATE.CONNECTING);

    try {
      this.network.join(this);
      this._setState(CONNECTION_STATE.CONNECTED);
    } catch (error) {
      this.roomId = null;
      this.peerId = null;
      this._setState(CONNECTION_STATE.DISCONNECTED);
      throw error;
    }
  }

  async disconnect() {
    if (this.state === CONNECTION_STATE.DISCONNECTED) {
      return;
    }

    if (this.roomId && this.peerId) {
      this.network.leave(this);
    }

    this.roomId = null;
    this.peerId = null;
    this._setState(CONNECTION_STATE.DISCONNECTED);
  }

  sendReliable(message, options = {}) {
    this._send(DELIVERY.RELIABLE, message, options);
  }

  sendRealtime(message, options = {}) {
    this._send(DELIVERY.REALTIME, message, options);
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

  /** Simulates a temporary network interruption in integration tests. */
  simulateConnectionLoss() {
    if (this.state !== CONNECTION_STATE.CONNECTED) {
      return;
    }

    this.network.leave(this);
    this._setState(CONNECTION_STATE.RECONNECTING);
  }

  /** Restores a transport previously moved into the reconnecting state. */
  restoreConnection() {
    if (this.state !== CONNECTION_STATE.RECONNECTING) {
      throw new Error("Transport is not reconnecting");
    }

    this.network.join(this);
    this._setState(CONNECTION_STATE.CONNECTED);
  }

  notifyMessage(event) {
    this._emit("message", event);
  }

  notifyPeerJoined(peerId) {
    this._emit("peerJoined", peerId);
  }

  notifyPeerLeft(peerId) {
    this._emit("peerLeft", peerId);
  }

  _send(delivery, message, { to } = {}) {
    if (this.state !== CONNECTION_STATE.CONNECTED) {
      throw new Error("Cannot send while transport is not connected");
    }

    this.network.deliver(this, delivery, message, to);
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

  _setState(state) {
    if (state === this.state) {
      return;
    }

    this.state = state;
    this._emit("stateChanged", state);
  }
}
