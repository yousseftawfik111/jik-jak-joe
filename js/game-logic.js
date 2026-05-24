import { WINNING_PATTERNS } from "./config.js";

export function checkWinPattern(cells, symbol) {
  const playerCells = cells
    .filter((cell) => cell.value === symbol)
    .map((cell) => cell.index);

  for (const pattern of WINNING_PATTERNS) {
    if (pattern.every((idx) => playerCells.includes(idx))) {
      return true;
    }
  }
  return false;
}

export function getActiveMainCell(rawActiveCell, lockedCells) {
  if (rawActiveCell === null || rawActiveCell === undefined) {
    return null;
  }

  const parsed = parseInt(rawActiveCell, 10);

  if (isNaN(parsed) || lockedCells.includes(parsed)) {
    return null;
  }

  return parsed;
}

export function calculateMoveResult(board, mainIndex, subIndex, symbol, lockedCells) {
  const updatedBoard = board.map((row) => [...row]);
  updatedBoard[mainIndex][subIndex] = symbol;

  const mainCellData = updatedBoard[mainIndex].map((val, idx) => ({
    value: val,
    index: idx,
  }));

  const willWinMainCell = checkWinPattern(mainCellData, symbol);
  const willFillMainCell = updatedBoard[mainIndex].every((cell) => cell !== "");
  const willLockMainCell = willWinMainCell || willFillMainCell;

  let nextActiveMainCell = subIndex;
  const targetWillBeLocked =
    lockedCells.includes(subIndex) || (subIndex === mainIndex && willLockMainCell);

  if (targetWillBeLocked) {
    nextActiveMainCell = null;
  }

  return {
    updatedBoard,
    willWinMainCell,
    willFillMainCell,
    willLockMainCell,
    nextActiveMainCell,
  };
}

export function checkGameWin(mainCellWinners, symbol) {
  const mainCellWinData = mainCellWinners.map((val, idx) => ({
    value: val,
    index: idx,
  }));

  return checkWinPattern(mainCellWinData, symbol);
}

export function isValidMove(gameState, mainIndex, subIndex, activeMainCell) {
  if (gameState.status !== "playing") {
    return false;
  }

  if (gameState.board[mainIndex][subIndex]) {
    return false;
  }

  const lockedCells = gameState.lockedCells || [];
  if (lockedCells.includes(mainIndex)) {
    return false;
  }

  const canPlayAnywhere = activeMainCell === null;
  if (!canPlayAnywhere && mainIndex !== activeMainCell) {
    return false;
  }

  return true;
}
