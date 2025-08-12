// components/LogoutDialog.js
import React, { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { FaSignOutAlt } from "react-icons/fa";
import "../css/LogoutDialog.css"; 

export const LogoutDialog = ({ isOpen, onClose }) => {
  const { logout } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const API_BASE_URL = "https://13.60.49.202:8000";

  const handleConfirmLogout = async () => {
    setIsLoading(true);
    setError("");

    try {
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.detail || "Logout failed");
      }

      console.log("Logout successful");
      logout(); // Clears auth state and localStorage
    } catch (err) {
      console.error("Logout error:", err);
      setError(err.message || "Failed to log out. Please try again.");
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="logout-dialog-overlay" onClick={onClose}>
      <div className="logout-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="logout-icon-wrapper">
          <FaSignOutAlt />
        </div>
        <h3>Log Out?</h3>
        <p>You'll be signed out of your account. You can log back in anytime.</p>

        {error && <p className="error-message">{error}</p>}

        <div className="logout-dialog-actions">
          <button
            className="btn-cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="btn-confirm"
            onClick={handleConfirmLogout}
            disabled={isLoading}
          >
            {isLoading ? "Logging out..." : "Yes, Log Me Out"}
          </button>
        </div>
      </div>
    </div>
  );
};