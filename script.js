import { appendMultipleCreatedElements } from "./utils.js";
import {
  initAuth,
  createRoom,
  joinRoom,
  subscribeToGame,
  makeMove,
  getPlayerSymbol,
  isMyTurn,
  getRoomId,
  lockMainCell,
  setMainCellWinner,
  setGameWinner,
  votePlayAgain,
  resetGame,
} from "./multiplayer.js";

initAuth().catch(console.error);

// DOM Elements
const lobby = document.getElementById("lobby");
const waitingRoom = document.getElementById("waiting-room");
const gameScreen = document.getElementById("game-screen");
const createRoomBtn = document.getElementById("create-room-btn");
const joinRoomBtn = document.getElementById("join-room-btn");
const roomCodeInput = document.getElementById("room-code-input");
const displayRoomCode = document.getElementById("display-room-code");
const copyCodeBtn = document.getElementById("copy-code-btn");
const lobbyError = document.getElementById("lobby-error");
const playerSymbolDisplay = document.getElementById("player-symbol");
const turnIndicator = document.getElementById("turn-indicator");
const gameRoomCode = document.getElementById("game-room-code");
const gameContainer = document.querySelector(".game-container");
const playAgainBtn = document.getElementById("play-again-btn");
const playAgainStatus = document.getElementById("play-again-status");

const CELL_COUNT = 9;
const winningPatterns = [
  [0, 1, 2],
  [0, 3, 6],
  [0, 4, 8],
  [1, 4, 7],
  [2, 4, 6],
  [2, 5, 8],
  [3, 4, 5],
  [6, 7, 8],
];

let gameState = null;
let allSubCellElements = null;
let allMainCellElements = null;

function showScreen(screen) {
  lobby.classList.add("hidden");
  waitingRoom.classList.add("hidden");
  gameScreen.classList.add("hidden");
  screen.classList.remove("hidden");
}

function showError(message) {
  lobbyError.textContent = message;
  setTimeout(() => {
    lobbyError.textContent = "";
  }, 3000);
}

function initializeBoard() {
  gameContainer.innerHTML = "";

  appendMultipleCreatedElements(
    gameContainer,
    "div",
    ["main-cell"],
    "main",
    CELL_COUNT,
  );

  allMainCellElements = document.querySelectorAll(".main-cell");
  allMainCellElements.forEach((mainCell) => {
    appendMultipleCreatedElements(
      mainCell,
      "div",
      ["sub-cell"],
      "sub",
      CELL_COUNT,
    );
  });

  allSubCellElements = document.querySelectorAll(".sub-cell");
}

function renderBoard(state) {
  if (!state || !allSubCellElements) return;

  allSubCellElements.forEach((subCell) => {
    const mainIndex = parseInt(subCell.parentElement.dataset.main);
    const subIndex = parseInt(subCell.dataset.sub);
    const value = state.board[mainIndex][subIndex];
    subCell.textContent = value || "";
  });

  allMainCellElements.forEach((mainCell, index) => {
    const winner = state.mainCellWinners[index];
    if (winner) {
      mainCell.setAttribute("data-player-won", winner);
    } else {
      mainCell.removeAttribute("data-player-won");
    }
  });

  updateActiveCell(state);
  updateTurnIndicator(state.currentTurn, state.status);
}

function getActiveMainCell(state) {
  const lockedCells = state.lockedCells || [];
  const raw = state.activeMainCell;
  
  if (raw === null || raw === undefined) {
    return null;
  }
  
  const parsed = parseInt(raw, 10);
  
  if (isNaN(parsed) || lockedCells.includes(parsed)) {
    return null;
  }
  
  return parsed;
}

function updateActiveCell(state) {
  allMainCellElements.forEach((cell) => cell.classList.remove("active-main-cell"));

  if (state.status !== "playing") return;

  const lockedCells = state.lockedCells || [];
  const activeMainCell = getActiveMainCell(state);

  if (activeMainCell === null) {
    allMainCellElements.forEach((mainCell, index) => {
      if (!lockedCells.includes(index)) {
        mainCell.classList.add("active-main-cell");
      }
    });
  } else {
    const targetCell = document.querySelector(`[data-main="${activeMainCell}"]`);
    if (targetCell) {
      targetCell.classList.add("active-main-cell");
    }
  }
}

function updateTurnIndicator(currentTurn, status) {
  if (status === "finished") {
    turnIndicator.textContent = "";
    turnIndicator.classList.remove("my-turn", "opponent-turn");
    return;
  }
  
  const mySymbol = getPlayerSymbol();
  if (currentTurn === mySymbol) {
    turnIndicator.textContent = "Your turn!";
    turnIndicator.classList.add("my-turn");
    turnIndicator.classList.remove("opponent-turn");
  } else {
    turnIndicator.textContent = "Opponent's turn";
    turnIndicator.classList.remove("my-turn");
    turnIndicator.classList.add("opponent-turn");
  }
}

function checkWinPattern(cells, symbol) {
  const playerCells = cells
    .filter((cell) => cell.value === symbol)
    .map((cell) => cell.index);

  for (const pattern of winningPatterns) {
    if (pattern.every((idx) => playerCells.includes(idx))) {
      return true;
    }
  }
  return false;
}

async function handleCellClick(event) {
  if (!gameState || gameState.status !== "playing") return;

  const subCell = event.target;
  if (!subCell.classList.contains("sub-cell")) return;

  const mainIndex = parseInt(subCell.parentElement.dataset.main);
  const subIndex = parseInt(subCell.dataset.sub);
  const mySymbol = getPlayerSymbol();

  if (!isMyTurn(gameState.currentTurn)) {
    return;
  }

  if (gameState.board[mainIndex][subIndex]) {
    return;
  }

  const lockedCells = gameState.lockedCells || [];
  if (lockedCells.includes(mainIndex)) {
    return;
  }

  const activeMainCell = getActiveMainCell(gameState);
  const canPlayAnywhere = activeMainCell === null;
  
  if (!canPlayAnywhere && mainIndex !== activeMainCell) {
    return;
  }

  const updatedBoard = [...gameState.board];
  updatedBoard[mainIndex] = [...updatedBoard[mainIndex]];
  updatedBoard[mainIndex][subIndex] = mySymbol;

  const mainCellData = updatedBoard[mainIndex].map((val, idx) => ({
    value: val,
    index: idx,
  }));

  const willWinMainCell = checkWinPattern(mainCellData, mySymbol);
  const willFillMainCell = updatedBoard[mainIndex].every((cell) => cell !== "");
  const willLockMainCell = willWinMainCell || willFillMainCell;

  let nextActiveMainCell = subIndex;
  const targetWillBeLocked = lockedCells.includes(subIndex) || 
    (subIndex === mainIndex && willLockMainCell);
  
  if (targetWillBeLocked) {
    nextActiveMainCell = null;
  }

  await makeMove(mainIndex, subIndex, mySymbol, nextActiveMainCell);

  if (willWinMainCell) {
    await setMainCellWinner(mainIndex, mySymbol);

    const updatedMainWinners = [...gameState.mainCellWinners];
    updatedMainWinners[mainIndex] = mySymbol;

    const mainCellWinData = updatedMainWinners.map((val, idx) => ({
      value: val,
      index: idx,
    }));

    if (checkWinPattern(mainCellWinData, mySymbol)) {
      await setGameWinner(mySymbol);
      setTimeout(() => alert(`${mySymbol} wins the game!`), 100);
      return;
    }

    await lockMainCell(mainIndex);
  } else if (willFillMainCell) {
    await lockMainCell(mainIndex);
  }
}

let hasShownWinAlert = false;

function updatePlayAgainUI(state) {
  if (!playAgainBtn || !playAgainStatus) return;

  const votes = state.playAgainVotes || { X: false, O: false };
  const mySymbol = getPlayerSymbol();
  const iVoted = votes[mySymbol];
  const opponentVoted = votes[mySymbol === "X" ? "O" : "X"];

  if (state.status === "finished") {
    playAgainBtn.classList.remove("hidden");
    
    if (iVoted && !opponentVoted) {
      playAgainBtn.disabled = true;
      playAgainBtn.textContent = "Waiting...";
      playAgainStatus.textContent = "Waiting for opponent";
    } else if (!iVoted && opponentVoted) {
      playAgainBtn.disabled = false;
      playAgainBtn.textContent = "Play Again";
      playAgainStatus.textContent = "Opponent wants rematch!";
    } else if (!iVoted && !opponentVoted) {
      playAgainBtn.disabled = false;
      playAgainBtn.textContent = "Play Again";
      playAgainStatus.textContent = "";
    }
  } else {
    playAgainBtn.classList.add("hidden");
    playAgainStatus.textContent = "";
  }
}

function onGameStateUpdate(state) {
  const previousStatus = gameState?.status;
  gameState = state;

  if (state.status === "playing" && waitingRoom.classList.contains("hidden") === false) {
    showScreen(gameScreen);
    initializeBoard();
    gameContainer.addEventListener("click", handleCellClick);
  }

  if (previousStatus === "finished" && state.status === "playing") {
    hasShownWinAlert = false;
    initializeBoard();
    gameContainer.addEventListener("click", handleCellClick);
  }

  if (state.status === "finished" && state.winner && !hasShownWinAlert) {
    hasShownWinAlert = true;
    const mySymbol = getPlayerSymbol();
    const message = state.winner === mySymbol ? "You won!" : "You lost!";
    setTimeout(() => alert(message), 100);
  }

  renderBoard(state);
  updatePlayAgainUI(state);

  const votes = state.playAgainVotes || { X: false, O: false };
  if (votes.X && votes.O && state.status === "finished") {
    resetGame();
  }
}

createRoomBtn.addEventListener("click", async () => {
  try {
    createRoomBtn.disabled = true;
    createRoomBtn.textContent = "Creating...";

    const roomId = await createRoom();

    displayRoomCode.textContent = roomId;
    gameRoomCode.textContent = roomId;
    playerSymbolDisplay.textContent = "X";

    showScreen(waitingRoom);
    subscribeToGame(onGameStateUpdate);
  } catch (error) {
    showError(error.message);
  } finally {
    createRoomBtn.disabled = false;
    createRoomBtn.textContent = "Create Room";
  }
});

joinRoomBtn.addEventListener("click", async () => {
  const code = roomCodeInput.value.trim();
  if (!code) {
    showError("Please enter a room code");
    return;
  }

  try {
    joinRoomBtn.disabled = true;
    joinRoomBtn.textContent = "Joining...";

    await joinRoom(code);

    gameRoomCode.textContent = code.toUpperCase();
    playerSymbolDisplay.textContent = "O";

    showScreen(gameScreen);
    initializeBoard();
    gameContainer.addEventListener("click", handleCellClick);
    subscribeToGame(onGameStateUpdate);
  } catch (error) {
    showError(error.message);
  } finally {
    joinRoomBtn.disabled = false;
    joinRoomBtn.textContent = "Join";
  }
});

roomCodeInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    joinRoomBtn.click();
  }
});

roomCodeInput.addEventListener("input", (e) => {
  e.target.value = e.target.value.toUpperCase();
});

copyCodeBtn.addEventListener("click", () => {
  const code = displayRoomCode.textContent;
  navigator.clipboard.writeText(code).then(() => {
    copyCodeBtn.textContent = "✓";
    setTimeout(() => {
      copyCodeBtn.textContent = "📋";
    }, 1500);
  });
});

playAgainBtn.addEventListener("click", async () => {
  await votePlayAgain();
});
