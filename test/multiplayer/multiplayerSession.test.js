import test from "node:test";
import assert from "node:assert/strict";

import { MultiplayerSession } from "../../src/lib/multiplayer/MultiplayerSession.js";
import { createMessage } from "../../src/lib/multiplayer/protocol.js";
import {
  DELIVERY,
  CONNECTION_STATE,
} from "../../src/lib/multiplayer/transport/MultiplayerTransport.js";
import {
  InMemoryNetwork,
  InMemoryTransport,
} from "../../src/lib/multiplayer/transport/InMemoryTransport.js";

function createIdGenerator(prefix) {
  let nextId = 0;
  return () => `${prefix}-${nextId++}`;
}

test("session forwards application messages without exposing transport details", async () => {
  const network = new InMemoryNetwork();
  const alice = new MultiplayerSession({
    transport: new InMemoryTransport(network),
    createId: createIdGenerator("alice"),
  });
  const bob = new MultiplayerSession({
    transport: new InMemoryTransport(network),
    createId: createIdGenerator("bob"),
  });
  const received = [];

  bob.onMessage((event) => received.push(event));

  await alice.connect({ roomId: "room", peerId: "alice" });
  await bob.connect({ roomId: "room", peerId: "bob" });
  alice.sendReliable("game.shot-stopped", { strokes: 2 });

  assert.equal(received.length, 1);
  assert.equal(received[0].message.type, "game.shot-stopped");
  assert.deepEqual(received[0].message.payload, { strokes: 2 });
  assert.equal(received[0].delivery, DELIVERY.RELIABLE);
});

test("duplicate reliable messages are processed once", async () => {
  const transport = new InMemoryTransport();
  const session = new MultiplayerSession({ transport });
  const received = [];
  session.onMessage((event) => received.push(event));

  await session.connect({ roomId: "room", peerId: "bob" });

  const message = createMessage({
    type: "game.score",
    senderId: "alice",
    sequence: 1,
    payload: { score: 3 },
    messageId: "duplicate-id",
  });
  const event = { data: message, delivery: DELIVERY.RELIABLE, from: "alice" };

  transport.notifyMessage(event);
  transport.notifyMessage(event);

  assert.equal(received.length, 1);
});

test("malformed network messages fail safely", async () => {
  const transport = new InMemoryTransport();
  const session = new MultiplayerSession({ transport });
  const errors = [];
  const received = [];

  session.onProtocolError((event) => errors.push(event));
  session.onMessage((event) => received.push(event));
  await session.connect({ roomId: "room", peerId: "bob" });

  transport.notifyMessage({
    data: { protocolVersion: 999 },
    delivery: DELIVERY.RELIABLE,
    from: "alice",
  });

  assert.equal(errors.length, 1);
  assert.equal(received.length, 0);
});

test("a peer can restore state from an existing peer", async () => {
  const network = new InMemoryNetwork();
  const expectedState = {
    hole: 4,
    players: { alice: { strokes: 2, position: [1, 0, 3] } },
  };
  let restoredState = null;

  const alice = new MultiplayerSession({
    transport: new InMemoryTransport(network),
    getSnapshot: () => expectedState,
    createId: createIdGenerator("alice"),
  });
  const bob = new MultiplayerSession({
    transport: new InMemoryTransport(network),
    applySnapshot: (state) => {
      restoredState = state;
    },
    createId: createIdGenerator("bob"),
  });

  await alice.connect({ roomId: "room", peerId: "alice" });
  await bob.connect({ roomId: "room", peerId: "bob" });
  bob.requestState();

  assert.deepEqual(restoredState, expectedState);
});

test("reconnect requests current state and resumes the existing session", async () => {
  const network = new InMemoryNetwork();
  let aliceState = { hole: 1, score: 2 };
  let bobState = null;
  const aliceTransport = new InMemoryTransport(network);
  const bobTransport = new InMemoryTransport(network);

  const alice = new MultiplayerSession({
    transport: aliceTransport,
    getSnapshot: () => aliceState,
    createId: createIdGenerator("alice"),
  });
  const bob = new MultiplayerSession({
    transport: bobTransport,
    applySnapshot: (state) => {
      bobState = state;
    },
    createId: createIdGenerator("bob"),
  });

  await alice.connect({ roomId: "room", peerId: "alice" });
  await bob.connect({ roomId: "room", peerId: "bob" });
  bob.requestState();
  assert.deepEqual(bobState, aliceState);

  bobTransport.simulateConnectionLoss();
  aliceState = { hole: 2, score: 4 };
  bobTransport.restoreConnection();

  assert.equal(bob.state, CONNECTION_STATE.CONNECTED);
  assert.deepEqual(bobState, aliceState);
});

test("only the first snapshot for a state request is applied", async () => {
  const network = new InMemoryNetwork();
  const applied = [];

  const alice = new MultiplayerSession({
    transport: new InMemoryTransport(network),
    getSnapshot: () => ({ source: "alice" }),
    createId: createIdGenerator("alice"),
  });
  const charlie = new MultiplayerSession({
    transport: new InMemoryTransport(network),
    getSnapshot: () => ({ source: "charlie" }),
    createId: createIdGenerator("charlie"),
  });
  const bob = new MultiplayerSession({
    transport: new InMemoryTransport(network),
    applySnapshot: (state) => applied.push(state),
    createId: createIdGenerator("bob"),
  });

  await alice.connect({ roomId: "room", peerId: "alice" });
  await charlie.connect({ roomId: "room", peerId: "charlie" });
  await bob.connect({ roomId: "room", peerId: "bob" });
  bob.requestState();

  assert.equal(applied.length, 1);
});

test("sender identity must match transport metadata", async () => {
  const transport = new InMemoryTransport();
  const session = new MultiplayerSession({ transport });
  const errors = [];
  const received = [];

  session.onProtocolError((event) => errors.push(event));
  session.onMessage((event) => received.push(event));
  await session.connect({ roomId: "room", peerId: "bob" });

  transport.notifyMessage({
    data: createMessage({
      type: "game.score",
      senderId: "charlie",
      sequence: 1,
      payload: { score: 3 },
      messageId: "spoofed-id",
    }),
    delivery: DELIVERY.RELIABLE,
    from: "alice",
  });

  assert.equal(errors.length, 1);
  assert.equal(received.length, 0);
});

test("disconnect clears the local peer identity", async () => {
  const session = new MultiplayerSession({ transport: new InMemoryTransport() });
  await session.connect({ roomId: "room", peerId: "alice" });
  await session.disconnect();

  assert.throws(
    () => session.sendReliable("game.score", { score: 1 }),
    /must be connected/,
  );
});

test("reconnect replaces an unanswered state request with a fresh request", async () => {
  const network = new InMemoryNetwork();
  const aliceTransport = new InMemoryTransport(network);
  const bobTransport = new InMemoryTransport(network);
  let restored = null;

  const alice = new MultiplayerSession({
    transport: aliceTransport,
    createId: createIdGenerator("alice"),
  });
  const bob = new MultiplayerSession({
    transport: bobTransport,
    applySnapshot: (state) => {
      restored = state;
    },
    createId: createIdGenerator("bob"),
  });

  await alice.connect({ roomId: "room", peerId: "alice" });
  await bob.connect({ roomId: "room", peerId: "bob" });
  bob.requestState();
  assert.equal(restored, null);

  alice.getSnapshot = () => ({ recovered: true });
  bobTransport.simulateConnectionLoss();
  bobTransport.restoreConnection();

  assert.deepEqual(restored, { recovered: true });
});

test("failed connect does not leave the session sendable", async () => {
  const network = new InMemoryNetwork();
  const first = new MultiplayerSession({ transport: new InMemoryTransport(network) });
  const second = new MultiplayerSession({ transport: new InMemoryTransport(network) });

  await first.connect({ roomId: "room", peerId: "same-peer" });
  await assert.rejects(second.connect({ roomId: "room", peerId: "same-peer" }));

  assert.throws(
    () => second.sendReliable("game.score", { score: 1 }),
    /must be connected/,
  );
});

test("dispose removes transport subscriptions", async () => {
  const transport = new InMemoryTransport();
  const session = new MultiplayerSession({ transport });

  await session.connect({ roomId: "room", peerId: "alice" });
  await session.dispose();
  await transport.connect({ roomId: "room", peerId: "alice" });

  assert.equal(session.state, CONNECTION_STATE.DISCONNECTED);
});
