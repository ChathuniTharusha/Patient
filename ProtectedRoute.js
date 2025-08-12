import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const PrivateRoute = () => {
  // Set demoMode to false to enforce authentication
  const demoMode = false;

  const token = localStorage.getItem("authToken");
  const userType = localStorage.getItem("userType");

  console.log("PrivateRoute check:", {
    demoMode,
    token: !!token, // Log presence of token
    userType,
    isAuthenticated: !!(token && userType === "Patient"),
  });

  if (demoMode) {
    console.log("PrivateRoute: Demo mode enabled, bypassing auth");
    return <Outlet />;
  }

  return token && userType === "Patient" ? <Outlet /> : <Navigate to="/user/login" />;
};

export default PrivateRoute;