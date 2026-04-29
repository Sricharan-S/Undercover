/**
 * PeerJS wrapper for the Undercover online multiplayer mode.
 *
 * Architecture: star topology — the host holds all connections, guests connect
 * only to the host. All game data flows through the host which is the single
 * source of truth.
 *
 * Data connections carry typed JSON messages (NetMessage).
 * Media connections carry audio/video streams for the voice/video overlay.
 */

import type Peer from 'peerjs';
import type { DataConnection, MediaConnection } from 'peerjs';

// ─── Message Types ────────────────────────────────────────────────────────────

export type NetMessageType =
  | 'PLAYER_JOINED'   // guest → host: { peerId, name }
  | 'ROOM_STATE'      // host → all:  { players: RoomPlayer[] }
  | 'GAME_STARTED'    // host → individual: public game state (no roles/words)
  | 'REVEAL_CARD'     // host → individual: { cardId, role, word, playerId }
  | 'STATE_UPDATE'    // host → all:  stripped public GameState
  | 'ACTION'          // guest → host: { type: ActionType, payload }
  | 'HOST_LEAVING'    // host → all:  no payload
  | 'PEER_LEFT';      // synthetic, generated locally on connection close

export type ActionType =
  | 'PICK_CARD'
  | 'CLOSE_REVEAL'
  | 'START_VOTE'
  | 'VOTE'
  | 'CONTINUE_AFTER_ELIMINATION'
  | 'MR_WHITE_GUESS';

export interface NetMessage {
  type: NetMessageType;
  payload?: unknown;
}

// Describes a player as seen in the waiting room / online session
export interface RoomPlayer {
  peerId: string;
  name: string;
}

// ─── Module state (singleton, reset on each new game session) ─────────────────

let _peer: Peer | null = null;
// host only: map of guest peerId → DataConnection
const _dataConns: Map<string, DataConnection> = new Map();
// guest only: single connection back to the host
let _hostConn: DataConnection | null = null;
// voice/video: all active media connections
const _mediaConns: Map<string, MediaConnection> = new Map();
// local audio/video stream (if voice is on)
let _localStream: MediaStream | null = null;

// Callbacks registered by the app layer
type MsgHandler = (msg: NetMessage, fromPeerId: string) => void;
type PeerHandler = (peerId: string, name?: string) => void;
type StreamHandler = (peerId: string, stream: MediaStream) => void;

const _onMessage: MsgHandler[] = [];
const _onPeerJoined: PeerHandler[] = [];
const _onPeerLeft: PeerHandler[] = [];
const _onStream: StreamHandler[] = [];

function emit(handlers: MsgHandler[], msg: NetMessage, from: string) {
  handlers.forEach((h) => h(msg, from));
}

function emitPeer(handlers: PeerHandler[], peerId: string, name?: string) {
  handlers.forEach((h) => h(peerId, name));
}

function emitStream(peerId: string, stream: MediaStream) {
  _onStream.forEach((h) => h(peerId, stream));
}

// ─── Event registration ───────────────────────────────────────────────────────

export function onMessage(handler: MsgHandler) {
  _onMessage.push(handler);
}

export function onPeerJoined(handler: PeerHandler) {
  _onPeerJoined.push(handler);
}

export function onPeerLeft(handler: PeerHandler) {
  _onPeerLeft.push(handler);
}

export function onStream(handler: StreamHandler) {
  _onStream.push(handler);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function wireDataConn(conn: DataConnection, isHostSide: boolean) {
  conn.on('data', (raw) => {
    const msg = raw as NetMessage;
    if (isHostSide && msg.type === 'PLAYER_JOINED') {
      const p = msg.payload as { peerId: string; name: string };
      emitPeer(_onPeerJoined, conn.peer, p.name);
    }
    emit(_onMessage, msg, conn.peer);
  });

  conn.on('close', () => {
    if (isHostSide) {
      _dataConns.delete(conn.peer);
    } else {
      _hostConn = null;
    }
    emit(_onMessage, { type: 'PEER_LEFT' }, conn.peer);
    emitPeer(_onPeerLeft, conn.peer);
  });

  conn.on('error', (err) => {
    console.warn('[peer] data connection error', err);
  });
}

function wireMediaConn(conn: MediaConnection) {
  conn.on('stream', (stream) => {
    _mediaConns.set(conn.peer, conn);
    emitStream(conn.peer, stream);
  });
  conn.on('close', () => {
    _mediaConns.delete(conn.peer);
  });
}

// ─── Initialise / destroy ─────────────────────────────────────────────────────

/**
 * Generate a short human-friendly room code (6 lowercase alphanumeric chars).
 * Used as the PeerJS peer ID for the host so guests can type it easily.
 */
function generateRoomCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // no ambiguous chars (0/o, 1/l/i)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Lazily import PeerJS (it's large, no need to load on the offline path).
 */
async function makePeerInstance(id?: string): Promise<Peer> {
  const { Peer: PeerClass } = await import('peerjs');
  return id ? new PeerClass(id) : new PeerClass();
}

/**
 * Tear down any existing peer / connections and reset module state.
 */
export function destroyPeer() {
  _peer?.destroy();
  _peer = null;
  _dataConns.clear();
  _hostConn = null;
  _mediaConns.clear();
  stopLocalStream();
  _onMessage.length = 0;
  _onPeerJoined.length = 0;
  _onPeerLeft.length = 0;
  _onStream.length = 0;
}

// ─── Host API ─────────────────────────────────────────────────────────────────

/**
 * Create a new room. Resolves with the room code (= host's PeerJS ID).
 * The returned code is what guests enter to join.
 */
export async function createRoom(): Promise<string> {
  destroyPeer();
  // Use a short human-friendly code as the PeerJS ID so guests can type it
  const roomCode = generateRoomCode();
  const peer = await makePeerInstance(roomCode);
  _peer = peer;

  return new Promise((resolve, reject) => {
    peer.on('open', (id) => {
      // Incoming data connections from guests
      peer.on('connection', (conn) => {
        conn.on('open', () => {
          _dataConns.set(conn.peer, conn);
          wireDataConn(conn, true);

          // If the guest already shared their local stream, call them back
          if (_localStream) {
            const mc = peer.call(conn.peer, _localStream);
            if (mc) wireMediaConn(mc);
          }
        });
      });

      // Incoming media connections (guest calling host with their stream)
      peer.on('call', (mc) => {
        if (_localStream) mc.answer(_localStream);
        else mc.answer();
        wireMediaConn(mc);
      });

      peer.on('error', (err) => console.warn('[peer:host] error', err));

      resolve(id);
    });

    peer.on('error', reject);
  });
}

/**
 * Broadcast a message to all connected guests (host only).
 */
export function broadcast(msg: NetMessage) {
  const data = JSON.stringify(msg);
  _dataConns.forEach((conn) => {
    if (conn.open) conn.send(JSON.parse(data));
  });
}

/**
 * Send a message to a specific guest (host only).
 */
export function sendToPeer(peerId: string, msg: NetMessage) {
  const conn = _dataConns.get(peerId);
  if (conn?.open) conn.send(msg);
}

/**
 * Returns a snapshot list of currently connected guest peerIds (host only).
 */
export function getConnectedPeerIds(): string[] {
  return [..._dataConns.keys()];
}

// ─── Guest API ────────────────────────────────────────────────────────────────

/**
 * Join an existing room. Resolves when the data connection to the host is open.
 * `myName` is broadcast to the host so they can show the lobby player list.
 */
export async function joinRoom(roomCode: string, myName: string): Promise<string> {
  destroyPeer();
  const peer = await makePeerInstance();
  _peer = peer;

  return new Promise((resolve, reject) => {
    peer.on('open', (myId) => {
      const conn = peer.connect(roomCode, { reliable: true });

      conn.on('open', () => {
        _hostConn = conn;
        wireDataConn(conn, false);

        // Announce ourselves to the host
        conn.send({ type: 'PLAYER_JOINED', payload: { peerId: myId, name: myName } } satisfies NetMessage);

        // Listen for the host's media stream
        peer.on('call', (mc) => {
          if (_localStream) mc.answer(_localStream);
          else mc.answer();
          wireMediaConn(mc);
        });

        peer.on('error', (err) => console.warn('[peer:guest] error', err));

        resolve(myId);
      });

      conn.on('error', reject);
      peer.on('error', reject);
    });

    peer.on('error', reject);
  });
}

/**
 * Send an action message to the host (guest only).
 */
export function sendToHost(msg: NetMessage) {
  if (_hostConn?.open) _hostConn.send(msg);
}

/**
 * Returns this peer's own ID (available after createRoom / joinRoom resolves).
 */
export function getMyPeerId(): string | null {
  return _peer?.id ?? null;
}

// ─── Voice / Video API ────────────────────────────────────────────────────────

/**
 * Request microphone (+ optionally camera) access and call all currently
 * connected peers with the stream. Resolves with the local MediaStream.
 */
export async function openLocalStream(video = false): Promise<MediaStream> {
  if (_localStream) stopLocalStream();

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
  _localStream = stream;

  // Call all existing connections with our stream
  if (_peer) {
    const targets = _dataConns.size > 0
      ? [..._dataConns.keys()]
      : _hostConn ? [_hostConn.peer] : [];

    for (const peerId of targets) {
      try {
        const mc = _peer.call(peerId, stream);
        if (mc) wireMediaConn(mc);
      } catch (e) {
        console.warn('[peer] failed to call peer', peerId, e);
      }
    }
  }

  return stream;
}

/**
 * Stop the local stream and close all outgoing media connections.
 */
export function stopLocalStream() {
  _localStream?.getTracks().forEach((t) => t.stop());
  _localStream = null;
  _mediaConns.forEach((mc) => mc.close());
  _mediaConns.clear();
}

export function getLocalStream(): MediaStream | null {
  return _localStream;
}
