import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";
import { firebaseConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let currentUid = null;
let authReady = false;

const authReadyPromise = new Promise((resolve) => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUid = user.uid;
      authReady = true;
      resolve(user);
    }
  });
});

export async function initAuth() {
  if (authReady && currentUid) {
    return currentUid;
  }

  await signInAnonymously(auth);
  await authReadyPromise;
  return currentUid;
}

export function getUid() {
  return currentUid;
}

export function getDb() {
  return db;
}
