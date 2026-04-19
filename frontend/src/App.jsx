import { useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import "./App.css";

const BOT_RESPONSES = [
  "That's interesting! Tell me more.",
  "I see what you mean. Great point!",
  "Absolutely, I couldn't agree more.",
  "Thanks for sharing that with me!",
  "Hmm, let me think about that...",
  "That's a fascinating perspective!",
  "I appreciate you saying that.",
  "Could you elaborate on that?",
];

function getRandomBotReply() {
  return BOT_RESPONSES[Math.floor(Math.random() * BOT_RESPONSES.length)];
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  const [socket,setSocket] = useState(null);

  const [messages, setMessages] = useState([]
    
  );
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: trimmed,
      time: formatTime(new Date()),
    };

    setMessages((prev) => [...prev, userMsg]);
    
    socket.emit("ai-message", trimmed)
    setInput("");
    setIsTyping(true);

    
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  };

  useEffect(() => {
    let socketInstance = io("http://localhost:3000");
    setSocket(socketInstance);

    socketInstance.on('ai-message-response', (response) => {
      const botMsg={
        id: Date.now() + 1,
        sender: "bot",
        text: response.response,
        time: formatTime(new Date()),
      }
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
     
    });

  }, []);

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header
        ">
          <div className="logo">
            <span className="logo-icon">◈</span>
            <span className="logo-text">AI Chatbot</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button className="nav-item active">
            <span className="nav-icon">💬</span>
            <span>Chat</span>
          </button>
          <button className="nav-item">
            <span className="nav-icon">🔖</span>
            <span>Saved</span>
          </button>
          <button className="nav-item">
            <span className="nav-icon">⚙️</span>
            <span>Settings</span>
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="user-pill">
            <div className="user-avatar">U</div>
            <div className="user-info">
              <span className="user-name">You</span>
              <span className="user-status">● Online</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="chat-area">
        {/* Header */}
        <header className="chat-header">
          <div className="chat-header-left">
            <div className="bot-avatar-header">N</div>
            <div>
              <div className="bot-name">AI</div>
              <div className="bot-status">
                <span className="status-dot"></span> Active now
              </div>
            </div>
          </div>
          <div className="chat-header-actions">
            <button className="icon-btn" title="Search">🔍</button>
            <button className="icon-btn" title="More options">⋯</button>
          </div>
        </header>

        {/* Messages */}
        <section className="messages-container">
          <div className="date-divider">
            <span>Today</span>
          </div>

          {messages.map((msg, idx) => {
            const isUser = msg.sender === "user";
            const showAvatar =
              idx === 0 || messages[idx - 1]?.sender !== msg.sender;

            return (
              <div
                key={msg.id}
                className={`message-row ${isUser ? "user-row" : "bot-row"}`}
              >
                {!isUser && (
                  <div className={`avatar bot-avatar ${showAvatar ? "visible" : "hidden"}`}>
                    N
                  </div>
                )}
                <div className="bubble-group">
                  <div className={`bubble ${isUser ? "user-bubble" : "bot-bubble"}`}>
                    {msg.text}
                  </div>
                  <div className={`msg-time ${isUser ? "time-right" : "time-left"}`}>
                    {msg.time}
                  </div>
                </div>
                {isUser && (
                  <div className={`avatar user-avatar-msg ${showAvatar ? "visible" : "hidden"}`}>
                    U
                  </div>
                )}
              </div>
            );
          })}

          {isTyping && (
            <div className="message-row bot-row">
              <div className="avatar bot-avatar visible">N</div>
              <div className="bubble bot-bubble typing-bubble">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </section>

        {/* Input Bar */}
        <footer className="input-bar">
          <button className="attach-btn" title="Attach file">📎</button>
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              className="message-input"
              placeholder="Type a message..."
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              rows={1}
            />
          </div>
          <button
            className={`send-btn ${input.trim() ? "active" : ""}`}
            onClick={sendMessage}
            disabled={!input.trim()}
            title="Send"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </footer>
      </main>
    </div>
  );
}

