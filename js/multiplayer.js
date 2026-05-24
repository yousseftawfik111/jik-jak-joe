import {
  ref,
  set,
  get,
  onValue,
  off,
  update,
  onDisconnect,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";
import { initAuth, getUid, getDb } from "./auth.js";

const SESSION_KEY = "jikjakjoe_session";

let currentRoomId = null;
let currentPlayer = null;
let gameStateCallback = null;
let isHost = false;
let gameSubscriptionRef = null;

function saveSession(roomId, playerSymbol) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ roomId, playerSymbol })
  );
}

function loadSession() {
  const data = localStorage.getItem(SESSION_KEY);
  return data ? JSON.parse(data) : null;
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export { clearSession };

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function getPlayerSymbol() {
  return currentPlayer;
}

export function isMyTurn(currentTurn) {
  return currentPlayer === currentTurn;
}

export function getRoomId() {
  return currentRoomId;
}

export function isHostPlayer() {
  return isHost;
}

export async function createRoom() {
  await initAuth();
  const db = getDb();
  const uid = getUid();

  const roomId = generateRoomCode();
  currentRoomId = roomId;
  currentPlayer = "X";
  isHost = true;

  const roomRef = ref(db, `rooms/${roomId}`);

  const initialState = {
    board: Array(9)
      .fill(null)
      .map(() => Array(9).fill("")),
    lockedCells: [],
    mainCellWinners: Array(9).fill(""),
    currentTurn: "X",
    activeMainCell: null,
    players: {
      X: { connected: true, uid },
    },
    status: "waiting",
    winner: null,
    playAgainVotes: { X: false, O: false },
    createdAt: serverTimestamp(),
  };

  await set(roomRef, initialState);

  const playerRef = ref(db, `rooms/${roomId}/players/X`);
  onDisconnect(playerRef).update({ connected: false });

  saveSession(roomId, "X");

  return roomId;
}

export async function joinRoom(roomId) {
  await initAuth();
  const db = getDb();
  const uid = getUid();

  roomId = roomId.toUpperCase().trim();
  currentRoomId = roomId;

  const roomRef = ref(db, `rooms/${roomId}`);

  return new Promise((resolve, reject) => {
    onValue(
      roomRef,
      async (snapshot) => {
        const data = snapshot.val();

        if (!data) {
          currentRoomId = null;
          reject(new Error("Room not found"));
          return;
        }

        if (data.players?.O?.connected) {
          currentRoomId = null;
          reject(new Error("Room is full"));
          return;
        }

        currentPlayer = "O";
        isHost = false;

        const playerRef = ref(db, `rooms/${roomId}/players/O`);
        await update(playerRef, { connected: true, uid });
        onDisconnect(playerRef).update({ connected: false });

        await update(ref(db, `rooms/${roomId}`), { status: "playing" });

        saveSession(roomId, "O");

        resolve(roomId);
      },
      { onlyOnce: true }
    );
  });
}

export async function tryRejoinSession() {
  const session = loadSession();
  if (!session) return null;

  await initAuth();
  const db = getDb();
  const uid = getUid();

  const roomRef = ref(db, `rooms/${session.roomId}`);
  const snapshot = await get(roomRef);
  const data = snapshot.val();

  if (!data) {
    clearSession();
    return null;
  }

  const playerData = data.players?.[session.playerSymbol];
  if (!playerData || playerData.uid !== uid) {
    clearSession();
    return null;
  }

  currentRoomId = session.roomId;
  currentPlayer = session.playerSymbol;
  isHost = session.playerSymbol === "X";

  const playerRef = ref(db, `rooms/${session.roomId}/players/${session.playerSymbol}`);
  await update(playerRef, { connected: true });
  onDisconnect(playerRef).update({ connected: false });

  return {
    roomId: session.roomId,
    playerSymbol: session.playerSymbol,
    gameState: data,
  };
}

export function subscribeToGame(callback) {
  if (!currentRoomId) return;

  const db = getDb();
  gameStateCallback = callback;
  gameSubscriptionRef = ref(db, `rooms/${currentRoomId}`);

  onValue(gameSubscriptionRef, (snapshot) => {
    const data = snapshot.val();
    if (data && gameStateCallback) {
      gameStateCallback(data);
    }
  });
}

export async function leaveRoom() {
  if (!currentRoomId || !currentPlayer) return;

  const db = getDb();

  if (gameSubscriptionRef) {
    off(gameSubscriptionRef);
    gameSubscriptionRef = null;
  }

  const playerRef = ref(db, `rooms/${currentRoomId}/players/${currentPlayer}`);
  await update(playerRef, { connected: false });

  clearSession();

  currentRoomId = null;
  currentPlayer = null;
  gameStateCallback = null;
  isHost = false;
}

export async function makeMove(mainCellIndex, subCellIndex, symbol, nextActiveMainCell) {
  if (!currentRoomId || symbol !== currentPlayer) return false;

  const db = getDb();
  const updates = {};
  updates[`rooms/${currentRoomId}/board/${mainCellIndex}/${subCellIndex}`] = symbol;
  updates[`rooms/${currentRoomId}/currentTurn`] = symbol === "X" ? "O" : "X";
  updates[`rooms/${currentRoomId}/activeMainCell`] = nextActiveMainCell;

  await update(ref(db), updates);
  return true;
}

export async function lockMainCell(mainCellIndex) {
  if (!currentRoomId) return;

  const db = getDb();
  const roomRef = ref(db, `rooms/${currentRoomId}`);

  onValue(
    roomRef,
    (snapshot) => {
      const data = snapshot.val();
      const lockedCells = data.lockedCells || [];
      if (!lockedCells.includes(mainCellIndex)) {
        lockedCells.push(mainCellIndex);
        update(ref(db, `rooms/${currentRoomId}`), { lockedCells });
      }
    },
    { onlyOnce: true }
  );
}

export async function setMainCellWinner(mainCellIndex, winner) {
  if (!currentRoomId) return;

  const db = getDb();
  const roomRef = ref(db, `rooms/${currentRoomId}`);

  onValue(
    roomRef,
    (snapshot) => {
      const data = snapshot.val();
      const mainCellWinners = data.mainCellWinners || Array(9).fill("");
      mainCellWinners[mainCellIndex] = winner;
      update(ref(db, `rooms/${currentRoomId}`), { mainCellWinners });
    },
    { onlyOnce: true }
  );
}

export async function setGameWinner(winner) {
  if (!currentRoomId) return;

  const db = getDb();
  await update(ref(db, `rooms/${currentRoomId}`), {
    winner,
    status: "finished",
  });
}

export async function votePlayAgain() {
  if (!currentRoomId || !currentPlayer) return;

  const db = getDb();
  await update(ref(db, `rooms/${currentRoomId}/playAgainVotes`), {
    [currentPlayer]: true,
  });
}

export async function resetGame() {
  if (!currentRoomId) return;

  const db = getDb();
  const freshState = {
    board: Array(9)
      .fill(null)
      .map(() => Array(9).fill("")),
    lockedCells: [],
    mainCellWinners: Array(9).fill(""),
    currentTurn: "X",
    activeMainCell: null,
    status: "playing",
    winner: null,
    playAgainVotes: { X: false, O: false },
  };

  await update(ref(db, `rooms/${currentRoomId}`), freshState);
}
