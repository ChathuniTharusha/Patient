import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BsBellFill, BsPersonFill } from "react-icons/bs";
import { AuthContext } from "../context/AuthContext";
import "../css/Header.css";

function Header() {
  const navigate = useNavigate();
  const { user, login } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  const WS_BASE_URL = "wss://13.60.49.202:8000";
  const API_BASE_URL = "https://13.60.49.202:8000";
  const RECONNECT_INTERVAL = 10000;
  const MAX_RECONNECT_ATTEMPTS = 5;
  const HEARTBEAT_INTERVAL = 15000;

  const refreshToken = async () => {
    if (!user?.googleRefreshToken) {
      console.error("No refresh token available.");
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: user.googleRefreshToken }),
      });

      if (!response.ok) {
        console.error("Token refresh failed:", response.status);
        return null;
      }

      const data = await response.json();
      const { authToken, googleAccessToken } = data;
      login(authToken, user.userType, user.username, googleAccessToken, user.googleRefreshToken);
      return authToken;
    } catch (err) {
      console.error("Error refreshing token:", err);
      return null;
    }
  };

  const connectWebSocket = (token) => {
    if (!token) {
      console.error("No valid token available for notifications.");
      return null;
    }

    const ws = new WebSocket(`${WS_BASE_URL}/ws/notifications?token=${token}`);

    ws.onopen = () => {
      console.log("WebSocket connection established for header notifications");
      ws.send(JSON.stringify({ type: "subscribe", channel: "notifications", user_id: user?.username }));
      const heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
          console.log("Sent heartbeat ping for header notifications");
        }
      }, HEARTBEAT_INTERVAL);
      ws.onclose = () => {
        clearInterval(heartbeat);
        console.log("Heartbeat stopped for header notifications");
      };
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "notification") {
          const cleanMessage = data.message ? data.message.replace(/: string$/, "").trim() : "No message content";
          const notification = {
            id: data.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            title: data.notification_type === "appointment_accepted"
              ? "Appointment Accepted"
              : data.notification_type === "appointment_rejected"
              ? "Appointment Rejected"
              : data.notification_type || "Notification",
            message: cleanMessage,
            type: data.notification_type || "info",
            timestamp: data.timestamp || new Date().toISOString(),
            doctor: data.message && typeof data.message === "string" ? (data.message.match(/Dr\. \w+/)?.[0] || "Unknown") : "Unknown",
            unread: true,
          };
          setNotifications((prev) => {
            if (prev.some((notif) => notif.id === notification.id)) {
              return prev;
            }
            return [...prev, notification];
          });
        } else if (data.error) {
          console.error("Server error for header notifications:", data.error);
          ws.close();
        }
      } catch (err) {
        console.error("Error parsing WebSocket message for header notifications:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error for header notifications:", err);
    };

    ws.onclose = (event) => {
      console.log(`WebSocket closed for header notifications with code: ${event.code}, reason: ${event.reason}`);
    };

    return ws;
  };

  useEffect(() => {
    let ws = null;
    let reconnectAttempts = 0;
    let reconnectTimeout = null;

    const attemptReconnect = async () => {
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        let token = user?.authToken;
        if (!token) {
          token = await refreshToken();
        }
        ws = connectWebSocket(token);
        if (ws) {
          ws.onclose = async (event) => {
            console.log(`WebSocket closed for header notifications with code: ${event.code}, reason: ${event.reason}`);
            reconnectTimeout = setTimeout(attemptReconnect, RECONNECT_INTERVAL);
          };
        } else {
          reconnectTimeout = setTimeout(attemptReconnect, RECONNECT_INTERVAL);
        }
      }
    };

    const initWebSocket = async () => {
      let token = user?.authToken;
      if (!token) {
        token = await refreshToken();
      }
      ws = connectWebSocket(token);
    };

    if (user) {
      initWebSocket();
    }

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [user, login]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (notificationId) => {
    if (!user?.authToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/mark-read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.authToken}`,
        },
        body: JSON.stringify({ notification_id: notificationId }),
      });

      if (!response.ok) {
        console.error("Failed to mark as read:", response.status);
        return;
      }

      setNotifications(
        notifications.map((notif) =>
          notif.id === notificationId ? { ...notif, unread: false } : notif
        )
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    setShowNotifications(false);
    navigate("/user/notifications");
  };

  const unreadCount = notifications.filter((notif) => notif.unread).length;

  return (
    <header className="header-shadow bg-white p-4 flex justify-between items-center">
      <div className="flex items-center">
        <h1 className="text-2xl font-bold text-gray-800">Patient Portal</h1>
      </div>
      <div className="flex items-center space-x-4">
        <div className="relative" ref={notificationRef}>
          <div className="relative cursor-pointer" onClick={() => setShowNotifications(!showNotifications)}>
            <BsBellFill className="text-gray-600 text-2xl" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white shadow-lg rounded-lg z-50 max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-gray-500 text-center">No notifications</div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 border-b cursor-pointer hover:bg-gray-100 ${
                      notif.unread ? "bg-blue-50" : ""
                    } ${
                      notif.type === "appointment_accepted"
                        ? "border-l-4 border-green-500"
                        : notif.type === "appointment_rejected"
                        ? "border-l-4 border-red-500"
                        : "border-l-4 border-blue-500"
                    }`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <h3 className="text-sm font-semibold">{notif.title}</h3>
                    <p className="text-xs text-gray-600">{notif.message}</p>
                    <span className="text-xs text-gray-500">
                      {notif.doctor} • {new Date(notif.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <BsPersonFill
          className="text-gray-600 text-2xl cursor-pointer"
          onClick={() => navigate("/user/profile-settings")}
        />
      </div>
    </header>
  );
}

export default Header;