import test from "node:test";
import assert from "node:assert/strict";

import {
  PROTOCOL_VERSION,
  ProtocolError,
  createMessage,
  parseMessage,
} from "../../src/lib/multiplayer/protocol.js";

const validMessage = {
  protocolVersion: PROTOCOL_VERSION,
  type: "game.test",
  messageId: "message-1",
  senderId: "player-a",
  sequence: 3,
  payload: { value: 42 },
};

test("parseMessage accepts a valid protocol envelope", () => {
  assert.deepEqual(parseMessage(validMessage), validMessage);
});

test("createMessage builds and validates an envelope", () => {
  const message = createMessage({
    type: "game.test",
    senderId: "player-a",
    sequence: 0,
    payload: { value: 42 },
    messageId: "fixed-id",
  });

  assert.deepEqual(message, {
    ...validMessage,
    messageId: "fixed-id",
    sequence: 0,
  });
});

test("parseMessage rejects unsupported protocol versions", () => {
  assert.throws(
    () => parseMessage({ ...validMessage, protocolVersion: PROTOCOL_VERSION + 1 }),
    ProtocolError,
  );
});

test("parseMessage rejects malformed envelopes", () => {
  const invalidMessages = [
    null,
    [],
    { ...validMessage, type: "" },
    { ...validMessage, messageId: null },
    { ...validMessage, senderId: "" },
    { ...validMessage, sequence: -1 },
  ];

  for (const message of invalidMessages) {
    assert.throws(() => parseMessage(message), ProtocolError);
  }
});
