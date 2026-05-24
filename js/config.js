export const CELL_COUNT = 9;

export const WINNING_PATTERNS = [
  [0, 1, 2],
  [0, 3, 6],
  [0, 4, 8],
  [1, 4, 7],
  [2, 4, 6],
  [2, 5, 8],
  [3, 4, 5],
  [6, 7, 8],
];

export const firebaseConfig = {
  databaseURL:
    "https://jik-jak-joe-default-rtdb.europe-west1.firebasedatabase.app/",
  apiKey: "AIzaSyBRCGushweFlBTEJTdvJl6WIbFkyhFvTYs",
  authDomain: "jik-jak-joe.firebaseapp.com",
  projectId: "jik-jak-joe",
  storageBucket: "jik-jak-joe.firebasestorage.app",
  messagingSenderId: "965839360571",
  appId: "1:965839360571:web:e4461e001fb6d1680ec21e",
};
