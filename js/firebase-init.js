import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAgqVBOE9uGP4_dgaz558rx6nZ6WLmh_gM", // REEMPLAZA CON TU API KEY
  authDomain: "exo-game-dzm.firebaseapp.com",
  projectId: "exo-game-dzm",
  storageBucket: "exo-game-dzm.firebasestorage.app",
  messagingSenderId: "253861953149",
  appId: "1:253861953149:web:0b218b1bfbcb1ea410bb14"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);