import {
  initializeApp,
  getApp,
  getApps,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDin71f0GEpU7FO2VO5pZ9niYQlXQwkLj0",
  authDomain: "ai-plus-defce.firebaseapp.com",
  projectId: "ai-plus-defce",
  storageBucket: "ai-plus-defce.firebasestorage.app",
  messagingSenderId: "487321331111",
  appId: "1:487321331111:web:28f39eced2604c02110282",
};

// Inicialização segura e única
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

