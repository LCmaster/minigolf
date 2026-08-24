export const PROTOCOL_VERSION = 1;

export const SESSION_MESSAGE = Object.freeze({
  STATE_REQUEST: "session.state-request",
  STATE_SNAPSHOT: "session.state-snapshot",
});

export class ProtocolError extends Error {
  constructor(message) {
    super(message);
    this.name = "ProtocolError";
  }
}

/**
 * Creates the common envelope used by every multiplayer message.
 * Message payloads remain owned and validated by the feature that defines them.
 */
export function createMessage({ type, senderId, sequence, payload, messageId }) {
  const message = {
    protocolVersion: PROTOCOL_VERSION,
    type,
    messageId: messageId ?? crypto.randomUUID(),
    senderId,
    sequence,
    payload,
  };

  return parseMessage(message);
}

/**
 * Validates data at the network boundary and returns the normalized envelope.
 * Throws ProtocolError for malformed or unsupported messages.
 */
export function parseMessage(value) {
  if (!isPlainObject(value)) {
    throw new ProtocolError("Multiplayer message must be an object");
  }

  if (value.protocolVersion !== PROTOCOL_VERSION) {
    throw new ProtocolError(`Unsupported protocol version: ${value.protocolVersion}`);
  }

  if (typeof value.type !== "string" || value.type.length === 0) {
    throw new ProtocolError("Multiplayer message type must be a non-empty string");
  }

  if (typeof value.messageId !== "string" || value.messageId.length === 0) {
    throw new ProtocolError("Multiplayer messageId must be a non-empty string");
  }

  if (typeof value.senderId !== "string" || value.senderId.length === 0) {
    throw new ProtocolError("Multiplayer senderId must be a non-empty string");
  }

  if (!Number.isSafeInteger(value.sequence) || value.sequence < 0) {
    throw new ProtocolError("Multiplayer sequence must be a non-negative integer");
  }

  return {
    protocolVersion: value.protocolVersion,
    type: value.type,
    messageId: value.messageId,
    senderId: value.senderId,
    sequence: value.sequence,
    payload: value.payload,
  };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
