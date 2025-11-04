// Importa las funciones que necesitas desde los SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAgqVBOE9uGP4_dgaz558rx6nZ6WLmh_gM",
  authDomain: "exo-game-dzm.firebaseapp.com",
  projectId: "exo-game-dzm",
  storageBucket: "exo-game-dzm.firebasestorage.app",
  messagingSenderId: "253861953149",
  appId: "1:253861953149:web:0b218b1bfbcb1ea410bb14",
  measurementId: "G-X06164YEE5"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Exporta los servicios que usaremos en otros archivos
export const auth = getAuth(app);
export const db = getFirestore(app);