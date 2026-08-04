import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAeYi2ykobg43kBlqTTdO6-yathwPSy-H4",
  authDomain: "arribatrack-46da4.firebaseapp.com",
  databaseURL: "https://arribatrack-46da4-default-rtdb.firebaseio.com",
  projectId: "arribatrack-46da4",
  storageBucket: "arribatrack-46da4.firebasestorage.app",
  messagingSenderId: "269383688596",
  appId: "1:269383688596:web:845c0dc9a4ad80ed7eaf81",
  measurementId: "G-DYG3X35B7B"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);