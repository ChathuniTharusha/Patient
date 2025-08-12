// components/Sidebar.js
import React, { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faTimes,
  faHome,
  faBell,
  faComment,
  faFileMedical,
  faUserMd,
  faBuilding,
  faCalendarCheck,
  faCloudSun,
  faCog,
  faSignOutAlt,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import "../css/Sidebar.css";

const API_BASE_URL = "https://13.60.49.202:8000";

const Sidebar = () => {
  const [menuOpen, setMenuOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved ? JSON.parse(saved) : window.innerWidth > 768;
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [profileImage, setProfileImage] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false); // ✅ Dialog state
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  // Responsive handling
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        const savedState = localStorage.getItem("sidebarOpen");
        setMenuOpen(savedState !== null ? JSON.parse(savedState) : true);
      } else {
        setMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Save sidebar state
  useEffect(() => {
    localStorage.setItem("sidebarOpen", JSON.stringify(menuOpen));
  }, [menuOpen]);

  // Fetch profile image with retry
  const fetchProfileImage = async (retryCount = 0, maxRetries = 2) => {
    if (!user?.authToken) {
      setProfileImage(null);
      setFetchError("No authentication token");
      return;
    }

    setFetchError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/patient/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${user.authToken}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Sidebar fetch error:", { status: response.status, errorText, retryCount });

        if (response.status === 401 && retryCount < maxRetries) {
          setTimeout(() => fetchProfileImage(retryCount + 1, maxRetries), 1000);
          return;
        }

        if (response.status === 401) {
          logout();
          navigate("/user/login");
          setFetchError("Session expired. Please log in again.");
        }
        throw new Error(errorText || "Failed to load profile");
      }

      const data = await response.json();
      const imageUrl = data.profile_image ? `${data.profile_image}?t=${Date.now()}` : null;
      setProfileImage(imageUrl);
    } catch (error) {
      console.error("Profile fetch error:", error.message);
      setFetchError(error.message || "Could not load profile image");
      if (!profileImage) setProfileImage(null);
    }
  };

  useEffect(() => {
    if (user?.authToken) {
      fetchProfileImage();
    }
  }, [user, logout, navigate]);

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = (event) => {
      const newImageUrl = event.detail?.profileImage;
      if (newImageUrl !== undefined) {
        setProfileImage(newImageUrl);
      } else {
        setTimeout(() => fetchProfileImage(), 1000);
      }
    };
    window.addEventListener("profileUpdated", handleProfileUpdate);
    return () => window.removeEventListener("profileUpdated", handleProfileUpdate);
  }, []);

  // Handle logout with API call
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const authToken = localStorage.getItem("authToken");
      if (!authToken) throw new Error("No auth token");

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

      logout(); // Clears context and localStorage
    } catch (err) {
      console.error("Logout error:", err);
      // Still log out locally even if API fails
      logout();
    }
  };

  // Navigation handler
  const handleItemClick = (path) => {
    if (path === "/user/logout") {
      setShowLogoutDialog(true); // ✅ Open dialog
    } else {
      navigate(path);
      if (isMobile) {
        setMenuOpen(false);
      }
    }
  };

  // Close dialog
  const closeDialog = () => {
    if (!isLoggingOut) {
      setShowLogoutDialog(false);
    }
  };

  const sidebarItems = [
    { path: "/user/dashboard", icon: faHome, text: "Dashboard" },
    { path: "/user/notifications", icon: faBell, text: "Notifications" },
    { path: "/user/chatwindow", icon: faComment, text: "Chat with Doctor" },
    { path: "/user/clinical-records", icon: faFileMedical, text: "Clinical Records" },
    { path: "/user/clinical-units", icon: faBuilding, text: "Clinical Units" },
    { path: "/user/appointments", icon: faCalendarCheck, text: "Appointments" },
    { path: "/user/weather", icon: faCloudSun, text: "Weather" },
    { path: "/user/logout", icon: faSignOutAlt, text: "Logout" },
  ];

  return (
    <>
      {/* Mobile Menu Toggle */}
      {isMobile && (
        <div className="menu-toggle mobile-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          <FontAwesomeIcon icon={faBars} className="sidebar-icon toggle-icon" />
        </div>
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${menuOpen ? "open" : "closed"}`}>
        {/* Desktop Toggle */}
        {!isMobile && (
          <div className="menu-toggle desktop-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            <FontAwesomeIcon icon={menuOpen ? faTimes : faBars} className="sidebar-icon toggle-icon" />
          </div>
        )}

        {/* Profile Section */}
        {menuOpen && (
          <div className="profile-section">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="profile-pic"
                onError={() => setProfileImage(null)} // ✅ Fixed: No innerHTML
              />
            ) : (
              <div className="profile-pic placeholder">
                <FontAwesomeIcon icon={faUser} />
                <span>No Image</span>
              </div>
            )}
            <h3 className="profile-name">{user?.username || "Patient"}</h3>
            {fetchError && <p className="error-text">{fetchError}</p>}
          </div>
        )}

        {/* Navigation */}
        <nav className="sidebar-nav">
          <ul>
            {sidebarItems.map((item) => (
              <li
                key={item.path}
                className={`sidebar-item ${location.pathname === item.path ? "active" : ""}`}
                onClick={() => handleItemClick(item.path)}
                title={item.text}
              >
                <FontAwesomeIcon icon={item.icon} className="sidebar-icon" />
                <span className="sidebar-text">{item.text}</span>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Logout Confirmation Dialog */}
      {showLogoutDialog && (
        <div className="logout-dialog-overlay" onClick={closeDialog}>
          <div className="logout-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="logout-icon-wrapper">
              <FontAwesomeIcon icon={faSignOutAlt} />
            </div>
            <h3>Log Out?</h3>
            <p>You'll be signed out of your account. You can log back in anytime.</p>

            <div className="logout-dialog-actions">
              <button
                className="btn-cancel"
                onClick={closeDialog}
                disabled={isLoggingOut}
              >
                Cancel
              </button>
              <button
                className="btn-confirm"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Signing out..." : "Yes, Log Me Out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {isMobile && menuOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMenuOpen(false)}
        ></div>
      )}
    </>
  );
};

export default Sidebar;