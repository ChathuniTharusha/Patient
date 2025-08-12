import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsBoxArrowRight } from "react-icons/bs";
import { AuthContext } from "../../context/AuthContext";
import Layout from "../../components/Layout";
import "../../css/Logout.css";

const Logout = () => {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const baseUrl = "https://13.60.49.202:8000";

  const handleConfirmLogout = async () => {
    setIsLoading(true);
    setError("");

    try {
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${baseUrl}/auth/logout`, {
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

      console.log("Logout API successful, clearing localStorage and navigating");
      logout(); // Clears localStorage and navigates to /user/login
    } catch (err) {
      console.error("Logout error:", err);
      setError(err.message || "Logout failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="logout-container">
        <div className="logout-box">
          <BsBoxArrowRight className="logout-icon" />
          <h2>Are you sure you want to log out? 👋</h2>
          <p>You will need to log in again to access your dashboard.</p>

          {error && <p className="error-message">{error}</p>}

          <div className="logout-buttons">
            <button
              className="confirm-logout"
              onClick={handleConfirmLogout}
              disabled={isLoading}
            >
              {isLoading ? "Logging out..." : "Confirm Logout"}
            </button>
            <button
              className="cancel-logout"
              onClick={() => navigate("/user/dashboard")}
              disabled={isLoading}
            >
              Stay Logged In
            </button>
          </div>

          <p className="logout-help">
            Need help? <a href="/help">Visit our support page</a>.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Logout;