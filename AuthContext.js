import React, { createContext, useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = () => {
      const authToken = localStorage.getItem("authToken");
      const userType = localStorage.getItem("userType");
      const username = localStorage.getItem("username");
      const deviceToken = localStorage.getItem("device_token");
      const organizationName = localStorage.getItem("organizationName");
      const googleAccessToken = localStorage.getItem("googleAccessToken");
      const googleRefreshToken = localStorage.getItem("googleRefreshToken");

      console.log("Checking localStorage on load:", {
        authToken,
        userType,
        username,
        deviceToken,
        organizationName,
        googleAccessToken,
        googleRefreshToken,
      });

      if (authToken && userType && username) {
        setUser({
          authToken,
          userType,
          username,
          deviceToken: deviceToken || null,
          organizationName: organizationName || null,
          googleAccessToken: googleAccessToken || null,
          googleRefreshToken: googleRefreshToken || null,
        });
      } else {
        console.warn(
          "Missing required auth data in localStorage, redirecting to login"
        );
        localStorage.removeItem("authToken");
        localStorage.removeItem("userType");
        localStorage.removeItem("username");
        localStorage.removeItem("device_token");
        localStorage.removeItem("organizationName");
        localStorage.removeItem("googleAccessToken");
        localStorage.removeItem("googleRefreshToken");
        navigate("/user/login", { replace: true });
      }

      setIsLoading(false);
    };

    initializeAuth();
  }, [navigate]);

  const login = (
    authToken,
    userType,
    username,
    organizationName = null,
    googleAccessToken = null,
    googleRefreshToken = null,
    deviceToken = null
  ) => {
    console.log("Login called with:", {
      authToken,
      userType,
      username,
      organizationName,
      googleAccessToken,
      googleRefreshToken,
      deviceToken,
    });

    if (!authToken || !userType || !username) {
      console.error("Invalid login data:", {
        authToken,
        userType,
        username,
        organizationName,
        deviceToken,
      });
      throw new Error(
        "Missing required login data: authToken, userType, or username"
      );
    }

    const normalizedUserType = userType.toLowerCase() === "patient" ? "Patient" : userType;

    try {
      try {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userType");
        localStorage.removeItem("username");
        localStorage.removeItem("device_token");
        localStorage.removeItem("organizationName");
        localStorage.removeItem("googleAccessToken");
        localStorage.removeItem("googleRefreshToken");

        localStorage.setItem("authToken", authToken);
        localStorage.setItem("userType", normalizedUserType);
        localStorage.setItem("username", username);
        if (organizationName)
          localStorage.setItem("organizationName", organizationName);
        if (googleAccessToken)
          localStorage.setItem("googleAccessToken", googleAccessToken);
        if (googleRefreshToken)
          localStorage.setItem("googleRefreshToken", googleRefreshToken);
        if (deviceToken) localStorage.setItem("device_token", deviceToken);
      } catch (storageError) {
        console.error("Failed to access localStorage:", storageError);
        throw new Error("Failed to store authentication data in localStorage");
      }

      console.log("Stored auth data:", {
        storedAuthToken: localStorage.getItem("authToken"),
        storedUserType: localStorage.getItem("userType"),
        storedUsername: localStorage.getItem("username"),
        storedDeviceToken: localStorage.getItem("device_token"),
        storedOrganizationName: localStorage.getItem("organizationName"),
        storedGoogleAccessToken: localStorage.getItem("googleAccessToken"),
        storedGoogleRefreshToken: localStorage.getItem("googleRefreshToken"),
      });

      if (localStorage.getItem("authToken") !== authToken) {
        console.error("Failed to store authToken in localStorage");
        throw new Error("Failed to store authentication data");
      }

      try {
        setUser({
          authToken,
          userType: normalizedUserType,
          username,
          deviceToken: deviceToken || null,
          organizationName: organizationName || null,
          googleAccessToken: googleAccessToken || null,
          googleRefreshToken: googleRefreshToken || null,
        });
        console.log("User state updated:", {
          authToken,
          userType: normalizedUserType,
          username,
          deviceToken,
          organizationName,
          googleAccessToken,
          googleRefreshToken,
        });
      } catch (stateError) {
        console.error("Failed to update user state:", stateError);
        throw new Error("Failed to update authentication state");
      }

      const redirectPath = normalizedUserType === "Patient" ? "/user/dashboard" : "/doctor/dashboard";
      console.log(`Preparing to navigate to: ${redirectPath}`);

      // Delay navigation to ensure state updates complete
      setTimeout(() => {
        try {
          console.log(`Navigating to: ${redirectPath}`);
          navigate(redirectPath, { replace: true });
        } catch (navError) {
          console.error("Navigation error:", navError);
          throw new Error("Failed to navigate to dashboard");
        }
      }, 0);
    } catch (err) {
      console.error("Login error:", err.message);
      throw err;
    }
  };

  const logout = () => {
    console.log("Logging out, clearing localStorage");
    localStorage.removeItem("authToken");
    localStorage.removeItem("userType");
    localStorage.removeItem("username");
    localStorage.removeItem("device_token");
    localStorage.removeItem("organizationName");
    localStorage.removeItem("googleAccessToken");
    localStorage.removeItem("googleRefreshToken");
    setUser(null);
    navigate("/user/login", { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};