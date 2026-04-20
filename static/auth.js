// -----------------------------------------
//  FIREBASE CONFIG (REQUIRED)
// -----------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Your Firebase config   ( <-- YOUR REAL CONFIG IS ALREADY CORRECT )
const firebaseConfig = {
  apiKey: "AIzaSyBVe_GpmyFk9MEhtNolmxNS4rKUOnxKpJU",
  authDomain: "chatgpt-clone-bunty.firebaseapp.com",
  projectId: "chatgpt-clone-bunty",
  storageBucket: "chatgpt-clone-bunty.firebasestorage.app",
  messagingSenderId: "876233706138",
  appId: "1:876233706138:web:5f0020fa3cbbb00350ad23"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();

// -----------------------------------------
//  EMAIL LOGIN
// -----------------------------------------
export function emailLogin(email, password) {
  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      window.location.href = "/"; // redirect to chat
    })
    .catch(err => alert(err.message));
}

// -----------------------------------------
//  EMAIL SIGNUP
// -----------------------------------------
export function emailSignup(email, password) {
  createUserWithEmailAndPassword(auth, email, password)
    .then(() => {
      window.location.href = "/"; // redirect to chat
    })
    .catch(err => alert(err.message));
}

// -----------------------------------------
//  GOOGLE LOGIN
// -----------------------------------------
export function googleLogin() {
  signInWithPopup(auth, provider)
    .then(() => {
      window.location.href = "/";
    })
    .catch(err => alert(err.message));
}

// -----------------------------------------
//  LOGOUT (works from index.html)
// -----------------------------------------
export function logoutUser() {
  signOut(auth).then(() => {
    window.location.href = "/login";
  });
}

// -----------------------------------------
//  CHECK LOGIN STATE
// -----------------------------------------
export function authStateListener() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      // User NOT logged in
      if (window.location.pathname !== "/login" &&
          window.location.pathname !== "/signup") {
        window.location.href = "/login";
      }
      return;
    }

    // User IS logged in → Update UI
    const nameBox = document.getElementById("user-name");
    const picBox = document.getElementById("user-pic");

    if (nameBox) {
      nameBox.innerText = user.email.split("@")[0]; // simple username
    }

    if (picBox) {
      picBox.src = user.photoURL || "/static/user.png";
    }
  });
}
// ✅ ADD THIS
export function getUser() {
  return auth.currentUser;
}
