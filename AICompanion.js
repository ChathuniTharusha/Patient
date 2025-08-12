import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { 
  FaUser, 
  FaRobot, 
  FaPaperPlane 
} from "react-icons/fa";
import { 
  RefreshCw, 
  Heart, 
  Thermometer, 
  Droplets, 
  TrendingUp, 
  AlertCircle,
  Activity 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "../../css/Chatbot.css";

const API_BASE = "http://3.7.134.6:8000";
const VITALS_API = "https://13.60.49.202:8000/iot/my-data/latest?limit=10";

// Helper to format multiline bullet points nicely
const formatBulletPoints = (text) => {
  if (!text) return "";
  return text
    .split(/(?:\n+|[-•●▪️]+)+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => `• ${line.charAt(0).toUpperCase() + line.slice(1)}`)
    .join("\n");
};

// Chat Container Component
const ChatContainer = ({ chatMessages, chatInput, setChatInput, handleSendChat, sendingChat, messagesEndRef }) => (
  <div className="chat-container">
    <div className="chat-header">
      <div className="chat-header-icon">
        <FaRobot size={24} />
      </div>
      <h2>AI Health Companion</h2>
    </div>
    
    <div className="chat-messages">
      {chatMessages.map((msg, i) => (
        <div key={i} className={`message ${msg.sender === "user" ? "user-message" : "bot-message"}`}>
          <div className="message-avatar">
            {msg.sender === "user" ? <FaUser size={20} /> : <FaRobot size={20} />}
          </div>
          <div className="message-content">
            <p>{msg.text}</p>
            <span className="message-time">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
    
    <div className="chat-input-container">
      <input
        type="text"
        value={chatInput}
        onChange={(e) => setChatInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
        placeholder="Ask me anything about your health..."
        className="chat-input"
      />
      <button 
        onClick={handleSendChat} 
        disabled={sendingChat || !chatInput.trim()}
        className="send-button"
      >
        <FaPaperPlane size={18} />
      </button>
    </div>
  </div>
);

// Current Vitals Container Component
const CurrentVitalsContainer = ({ vitals, lastUpdated, city, loadingVitals, vitalsError, fetchVitals }) => (
  <div className="vitals-container">
    <div className="vitals-header">
      <div className="vitals-header-icon">
        <TrendingUp size={18} />
      </div>
      <h3>Current Vitals</h3>
      <button onClick={fetchVitals} disabled={loadingVitals} className="refresh-button">
        <RefreshCw size={14} />
      </button>
    </div>
    
    {loadingVitals && <div className="loading">Loading...</div>}
    {vitalsError && <div className="error">Error: {vitalsError}</div>}
    
    {vitals && (
      <div className="vitals-content">
        <div className="vital-item">
          <div className="vital-info">
            <Heart size={16} />
            <span className="vital-label">Heart Rate</span>
          </div>
          <div className="vital-value">
            <span className="vital-number">{vitals.heart_rate} <span className="vital-unit">bpm</span></span>
            <button className={`vital-status-btn ${vitals.heart_rate < 60 ? 'low' : vitals.heart_rate > 100 ? 'high' : 'normal'}`}>
              {vitals.heart_rate < 60 ? "low" : vitals.heart_rate > 100 ? "high" : "normal"}
            </button>
          </div>
        </div>
        
        <div className="vital-item">
          <div className="vital-info">
            <Thermometer size={16} />
            <span className="vital-label">Temperature</span>
          </div>
          <div className="vital-value">
            <span className="vital-number">{vitals.temperature} <span className="vital-unit">°C</span></span>
            <button className={`vital-status-btn ${vitals.temperature < 36 ? 'low' : vitals.temperature > 38 ? 'high' : 'normal'}`}>
              {vitals.temperature < 36 ? "low" : vitals.temperature > 38 ? "high" : "normal"}
            </button>
          </div>
        </div>
        
        <div className="vital-item">
          <div className="vital-info">
            <Droplets size={16} />
            <span className="vital-label">Blood Pressure</span>
          </div>
          <div className="vital-value">
            <span className="vital-number">{vitals.blood_pressure.systolic}/{vitals.blood_pressure.diastolic} <span className="vital-unit">mmHg</span></span>
            <button className={`vital-status-btn ${(vitals.blood_pressure.systolic > 140 || vitals.blood_pressure.diastolic > 90) ? 'high' : 'normal'}`}>
              {(vitals.blood_pressure.systolic > 140 || vitals.blood_pressure.diastolic > 90) ? "high" : "normal"}
            </button>
          </div>
        </div>
        
        <div className="vital-item">
          <div className="vital-info">
            <Activity size={16} />
            <span className="vital-label">Oxygen Level</span>
          </div>
          <div className="vital-value">
            <span className="vital-number">{vitals.spo2} <span className="vital-unit">%</span></span>
            <button className={`vital-status-btn ${vitals.spo2 < 95 ? 'low' : 'normal'}`}>
              {vitals.spo2 < 95 ? "low" : "normal"}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);

// Quick Actions Container Component
const QuickActionsContainer = ({ onActionClick }) => {
  const actions = [
    { id: 'heart-tips', label: 'Heart Health Tips', icon: Heart },
    { id: 'blood-pressure', label: 'Blood Pressure Info', icon: Droplets },
    { id: 'activity', label: 'Activity Suggestions', icon: Activity },
    { id: 'doctor', label: 'When to See Doctor', icon: AlertCircle }
  ];

  return (
    <div className="quick-actions-container">
      <h3>Quick Actions</h3>
      <div className="actions-grid">
        {actions.map(action => {
          const IconComponent = action.icon;
          return (
            <button 
              key={action.id}
              className="action-button"
              onClick={() => onActionClick(action.id)}
            >
              <IconComponent size={14} />
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Main AI Companion Component
const AICompanion = () => {
  const { user } = useAuth();
  const [city] = useState("Jaffna");

  const [vitals, setVitals] = useState(null);
  const [loadingVitals, setLoadingVitals] = useState(false);
  const [vitalsError, setVitalsError] = useState(null);
  const [vitalsLastUpdated, setVitalsLastUpdated] = useState(null);

  const [chatMessages, setChatMessages] = useState([
    {
      sender: "bot",
      text: `Hello ${user?.username || 'John Doe'}! I'm your AI health companion. I'm here to help you with health questions and provide daily wellness tips. How are you feeling today?`,
      timestamp: Date.now(),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  const messagesEndRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Fetch latest vitals from API
  const fetchVitals = async () => {
    if (!user?.authToken) {
      setVitalsError("Missing authentication token");
      return;
    }
    setLoadingVitals(true);
    setVitalsError(null);
    try {
      const res = await fetch(VITALS_API, {
        headers: {
          Authorization: `Bearer ${user.authToken}`,
          Accept: "application/json",
        },
      });
      if (!res.ok) throw new Error(`Vitals fetch failed: ${res.statusText}`);
      const data = await res.json();
      const latest = data?.data?.[0];
      if (latest) {
        setVitals(latest);
        setVitalsLastUpdated(new Date(latest.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }));
      } else {
        throw new Error("No vitals data available.");
      }
    } catch (error) {
      setVitalsError(error.message);
      setVitals(null);
    } finally {
      setLoadingVitals(false);
    }
  };

  // Initial vitals fetch and polling every 30 seconds
  useEffect(() => {
    fetchVitals();
    const interval = setInterval(fetchVitals, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Send user chat input to backend and get bot response
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    setSendingChat(true);
    setChatMessages((prev) => [
      ...prev,
      { sender: "user", text: chatInput.trim(), timestamp: Date.now() },
    ]);
    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: chatInput.trim() }),
      });
      const json = await res.json();
      setChatMessages((prev) => [
        ...prev,
        { sender: "bot", text: json.answer || "Sorry, I didn't get that.", timestamp: Date.now() },
      ]);
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        { sender: "bot", text: `Error: ${error.message}`, timestamp: Date.now() },
      ]);
    } finally {
      setChatInput("");
      setSendingChat(false);
    }
  };

  // Handle quick action clicks
  const handleActionClick = async (actionId) => {
    const actionMessages = {
      'heart-tips': 'Can you give me some heart health tips?',
      'blood-pressure': 'Tell me about blood pressure and what my readings mean.',
      'activity': 'What physical activities do you recommend for me?',
      'doctor': 'When should I see a doctor about my health?'
    };

    const message = actionMessages[actionId];
    if (message) {
      setChatInput(message);
      // Auto-send the message
      setTimeout(() => handleSendChat(), 100);
    }
  };

  return (
    <Layout title="AI Companion">
      <div className="aicompanion-main">
        <div className="left-panel">
          <ChatContainer 
            chatMessages={chatMessages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            handleSendChat={handleSendChat}
            sendingChat={sendingChat}
            messagesEndRef={messagesEndRef}
          />
        </div>
        
        <div className="right-panel">
          <CurrentVitalsContainer 
            vitals={vitals}
            lastUpdated={vitalsLastUpdated}
            city={city}
            loadingVitals={loadingVitals}
            vitalsError={vitalsError}
            fetchVitals={fetchVitals}
          />
          
          <QuickActionsContainer onActionClick={handleActionClick} />
        </div>
      </div>
    </Layout>
  );
};

export default AICompanion;