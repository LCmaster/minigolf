import test from "node:test";
import assert from "node:assert/strict";

import {
  CONNECTION_STATE,
  DELIVERY,
} from "../../src/lib/multiplayer/transport/MultiplayerTransport.js";
import {
  InMemoryNetwork,
  InMemoryTransport,
} from "../../src/lib/multiplayer/transport/InMemoryTransport.js";

test("peers discover each other and exchange reliable messages", async () => {
  const network = new InMemoryNetwork();
  const alice = new InMemoryTransport(network);
  const bob = new InMemoryTransport(network);
  const alicePeers = [];
  const bobPeers = [];
  const received = [];

  alice.onPeerJoined((peerId) => alicePeers.push(peerId));
  bob.onPeerJoined((peerId) => bobPeers.push(peerId));
  bob.onMessage((event) => received.push(event));

  await alice.connect({ roomId: "room", peerId: "alice" });
  await bob.connect({ roomId: "room", peerId: "bob" });
  alice.sendReliable({ hello: "world" });

  assert.deepEqual(alicePeers, ["bob"]);
  assert.deepEqual(bobPeers, ["alice"]);
  assert.deepEqual(received, [
    {
      data: { hello: "world" },
      delivery: DELIVERY.RELIABLE,
      from: "alice",
    },
  ]);
});

test("targeted delivery reaches only the requested peer", async () => {
  const network = new InMemoryNetwork();
  const alice = new InMemoryTransport(network);
  const bob = new InMemoryTransport(network);
  const charlie = new InMemoryTransport(network);
  const bobMessages = [];
  const charlieMessages = [];

  bob.onMessage((event) => bobMessages.push(event));
  charlie.onMessage((event) => charlieMessages.push(event));

  await alice.connect({ roomId: "room", peerId: "alice" });
  await bob.connect({ roomId: "room", peerId: "bob" });
  await charlie.connect({ roomId: "room", peerId: "charlie" });

  alice.sendReliable({ private: true }, { to: "bob" });

  assert.equal(bobMessages.length, 1);
  assert.equal(charlieMessages.length, 0);
});

test("temporary connection loss can be restored without creating a new transport", async () => {
  const network = new InMemoryNetwork();
  const transport = new InMemoryTransport(network);
  const states = [];

  transport.onStateChanged((state) => states.push(state));
  await transport.connect({ roomId: "room", peerId: "alice" });

  transport.simulateConnectionLoss();
  transport.restoreConnection();

  assert.equal(transport.state, CONNECTION_STATE.CONNECTED);
  assert.deepEqual(states, [
    CONNECTION_STATE.CONNECTING,
    CONNECTION_STATE.CONNECTED,
    CONNECTION_STATE.RECONNECTING,
    CONNECTION_STATE.CONNECTED,
  ]);
});

test("disconnect is idempotent and prevents sends", async () => {
  const transport = new InMemoryTransport();
  await transport.connect({ roomId: "room", peerId: "alice" });

  await transport.disconnect();
  await transport.disconnect();

  assert.equal(transport.state, CONNECTION_STATE.DISCONNECTED);
  assert.throws(() => transport.sendRealtime({ position: [0, 0, 0] }));
});
