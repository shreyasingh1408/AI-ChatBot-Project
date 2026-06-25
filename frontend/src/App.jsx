import { useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import Auth from "./Auth";
import "./App.css";

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [activeTab, setActiveTab] = useState("chat");
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [savedMessages, setSavedMessages] = useState(() => {
    const s = localStorage.getItem("savedMessages");
    return s ? JSON.parse(s) : [];
  });
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [settings, setSettings] = useState(() => {
    const s = localStorage.getItem("chatSettings");
    return s ? JSON.parse(s) : { soundEnabled: false, autoScroll: true, showTimestamps: true };
  });

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleLogin = (userData) => setUser(userData);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
  };

  const toggleSetting = (key) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    localStorage.setItem("chatSettings", JSON.stringify(next));
  };

  const saveMessage = (msg) => {
    const alreadySaved = savedMessages.find((s) => s.id === msg.id);
    if (alreadySaved) return;
    const updated = [...savedMessages, { ...msg, savedAt: formatTime(new Date()) }];
    setSavedMessages(updated);
    localStorage.setItem("savedMessages", JSON.stringify(updated));
  };

  const unsaveMessage = (id) => {
    const updated = savedMessages.filter((s) => s.id !== id);
    setSavedMessages(updated);
    localStorage.setItem("savedMessages", JSON.stringify(updated));
  };

  useEffect(() => {
    if (settings.autoScroll) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e) => { setInput(e.results[0][0].transcript); setIsListening(false); };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
  }, []);

  useEffect(() => {
    const s = io("https://ai-chatbot-project-6eu7.onrender.com");
    setSocket(s);
    s.on("ai-message-response", (response) => {
      const botMsg = { id: Date.now() + 1, sender: "bot", text: response.response, time: formatTime(new Date()) };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    });
    return () => s.disconnect();
  }, []);

  if (!user) return <Auth onLogin={handleLogin} />;

  const toggleListening = () => {
    if (!recognitionRef.current) { alert("Use Chrome for voice input."); return; }
    if (isListening) { recognitionRef.current.stop(); setIsListening(false); }
    else { setInput(""); recognitionRef.current.start(); setIsListening(true); }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { alert("Image size should be less than 5MB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 800; let w = img.width, h = img.height;
        if (w > h && w > MAX) { h = (h * MAX) / w; w = MAX; }
        else if (h > MAX) { w = (w * MAX) / h; h = MAX; }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const full = canvas.toDataURL("image/jpeg", 0.7);
        setImagePreview(full);
        setImageData({ base64: full.split(",")[1], mimeType: "image/jpeg" });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null); setImageData(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed && !imageData) return;
    if (imageData) {
      const userMsg = { id: Date.now(), sender: "user", text: trimmed || "Analyze this image", image: imagePreview, time: formatTime(new Date()) };
      setMessages((prev) => [...prev, userMsg]);
      socket.emit("ai-image-message", { base64Image: imageData.base64, mimeType: imageData.mimeType, userText: trimmed || "What is in this image?" });
      setInput(""); removeImage(); setIsTyping(true); return;
    }
    const userMsg = { id: Date.now(), sender: "user", text: trimmed, time: formatTime(new Date()) };
    setMessages((prev) => [...prev, userMsg]);
    socket.emit("ai-message", trimmed);
    setInput(""); setIsTyping(true);
  };

  const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const handleInput = (e) => {
    setInput(e.target.value);
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px"; }
  };

  return (
    <div className={`app ${theme}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">◈</div>
            <span className="logo-text">AI Chatbot</span>
          </div>
          <div className="logo-sub">Powered by Gemini</div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-label">Menu</div>
          <button className={`nav-item ${activeTab === "chat" ? "active" : ""}`} onClick={() => setActiveTab("chat")}>
            <div className="nav-icon">💬</div> Chat
          </button>
          <button className={`nav-item ${activeTab === "saved" ? "active" : ""}`} onClick={() => setActiveTab("saved")}>
            <div className="nav-icon">🔖</div> Saved
            {savedMessages.length > 0 && <span style={{ marginLeft: "auto", fontSize: 11, background: "var(--accent-glow)", color: "var(--accent-light)", borderRadius: 6, padding: "1px 7px" }}>{savedMessages.length}</span>}
          </button>
          <button className={`nav-item ${activeTab === "settings" ? "active" : ""}`} onClick={() => setActiveTab("settings")}>
            <div className="nav-icon">⚙️</div> Settings
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-pill">
            <div className="user-avatar">{user.username.charAt(0).toUpperCase()}</div>
            <div className="user-info">
              <span className="user-name">{user.username}</span>
              <span className="user-status">● Online</span>
            </div>
          </div>
          <button className="theme-toggle" onClick={toggleTheme}>
            <span>{theme === "dark" ? "🌙 Dark mode" : "☀️ Light mode"}</span>
            <div className="toggle-pill"><div className="toggle-dot"></div></div>
          </button>
          <button className="logout-btn" onClick={handleLogout}>↩ Logout</button>
        </div>
      </aside>

      <main className="chat-area">
        <header className="chat-header">
          <div className="chat-header-left">
            <div className="bot-avatar-header">✦</div>
            <div>
              <div className="bot-name">AI Assistant</div>
              <div className="bot-status"><span className="status-dot"></span> Active now</div>
            </div>
          </div>
          <div className="chat-header-actions">
            <button className="icon-btn">🔍</button>
            <button className="icon-btn">⋯</button>
          </div>
        </header>

        {/* ── SAVED TAB ── */}
        {activeTab === "saved" && (
          <div className="page-view">
            <div>
              <div className="page-title">🔖 Saved Messages</div>
              <div className="page-sub">{savedMessages.length} messages saved</div>
            </div>
            {savedMessages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔖</div>
                <div className="empty-text">No saved messages yet</div>
                <div className="empty-text" style={{ fontSize: 12 }}>Hover over any AI response and click Save</div>
              </div>
            ) : (
              savedMessages.map((msg) => (
                <div key={msg.id} className="saved-card">
                  <div className="saved-card-text">{msg.text}</div>
                  <div className="saved-card-footer">
                    <span className="saved-card-time">Saved at {msg.savedAt}</span>
                    <button className="unsave-btn" onClick={() => unsaveMessage(msg.id)}>✕ Remove</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === "settings" && (
          <div className="page-view">
            <div>
              <div className="page-title">⚙️ Settings</div>
              <div className="page-sub">Customize your chat experience</div>
            </div>

            <div className="settings-section">
              <div className="settings-label">Appearance</div>
              <div className="settings-card">
                <div className="settings-row">
                  <div className="settings-row-left">
                    <div className="settings-row-title">Dark Mode</div>
                    <div className="settings-row-sub">Toggle between dark and light theme</div>
                  </div>
                  <div className={`settings-toggle ${theme === "dark" ? "on" : ""}`} onClick={toggleTheme}>
                    <div className="settings-toggle-dot"></div>
                  </div>
                </div>
                <div className="settings-row">
                  <div className="settings-row-left">
                    <div className="settings-row-title">Show Timestamps</div>
                    <div className="settings-row-sub">Show time on each message</div>
                  </div>
                  <div className={`settings-toggle ${settings.showTimestamps ? "on" : ""}`} onClick={() => toggleSetting("showTimestamps")}>
                    <div className="settings-toggle-dot"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-label">Chat</div>
              <div className="settings-card">
                <div className="settings-row">
                  <div className="settings-row-left">
                    <div className="settings-row-title">Auto Scroll</div>
                    <div className="settings-row-sub">Automatically scroll to new messages</div>
                  </div>
                  <div className={`settings-toggle ${settings.autoScroll ? "on" : ""}`} onClick={() => toggleSetting("autoScroll")}>
                    <div className="settings-toggle-dot"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-label">Account</div>
              <div className="settings-card">
                <div className="settings-row">
                  <div className="settings-row-left">
                    <div className="settings-row-title">Username</div>
                    <div className="settings-row-sub">{user.username}</div>
                  </div>
                </div>
                <div className="settings-row">
                  <div className="settings-row-left">
                    <div className="settings-row-title">Email</div>
                    <div className="settings-row-sub">{user.email}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CHAT TAB ── */}
        {activeTab === "chat" && (
          <>
            <section className="messages-container">
              <div className="date-divider"><span>Today</span></div>
              {messages.map((msg, idx) => {
                const isUser = msg.sender === "user";
                const showAvatar = idx === 0 || messages[idx - 1]?.sender !== msg.sender;
                const isSaved = savedMessages.some((s) => s.id === msg.id);
                return (
                  <div key={msg.id} className={`message-row ${isUser ? "user-row" : "bot-row"}`}>
                    {!isUser && <div className={`avatar bot-avatar ${showAvatar ? "visible" : "hidden"}`}>✦</div>}
                    <div className="bubble-group">
                      {msg.image ? (
                        <div className={`bubble ${isUser ? "user-bubble" : "bot-bubble"} image-bubble`}>
                          <img src={msg.image} alt="uploaded" className="chat-image" />
                          {msg.text && msg.text !== "Analyze this image" && <p className="image-caption">{msg.text}</p>}
                        </div>
                      ) : (
                        <div className={`bubble ${isUser ? "user-bubble" : "bot-bubble"}`}>{msg.text}</div>
                      )}
                      {settings.showTimestamps && <div className={`msg-time ${isUser ? "time-right" : "time-left"}`}>{msg.time}</div>}
                      {!isUser && (
                        <div className="bubble-actions">
                          <button className={`save-msg-btn ${isSaved ? "saved" : ""}`} onClick={() => saveMessage(msg)}>
                            {isSaved ? "✓ Saved" : "🔖 Save"}
                          </button>
                        </div>
                      )}
                    </div>
                    {isUser && <div className={`avatar user-avatar-msg ${showAvatar ? "visible" : "hidden"}`}>{user.username.charAt(0).toUpperCase()}</div>}
                  </div>
                );
              })}
              {isTyping && (
                <div className="message-row bot-row">
                  <div className="avatar bot-avatar visible">✦</div>
                  <div className="bubble bot-bubble typing-bubble"><span></span><span></span><span></span></div>
                </div>
              )}
              <div ref={bottomRef} />
            </section>

            {imagePreview && (
              <div className="image-preview-bar">
                <div className="image-preview-wrapper">
                  <img src={imagePreview} alt="preview" className="image-preview-thumb" />
                  <button className="remove-image-btn" onClick={removeImage}>✕</button>
                </div>
                <span className="image-preview-label">Image ready to send</span>
              </div>
            )}

            <footer className="input-bar">
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} style={{ display: "none" }} />
              <button className={`attach-btn ${imagePreview ? "attach-active" : ""}`} onClick={() => fileInputRef.current.click()}>📎</button>
              <div className="input-wrapper">
                <textarea
                  ref={textareaRef}
                  className="message-input"
                  placeholder={isListening ? "🎤 Listening..." : imagePreview ? "Add a message with your image..." : "Ask me anything..."}
                  value={input} onChange={handleInput} onKeyDown={handleKeyDown} rows={1}
                />
              </div>
              <button className={`mic-btn ${isListening ? "listening" : ""}`} onClick={toggleListening}>
                {isListening ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <rect x="9" y="2" width="6" height="11" rx="3" />
                    <path d="M5 10a7 7 0 0 0 14 0" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                    <line x1="9" y1="22" x2="15" y2="22" />
                  </svg>
                )}
              </button>
              <button className={`send-btn ${input.trim() || imageData ? "active" : ""}`} onClick={sendMessage} disabled={!input.trim() && !imageData}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
