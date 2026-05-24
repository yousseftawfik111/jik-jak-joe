import { CELL_COUNT } from "./config.js";
import { getActiveMainCell } from "./game-logic.js";

const elements = {
  lobby: null,
  waitingRoom: null,
  gameScreen: null,
  gameContainer: null,
  createRoomBtn: null,
  joinRoomBtn: null,
  roomCodeInput: null,
  displayRoomCode: null,
  copyCodeBtn: null,
  lobbyError: null,
  playerSymbolDisplay: null,
  turnIndicator: null,
  gameRoomCode: null,
  playAgainBtn: null,
  playAgainStatus: null,
  leaveRoomBtn: null,
  leaveWaitingBtn: null,
};

let allMainCellElements = null;
let allSubCellElements = null;

export function initElements() {
  elements.lobby = document.getElementById("lobby");
  elements.waitingRoom = document.getElementById("waiting-room");
  elements.gameScreen = document.getElementById("game-screen");
  elements.gameContainer = document.querySelector(".game-container");
  elements.createRoomBtn = document.getElementById("create-room-btn");
  elements.joinRoomBtn = document.getElementById("join-room-btn");
  elements.roomCodeInput = document.getElementById("room-code-input");
  elements.displayRoomCode = document.getElementById("display-room-code");
  elements.copyCodeBtn = document.getElementById("copy-code-btn");
  elements.lobbyError = document.getElementById("lobby-error");
  elements.playerSymbolDisplay = document.getElementById("player-symbol");
  elements.turnIndicator = document.getElementById("turn-indicator");
  elements.gameRoomCode = document.getElementById("game-room-code");
  elements.playAgainBtn = document.getElementById("play-again-btn");
  elements.playAgainStatus = document.getElementById("play-again-status");
  elements.leaveRoomBtn = document.getElementById("leave-room-btn");
  elements.leaveWaitingBtn = document.getElementById("leave-waiting-btn");
}

export function getElements() {
  return elements;
}

export function showScreen(screenName) {
  elements.lobby.classList.add("hidden");
  elements.waitingRoom.classList.add("hidden");
  elements.gameScreen.classList.add("hidden");

  if (screenName === "lobby") {
    elements.lobby.classList.remove("hidden");
  } else if (screenName === "waiting") {
    elements.waitingRoom.classList.remove("hidden");
  } else if (screenName === "game") {
    elements.gameScreen.classList.remove("hidden");
  }
}

export function showError(message) {
  elements.lobbyError.textContent = message;
  setTimeout(() => {
    elements.lobbyError.textContent = "";
  }, 3000);
}

export function setButtonLoading(button, isLoading, loadingText, normalText) {
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : normalText;
}

export function updateRoomDisplay(roomCode, playerSymbol) {
  elements.displayRoomCode.textContent = roomCode;
  elements.gameRoomCode.textContent = roomCode;
  elements.playerSymbolDisplay.textContent = playerSymbol;
}

function createElements(parent, tagName, classNames, dataAttr, count) {
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < count; i++) {
    const element = document.createElement(tagName);

    if (classNames && classNames.length > 0) {
      element.classList.add(...classNames);
    }

    if (dataAttr) {
      element.setAttribute(`data-${dataAttr}`, i);
    }

    fragment.appendChild(element);
  }

  parent.appendChild(fragment);
}

export function initializeBoard() {
  elements.gameContainer.innerHTML = "";

  createElements(elements.gameContainer, "div", ["main-cell"], "main", CELL_COUNT);

  allMainCellElements = document.querySelectorAll(".main-cell");
  allMainCellElements.forEach((mainCell) => {
    createElements(mainCell, "div", ["sub-cell"], "sub", CELL_COUNT);
  });

  allSubCellElements = document.querySelectorAll(".sub-cell");
}

export function renderBoard(state) {
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
}

function updateActiveCell(state) {
  allMainCellElements.forEach((cell) => cell.classList.remove("active-main-cell"));

  if (state.status !== "playing") return;

  const lockedCells = state.lockedCells || [];
  const activeMainCell = getActiveMainCell(state.activeMainCell, lockedCells);

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

export function updateTurnIndicator(currentTurn, status, mySymbol) {
  if (status === "finished") {
    elements.turnIndicator.textContent = "";
    elements.turnIndicator.classList.remove("my-turn", "opponent-turn");
    return;
  }

  if (currentTurn === mySymbol) {
    elements.turnIndicator.textContent = "Your turn!";
    elements.turnIndicator.classList.add("my-turn");
    elements.turnIndicator.classList.remove("opponent-turn");
  } else {
    elements.turnIndicator.textContent = "Opponent's turn";
    elements.turnIndicator.classList.remove("my-turn");
    elements.turnIndicator.classList.add("opponent-turn");
  }
}

export function updatePlayAgainUI(state, mySymbol) {
  if (!elements.playAgainBtn || !elements.playAgainStatus) return;

  const votes = state.playAgainVotes || { X: false, O: false };
  const iVoted = votes[mySymbol];
  const opponentVoted = votes[mySymbol === "X" ? "O" : "X"];

  if (state.status === "finished") {
    elements.playAgainBtn.classList.remove("hidden");

    if (iVoted && !opponentVoted) {
      elements.playAgainBtn.disabled = true;
      elements.playAgainBtn.textContent = "Waiting...";
      elements.playAgainStatus.textContent = "Waiting for opponent";
    } else if (!iVoted && opponentVoted) {
      elements.playAgainBtn.disabled = false;
      elements.playAgainBtn.textContent = "Play Again";
      elements.playAgainStatus.textContent = "Opponent wants rematch!";
    } else if (!iVoted && !opponentVoted) {
      elements.playAgainBtn.disabled = false;
      elements.playAgainBtn.textContent = "Play Again";
      elements.playAgainStatus.textContent = "";
    }
  } else {
    elements.playAgainBtn.classList.add("hidden");
    elements.playAgainStatus.textContent = "";
  }
}

export function isWaitingRoomVisible() {
  return !elements.waitingRoom.classList.contains("hidden");
}

export function getRoomCodeInput() {
  return elements.roomCodeInput.value.trim();
}

export function setRoomCodeInput(value) {
  elements.roomCodeInput.value = value;
}

export function showCopySuccess() {
  elements.copyCodeBtn.textContent = "✓";
  setTimeout(() => {
    elements.copyCodeBtn.textContent = "📋";
  }, 1500);
}

export function getDisplayedRoomCode() {
  return elements.displayRoomCode.textContent;
}
