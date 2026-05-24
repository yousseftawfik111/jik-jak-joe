import { initAuth } from "./auth.js";
import {
  createRoom,
  joinRoom,
  subscribeToGame,
  makeMove,
  getPlayerSymbol,
  isMyTurn,
  lockMainCell,
  setMainCellWinner,
  setGameWinner,
  votePlayAgain,
  resetGame,
} from "./multiplayer.js";
import {
  getActiveMainCell,
  calculateMoveResult,
  checkGameWin,
  isValidMove,
} from "./game-logic.js";
import {
  initElements,
  getElements,
  showScreen,
  showError,
  setButtonLoading,
  updateRoomDisplay,
  initializeBoard,
  renderBoard,
  updateTurnIndicator,
  updatePlayAgainUI,
  isWaitingRoomVisible,
  getRoomCodeInput,
  setRoomCodeInput,
  showCopySuccess,
  getDisplayedRoomCode,
} from "./ui.js";

let gameState = null;
let hasShownWinAlert = false;

initAuth().catch(console.error);

document.addEventListener("DOMContentLoaded", () => {
  initElements();
  setupEventListeners();
});

function setupEventListeners() {
  const els = getElements();

  els.createRoomBtn.addEventListener("click", handleCreateRoom);
  els.joinRoomBtn.addEventListener("click", handleJoinRoom);
  els.playAgainBtn.addEventListener("click", handlePlayAgain);
  els.copyCodeBtn.addEventListener("click", handleCopyCode);

  els.roomCodeInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleJoinRoom();
    }
  });

  els.roomCodeInput.addEventListener("input", (e) => {
    setRoomCodeInput(e.target.value.toUpperCase());
  });

  els.gameContainer.addEventListener("click", handleCellClick);
}

async function handleCreateRoom() {
  const els = getElements();

  try {
    setButtonLoading(els.createRoomBtn, true, "Creating...", "Create Room");

    const roomId = await createRoom();

    updateRoomDisplay(roomId, "X");
    showScreen("waiting");
    subscribeToGame(onGameStateUpdate);
  } catch (error) {
    showError(error.message);
  } finally {
    setButtonLoading(els.createRoomBtn, false, "Creating...", "Create Room");
  }
}

async function handleJoinRoom() {
  const els = getElements();
  const code = getRoomCodeInput();

  if (!code) {
    showError("Please enter a room code");
    return;
  }

  try {
    setButtonLoading(els.joinRoomBtn, true, "Joining...", "Join");

    await joinRoom(code);

    updateRoomDisplay(code.toUpperCase(), "O");
    showScreen("game");
    initializeBoard();
    subscribeToGame(onGameStateUpdate);
  } catch (error) {
    showError(error.message);
  } finally {
    setButtonLoading(els.joinRoomBtn, false, "Joining...", "Join");
  }
}

async function handlePlayAgain() {
  await votePlayAgain();
}

function handleCopyCode() {
  const code = getDisplayedRoomCode();
  navigator.clipboard.writeText(code).then(showCopySuccess);
}

async function handleCellClick(event) {
  const subCell = event.target;
  if (!subCell.classList.contains("sub-cell")) return;

  if (!gameState || gameState.status !== "playing") return;

  const mainIndex = parseInt(subCell.parentElement.dataset.main);
  const subIndex = parseInt(subCell.dataset.sub);
  const mySymbol = getPlayerSymbol();

  if (!isMyTurn(gameState.currentTurn)) {
    return;
  }

  const lockedCells = gameState.lockedCells || [];
  const activeMainCell = getActiveMainCell(gameState.activeMainCell, lockedCells);

  if (!isValidMove(gameState, mainIndex, subIndex, activeMainCell)) {
    return;
  }

  const moveResult = calculateMoveResult(
    gameState.board,
    mainIndex,
    subIndex,
    mySymbol,
    lockedCells
  );

  await makeMove(mainIndex, subIndex, mySymbol, moveResult.nextActiveMainCell);

  if (moveResult.willWinMainCell) {
    await setMainCellWinner(mainIndex, mySymbol);

    const updatedMainWinners = [...gameState.mainCellWinners];
    updatedMainWinners[mainIndex] = mySymbol;

    if (checkGameWin(updatedMainWinners, mySymbol)) {
      await setGameWinner(mySymbol);
      return;
    }

    await lockMainCell(mainIndex);
  } else if (moveResult.willFillMainCell) {
    await lockMainCell(mainIndex);
  }
}

function onGameStateUpdate(state) {
  const previousStatus = gameState?.status;
  gameState = state;

  if (state.status === "playing" && isWaitingRoomVisible()) {
    showScreen("game");
    initializeBoard();
  }

  if (previousStatus === "finished" && state.status === "playing") {
    hasShownWinAlert = false;
    initializeBoard();
  }

  if (state.status === "finished" && state.winner && !hasShownWinAlert) {
    hasShownWinAlert = true;
    const mySymbol = getPlayerSymbol();
    const message = state.winner === mySymbol ? "You won!" : "You lost!";
    setTimeout(() => alert(message), 100);
  }

  const mySymbol = getPlayerSymbol();
  renderBoard(state);
  updateTurnIndicator(state.currentTurn, state.status, mySymbol);
  updatePlayAgainUI(state, mySymbol);

  const votes = state.playAgainVotes || { X: false, O: false };
  if (votes.X && votes.O && state.status === "finished") {
    resetGame();
  }
}
