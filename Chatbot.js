import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import "../css/Chatbot.css";

const Chatbot = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello! I'm your health assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null); // Ref for scrolling to the bottom
  const API_BASE = "https://mhmb.onrender.com";

  // Prevent page scrolling by setting body overflow to hidden
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto"; // Restore on unmount
    };
  }, []);

  // Scroll to the bottom of the messages container when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    setIsSending(true);
    const userMessage = { sender: "user", text: input };
    setMessages([...messages, userMessage]);

    try {
      const response = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: input }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: Could not fetch response`);
      }

      const data = await response.json();
      const botResponse = { sender: "bot", text: data.answer || "Sorry, I couldn't process your request." };
      setMessages((prev) => [...prev, botResponse]);
    } catch (err) {
      console.error("Error fetching chatbot response:", err);
      const errorResponse = { sender: "bot", text: "Could not connect to the chatbot. Please try again." };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsSending(false);
    }

    setInput("");
  };

  if (!isLoading && !user) {
    navigate("/user/login");
    return null;
  }

  return (
    <Layout title="Chatbot">
      <div className="chatbot-container">
        <div className="chatbot-messages">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`chatbot-message ${msg.sender === "user" ? "user-message" : "bot-message"}`}
            >
              <p>{msg.text}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="chatbot-input-container">
          <input
            type="text"
            className="chatbot-input"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            disabled={isSending}
          />
          <button
            className="chatbot-send-button"
            onClick={handleSendMessage}
            disabled={isSending}
          >
            {isSending ? "Sending..." : <i className="fas fa-paper-plane"></i>}
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default Chatbot;