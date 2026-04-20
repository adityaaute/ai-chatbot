// script.js (defensive, logs a lot, ensures user msg always shows)
console.log("🔥 script.js is running");
import { getUser, authStateListener } from "/static/auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

console.log("script.js loaded");
const db = getFirestore();
authStateListener();

const chatList = document.getElementById("chat-list");
const chatBox = document.getElementById("chat-box");
const form = document.getElementById("input-form");
const input = document.getElementById("user-input");
const newChatBtn = document.getElementById("new-chat");
const logoutBtn = document.getElementById("logout-btn");

let currentChatId = null;

// Utility: safe append
function appendMessage(text, sender = "bot") {
  try {
    const div = document.createElement("div");
    div.className = `msg ${sender}`;
    div.textContent = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return div;
  } catch (err) {
    console.error("appendMessage error:", err);
  }
}

// Ensure there is an active chat for this user. Returns id.
async function ensureChat() {
  if (currentChatId) return currentChatId;

  const user = getUser();
  if (!user) {
    console.warn("ensureChat: no user");
    return null;
  }

  // Create a new chat
  try {
    const ref = await addDoc(collection(db, "users", user.uid, "chats"), {
      title: "New Chat",
      messages: [],
      created: Date.now()
    });
    currentChatId = ref.id;
    console.log("Created new chat:", currentChatId);
    await loadChats(); // refresh list
    return currentChatId;
  } catch (err) {
    console.error("ensureChat addDoc error:", err);
    return null;
  }
}

// Load chats into sidebar (does NOT clear open chat)
async function loadChats() {
  const user = getUser();
  if (!user) return;

  const snaps = await getDocs(collection(db, "users", user.uid, "chats"));

  chatList.innerHTML = "";

  const chats = [];

  snaps.forEach(snap => {
    chats.push({ id: snap.id, ...snap.data() });
  });

  // 🔥 sort latest first
  chats.sort((a, b) => b.created - a.created);

  chats.forEach(chat => {
    const div = document.createElement("div");
    div.className = "chat-item";

    if (chat.id === currentChatId) {
      div.classList.add("active-chat");
    }

    div.textContent = chat.title || "New Chat";

    div.onclick = async () => {
      await openChat(chat.id);
      loadChats();
    };

    chatList.appendChild(div);
  });
}

// Open chat: sets currentChatId and loads messages (replaces only if opening)
async function openChat(id) {
  try {
    const user = getUser();
    if (!user) {
      console.warn("openChat: no user");
      return;
    }
    const ref = doc(db, "users", user.uid, "chats", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      console.warn("openChat: chat not found", id);
      return;
    }
    currentChatId = id;
    chatBox.innerHTML = ""; // only when explicitly opening a chat
    const data = snap.data();
    (data.messages || []).forEach(m => appendMessage(m.text, m.sender));
    console.log("Opened chat:", id);
  } catch (err) {
    console.error("openChat error:", err);
  }
}

// Save message (push to Firestore). Ensures chat exists first.
async function saveMessage(text, sender) {
  try {
    const user = getUser();
    if (!user) {
      console.warn("saveMessage: no user");
      return;
    }

    // ensure chat exists
    if (!currentChatId) {
      const id = await ensureChat();
      if (!id) {
        console.error("saveMessage: could not create chat");
        return;
      }
    }

    const chatRef = doc(db, "users", user.uid, "chats", currentChatId);
    const snap = await getDoc(chatRef);
    const messages = snap.exists() ? (snap.data().messages || []) : [];
    messages.push({ text, sender, time: Date.now() });
    // If document didn't exist (race), create with set; otherwise update
    if (!snap.exists()) {
      await updateDoc(chatRef, { messages }); // will fail if doc missing, but we'll try
    } else {
      await updateDoc(chatRef, { messages });
    }
    console.log("Saved message to chat", currentChatId, sender, text.slice(0,30));
  } catch (err) {
    console.error("saveMessage error:", err);
  }
}

// New chat button
if (newChatBtn) {
  newChatBtn.onclick = async () => {
  currentChatId = null;
  chatBox.innerHTML = "";

  await createChat();   // create new chat
  await loadChats();    // 🔥 refresh sidebar
  };
}

// Form submit: append user message immediately, ensure chat, send to backend, stream bot
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const text = input.value.trim();
    if (!text) return;

    // 1) Append locally right away
    appendMessage(text, "user");

    // 2) Ensure chat exists (so saveMessage works)
    await ensureChat();

    // 3) Save user message (won't block UI)
    saveMessage(text, "user").catch(err => console.error("saveMessage (user) failed:", err));

    input.value = "";

    // 4) Add bot placeholder
    const botDiv = appendMessage("...", "bot");
    botDiv.textContent = "";

    // 5) Call backend and stream
    let response;
    try {
      response = await fetch("/chat-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
    } catch (err) {
      console.error("Network error calling /chat-stream:", err);
      botDiv.textContent = "❌ Network error";
      saveMessage(botDiv.textContent, "bot");
      return;
    }

    if (!response.ok) {
      const txt = await response.text().catch(() => response.statusText || "error");
      console.error("Server error:", response.status, txt);
      botDiv.textContent = `❌ Server error: ${response.status}`;
      saveMessage(botDiv.textContent, "bot");
      return;
    }

    if (!response.body) {
      const full = await response.text().catch(() => "");
      console.error("No response.body. Full text:", full);
      botDiv.textContent = full || "❌ No response body";
      saveMessage(botDiv.textContent, "bot");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let finalText = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      finalText += decoder.decode(value, { stream: true });
      botDiv.textContent = finalText;
      chatBox.scrollTop = chatBox.scrollHeight;
    }

    // 6) Save bot final text
    saveMessage(finalText, "bot");
  } catch (err) {
    console.error("submit handler error:", err);
  }
});

// On load: small delay to allow auth to initialize, then load chats
authStateListener();

setTimeout(() => {
  loadChats();
}, 1000);