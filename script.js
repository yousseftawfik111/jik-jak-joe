import { appendMultipleCreatedElements } from "./utils.js";

const gameContainer = document.querySelector(".game-container");
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

let lockedCells = [];

// Create the game board
appendMultipleCreatedElements(
  gameContainer,
  "div",
  ["main-cell"],
  "main",
  CELL_COUNT,
);

const allMainCellElements = document.querySelectorAll(".main-cell");
allMainCellElements.forEach((mainCell) => {
  appendMultipleCreatedElements(
    mainCell,
    "div",
    ["sub-cell"],
    "sub",
    CELL_COUNT,
  );
});

const allSubCellElements = document.querySelectorAll(".sub-cell");

// onclick write X/O
let firstPlayerTurn = true; // true -> X, false -> O
const firstPlayer = "X";
const secondPlayer = "O";

function playMove(event) {
  let currentCellMark = event.target.textContent;

  // if cell already marked, skip
  if (currentCellMark) {
    return;
  }

  // set the mark
  let newCellContent = "";
  if (firstPlayerTurn) {
    newCellContent = firstPlayer;
  } else {
    newCellContent = secondPlayer;
  }
  event.target.textContent = newCellContent;

  // remove all listeners
  allSubCellElements.forEach((subCell) => {
    subCell.removeEventListener("click", playMove);
  });

  // Get coordinates
  const currentMainCellID = parseInt(event.target.parentElement.dataset.main);
  const currentSubCellID = parseInt(event.target.dataset.sub);

  // check if all cells are marked, then lock the main cell
  const allSubCellsAreMarked = Array.from(
    event.target.parentElement.children,
  ).every((child) => child.textContent);

  if (allSubCellsAreMarked) {
    lockedCells.push(currentMainCellID);
  }

  // Check win pattern
  const subCellsInCurrentMainCell = document.querySelectorAll(
    `[data-main="${currentMainCellID}"] > *`,
  );

  const allFilledSubCells = Array.from(subCellsInCurrentMainCell).filter(
    (subCell) => {
      return subCell.textContent;
    },
  );

  let currentPlayerFilledSubCells;
  if (firstPlayerTurn) {
    currentPlayerFilledSubCells = allFilledSubCells
      .filter((subCell) => {
        return subCell.textContent === "X";
      })
      .map((el) => {
        return parseInt(el.dataset.sub);
      }); // return [0, 1, 2]
  } else {
    currentPlayerFilledSubCells = allFilledSubCells
      .filter((subCell) => {
        return subCell.textContent === "O";
      })
      .map((el) => {
        return parseInt(el.dataset.sub);
      }); // return [0, 1, 2]
  }

  // check currentPlayerFilledSubCells against the winning patterns
  // check if winning patterns are the same as the current player filled cells
  for (let i = 0; i < winningPatterns.length; i++) {
    const currentWinningPattern = winningPatterns[i];
    const mainCellWin = currentWinningPattern.every((value) =>
      currentPlayerFilledSubCells.includes(value),
    );

    if (mainCellWin) {
      lockedCells.push(currentMainCellID);

      const lockedMainCell = document.querySelector(
        `[data-main="${currentMainCellID}"]`,
      );

      lockedMainCell.setAttribute(
        "data-player-won",
        firstPlayerTurn ? "X" : "O",
      );

      // check if game won
      const allWonMainCells = Array.from(allMainCellElements).filter(
        (mainCell) => mainCell.dataset.playerWon,
      );
      let currentPlayerWonCells;
      if (firstPlayerTurn) {
        currentPlayerWonCells = allWonMainCells
          .filter((mainCell) => {
            return mainCell.dataset.playerWon === "X";
          })
          .map((el) => {
            return parseInt(el.dataset.main);
          }); // return [0, 1, 2]
      } else {
        currentPlayerWonCells = allWonMainCells
          .filter((mainCell) => {
            return mainCell.dataset.playerWon === "O";
          })
          .map((el) => {
            return parseInt(el.dataset.main);
          }); // return [0, 1, 2]
      }

      for (let j = 0; j < winningPatterns.length; j++) {
        const currentWinningPattern = winningPatterns[j];
        const gameWin = currentWinningPattern.every((value) =>
          currentPlayerWonCells.includes(value),
        );

        if (gameWin) {
          alert(`${firstPlayerTurn ? "X" : "O"} WON!`);
        }
      }
    }
  }

  // remove border from current and add to next active main cell
  event.target.parentElement.classList.remove("active-main-cell");
  const nextMainCellIsLocked = lockedCells.includes(currentSubCellID);

  if (!nextMainCellIsLocked) {
    document
      .querySelector(`[data-main="${currentSubCellID}"]`)
      .classList.add("active-main-cell");

    // add new listeners
    const nextSubCells = document.querySelectorAll(
      `[data-main="${currentSubCellID}"] > *`,
    );

    nextSubCells.forEach((subCell) => {
      subCell.addEventListener("click", playMove);
    });
  } else {
    Array.from(allSubCellElements)
      .filter(
        (availableCell) =>
          !lockedCells.includes(
            parseInt(availableCell.parentElement.dataset.main),
          ),
      )
      .forEach((subCell) => {
        subCell.addEventListener("click", playMove);
      });
  }

  // Update next player's turn
  firstPlayerTurn = !firstPlayerTurn;
}

// Start game
allSubCellElements.forEach((subCell) => {
  subCell.addEventListener("click", playMove);
});

/*
cell structure
0,1,2
3,4,5
6,7,8

patterns to win a sub cell
0,1,2
0,3,6
0,4,8
1,4,7
2,4,6
2,5,8
3,4,5
6,7,8

process:
after each play move, check if a win pattern is achieved
if a pattern is achieved, lock main cell, check pattern in main cells
if no pattern achieved in sub/main cells , continue the game

*/
