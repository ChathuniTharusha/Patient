import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faLock,
  faEye,
  faEyeSlash,
  faHeartbeat,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../../context/AuthContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../../css/Login.css";

const VitalGauge = ({ type, value, max, color }) => {
  const percentage = (value / max) * 100;
  return (
    <div className={`vital-gauge ${type}-gauge`}>
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" className="gauge-bg" />
        <circle
          cx="50"
          cy="50"
          r="45"
          className="gauge-fill"
          style={{
            strokeDasharray: `${(percentage * 283) / 100} 283`,
            stroke: color,
          }}
        />
        <text x="50" y="55" textAnchor="middle" className="gauge-text">
          {value}
          {type === "spo2"
            ? "%"
            : type === "temp"
            ? "°C"
            : type === "bp"
            ? ""
            : " bpm"}
        </text>
      </svg>
      <span className="gauge-label">
        {type === "heart"
          ? "HR"
          : type === "spo2"
          ? "SpO₂"
          : type === "temp"
          ? "Temp"
          : "BP"}
      </span>
    </div>
  );
};

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [lockoutRemaining, setLockoutRemaining] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [dataSurge, setDataSurge] = useState(false);

  const particleCanvasRef = useRef(null);
  const ecgCanvasRef = useRef(null);
  const formRef = useRef(null);
  const cardRef = useRef(null);

  const baseUrl = "https://13.60.49.202:8000";
  const MAX_ATTEMPTS = 3;
  const LOCKOUT_DURATION = 5 * 60 * 1000;

  // Debug isLoading state changes
  useEffect(() => {
    console.log("isLoading changed:", isLoading);
  }, [isLoading]);

  useEffect(() => {
    const canvas = particleCanvasRef.current;
    const ctx = canvas.getContext("2d");

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      requestAnimationFrame(animate);
    };

    animate();

    return () => window.removeEventListener("resize", resizeCanvas);
  }, [dataSurge]);

  useEffect(() => {
    const canvas = ecgCanvasRef.current;
    const ctx = canvas.getContext("2d");
    let time = 0;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const drawECG = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#00B0FF";
      ctx.lineWidth = 2;
      ctx.globalAlpha = dataSurge ? 1.0 : 0.6;

      ctx.beginPath();
      let lastX = 0;
      for (let x = 0; x < canvas.width; x += 2) {
        const y =
          canvas.height / 2 +
          Math.sin((x / 50 + time) % (2 * Math.PI)) * 50;
        if (x % 100 === 0) {
          ctx.lineTo(x, y - 100);
          ctx.lineTo(x + 10, y);
          ctx.font = "16px Arial";
          ctx.fillStyle = "#00B0FF";
          ctx.globalAlpha = dataSurge ? 1.0 : 0.4;
          ctx.fillText("❤️", x, y - 120);
          ctx.globalAlpha = dataSurge ? 1.0 : 0.6;
        } else {
          ctx.lineTo(x, y);
        }
        lastX = x;
      }
      ctx.stroke();

      if (dataSurge) {
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = "#00B0FF";
        ctx.lineWidth = 4;
        for (let x = 0; x < canvas.width; x += 100) {
          const y =
            canvas.height / 2 +
            Math.sin((x / 50 + time) % (2 * Math.PI)) * 50;
          ctx.beginPath();
          ctx.arc(x, y - 100, 20 + (time % 1) * 20, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 0.6;
      }

      time += 0.05;
      requestAnimationFrame(drawECG);
    };

    drawECG();

    return () => window.removeEventListener("resize", resizeCanvas);
  }, [dataSurge]);

  const getLoginAttempts = (username) => {
    try {
      const stored = localStorage.getItem(`login_attempts_${username}`);
      return stored ? JSON.parse(stored) : { attempts: 0, lockoutTime: null };
    } catch (error) {
      console.warn("Error reading login attempts from localStorage:", error);
      return { attempts: 0, lockoutTime: null };
    }
  };

  const saveLoginAttempts = (username, attempts, lockoutTime = null) => {
    try {
      localStorage.setItem(
        `login_attempts_${username}`,
        JSON.stringify({ attempts, lockoutTime })
      );
    } catch (error) {
      console.warn("Error saving login attempts to localStorage:", error);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const validateField = (fieldName, value) => {
    const errors = { ...fieldErrors };

    switch (fieldName) {
      case "username":
        if (!value.trim()) {
          errors.username = "Username is required";
        } else if (value.length < 3) {
          errors.username = "Username must be at least 3 characters";
        } else {
          delete errors.username;
        }
        break;
      case "password":
        if (!value) {
          errors.password = "Password is required";
        } else if (value.length < 6) {
          errors.password = "Password must be at least 6 characters";
        } else {
          delete errors.password;
        }
        break;
      default:
        break;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    if (!username.trim()) return;

    const { lockoutTime } = getLoginAttempts(username);
    if (lockoutTime && new Date(lockoutTime) > new Date()) {
      const interval = setInterval(() => {
        const remaining = Math.max(
          0,
          Math.floor((new Date(lockoutTime) - new Date()) / 1000)
        );
        setLockoutRemaining(remaining);

        if (remaining === 0) {
          clearInterval(interval);
          saveLoginAttempts(username, 0);
          setLockoutRemaining(null);
          toast.success("Account unlocked! You can try logging in again.", {
            position: "top-right",
            autoClose: 3000,
            theme: "dark",
            icon: <FontAwesomeIcon icon={faCheckCircle} />,
          });
        }
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setLockoutRemaining(null);
    }
  }, [username]);

  const showToast = (type, message, options = {}) => {
    const defaultOptions = {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: "dark",
      ...options,
    };

    const icons = {
      error: <FontAwesomeIcon icon={faExclamationTriangle} />,
      success: <FontAwesomeIcon icon={faCheckCircle} />,
      info: <FontAwesomeIcon icon={faHeartbeat} />,
    };

    toast[type](message, {
      ...defaultOptions,
      icon: icons[type],
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log("Form submission prevented, handleLogin triggered");
    setDataSurge(true);
    setTimeout(() => setDataSurge(false), 1000);

    if (!username.trim() || !password.trim()) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
      const errorMsg = "Please enter both username and password.";
      setError(errorMsg);
      showToast("error", errorMsg);
      return;
    }

    const isUsernameValid = validateField("username", username);
    const isPasswordValid = validateField("password", password);

    if (!isUsernameValid || !isPasswordValid) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
      return;
    }

    setIsLoading(true);
    setError("");
    setFieldErrors({});

    const { attempts, lockoutTime } = getLoginAttempts(username);
    if (lockoutTime && new Date(lockoutTime) > new Date()) {
      const remaining = Math.floor((new Date(lockoutTime) - new Date()) / 1000);
      const errorMsg = `Account locked. Try again in ${formatTime(remaining)}.`;
      setError(errorMsg);
      showToast("error", errorMsg);
      setIsLoading(false);
      return;
    }

    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      console.log("Sending login request to:", `${baseUrl}/auth/login`);
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      console.log("Login API response status:", response.status);
      const data = await response.json();
      console.log("Login API response data:", data);
      console.log("Role received:", data.role);

      if (!response.ok) {
        let errorMsg = "Login failed";
        if (typeof data.detail === "string") {
          errorMsg = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorMsg = data.detail.map((e) => e.msg || e.message || e).join(", ");
        } else if (data.detail && typeof data.detail === "object") {
          errorMsg = Object.values(data.detail).join(", ") || "Login failed";
        } else if (data.message) {
          errorMsg = data.message;
        }

        const newAttempts = attempts + 1;

        if (newAttempts >= MAX_ATTEMPTS) {
          const lockoutTime = new Date(
            Date.now() + LOCKOUT_DURATION
          ).toISOString();
          saveLoginAttempts(username, newAttempts, lockoutTime);
          const lockoutMsg =
            "Too many failed attempts. Account locked for 5 minutes.";
          setError(lockoutMsg);
          showToast("error", lockoutMsg, { autoClose: 5000 });
          setLockoutRemaining(300);
        } else {
          saveLoginAttempts(username, newAttempts);
          const attemptsLeft = MAX_ATTEMPTS - newAttempts;
          const warningMsg = `${errorMsg}. ${attemptsLeft} attempt${attemptsLeft !== 1 ? "s" : ""} remaining.`;
          setError(errorMsg);
          showToast("error", warningMsg);
        }

        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 500);
        throw new Error(errorMsg);
      }

      console.log("Calling login with:", {
        access_token: data.access_token,
        role: data.role,
        username: data.username,
        device_token: data.device_token,
      });

      saveLoginAttempts(username, 0);
      showToast("success", "Login successful! Redirecting...");

      try {
        await login(
          data.access_token,
          data.role,
          data.username,
          null,
          null,
          null,
          data.device_token
        );
        console.log("Login function completed");
      } catch (loginError) {
        console.error("AuthContext login error:", loginError);
        const errorMsg = "Failed to process login. Please try again.";
        setError(errorMsg);
        showToast("error", errorMsg);
        throw loginError;
      }
    } catch (err) {
      console.error("Login error:", err);
      if (!err.message.includes("Too many")) {
        const errorMsg = err.message || "Login failed. Please try again.";
        setError(errorMsg);
        if (!err.message.includes("attempt")) {
          showToast("error", errorMsg);
        }
      }
    } finally {
      console.log("Finally block reached, setting isLoading to false");
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    setDataSurge(true);
    setTimeout(() => setDataSurge(false), 1000);
    setIsLoading(true);
    setError("");
    setFieldErrors({});

    if (!credentialResponse.credential) {
      const errorMsg = "Google login failed: No credential received.";
      setError(errorMsg);
      showToast("error", errorMsg);
      setIsLoading(false);
      return;
    }

    try {
      console.log("Sending Google login request to:", `${baseUrl}/auth/google-signin`);
      const response = await fetch(`${baseUrl}/auth/google-signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      console.log("Google login API response status:", response.status);
      const data = await response.json();
      console.log("Google login API response data:", data);

      if (!response.ok) {
        const errorMsg = data?.detail || data?.message || "Google login failed";
        throw new Error(errorMsg);
      }

      showToast("success", "Google login successful! Redirecting...");
      const googleUsername = data.username || `google_user_${Date.now()}`;
      const googleRole = data.role || "patient";

      try {
        await login(
          data.access_token,
          googleRole,
          googleUsername,
          null,
          data.access_token,
          null,
          data.device_token || null
        );
        console.log("Google login function completed");
      } catch (loginError) {
        console.error("AuthContext login error:", loginError);
        const errorMsg = "Failed to process Google login. Please try again.";
        setError(errorMsg);
        showToast("error", errorMsg);
        throw loginError;
      }
    } catch (err) {
      console.error("Google login error:", err);
      const errorMsg = `Google login failed: ${err.message}`;
      setError(errorMsg);
      showToast("error", errorMsg);
    } finally {
      console.log("Google login finally block reached, setting isLoading to false");
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    const errorMsg = "Google login failed. Please try again.";
    setError(errorMsg);
    showToast("error", errorMsg);
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setUsername(value);
    if (value.trim()) {
      validateField("username", value);
    } else {
      setFieldErrors((prev) => ({ ...prev, username: undefined }));
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (value) {
      validateField("password", value);
    } else {
      setFieldErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const handleForgotPassword = () => {
    console.log("Forgot password navigation triggered");
    try {
      navigate("/user/forgot-password");
      console.log("Navigated to /user/forgot-password");
    } catch (err) {
      console.error("Navigation error:", err);
    }
  };

  const handleSignupNavigation = () => {
    console.log("Signup navigation triggered");
    try {
      navigate("/user/signup", { replace: true });
      console.log("Navigated to /user/signup");
    } catch (err) {
      console.error("Navigation error:", err);
    }
  };

  const isFormDisabled = isLoading || lockoutRemaining !== null;
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  return (
    <div className="mhmb-container">
      <canvas ref={particleCanvasRef} className="biowave-canvas"></canvas>
      <canvas ref={ecgCanvasRef} className="ecg-canvas"></canvas>
      <div
        ref={cardRef}
        className={`login-card ${isAnimating ? "shake-animation" : ""} ${dataSurge ? "data-surge" : ""}`}
      >
        <div className="mhmb-section">
          <div className="mhmb-icon-container">
            <FontAwesomeIcon icon={faHeartbeat} className="mhmb-icon" />
          </div>
          <h1 className="mhmb-title">MHMB</h1>
          <p className="mhmb-description">Login to your vitality.</p>
          <div className="mhmb-features">
            <div className="feature-item">
              <FontAwesomeIcon icon={faHeartbeat} className="feature-icon" />
              <span>Real-time Health Monitoring</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-text" role="alert" aria-live="assertive">
            <FontAwesomeIcon icon={faExclamationTriangle} className="error-icon" />
            {error}
          </div>
        )}

        {lockoutRemaining !== null && (
          <div className="lockout-warning" role="alert" aria-live="assertive">
            <FontAwesomeIcon icon={faLock} className="lockout-icon" />
            Account locked. Try again in {formatTime(lockoutRemaining)}
          </div>
        )}

        <form className="login-form" ref={formRef} onSubmit={handleLogin}>
          <div className="input-wrapper">
            <FontAwesomeIcon icon={faUser} className="input-icon-left" />
            <input
              type="text"
              placeholder="Username"
              className={`input-field ${fieldErrors.username ? "error" : ""}`}
              value={username}
              onChange={handleUsernameChange}
              disabled={isFormDisabled}
              required
              aria-invalid={!!fieldErrors.username}
              aria-describedby={fieldErrors.username ? "username-error" : undefined}
              autoComplete="username"
            />
            {fieldErrors.username && (
              <div id="username-error" className="field-error">
                {fieldErrors.username}
              </div>
            )}
          </div>

          <div className="input-wrapper password-wrapper">
            <FontAwesomeIcon icon={faLock} className="input-icon-left" />
            <input
              type={isPasswordVisible ? "text" : "password"}
              placeholder="Password"
              className={`input-field ${fieldErrors.password ? "error" : ""}`}
              value={password}
              onChange={handlePasswordChange}
              disabled={isFormDisabled}
              required
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? "password-error" : undefined}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="visibility-toggle"
              onClick={togglePasswordVisibility}
              disabled={isFormDisabled}
              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            >
              <FontAwesomeIcon
                icon={isPasswordVisible ? faEye : faEyeSlash}
                className="visibility-icon"
              />
            </button>
            {fieldErrors.password && (
              <div id="password-error" className="field-error">
                {fieldErrors.password}
              </div>
            )}
          </div>

          <button
            type="submit"
            className={`action-btn ${isLoading ? "loading" : ""}`}
            disabled={isFormDisabled || hasFieldErrors}
          >
            {isLoading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="loading-icon" spin />
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </button>
        </form>

        <div className="divider">
          <span className="or-text">OR</span>
        </div>

        <div className="google-login">
          <GoogleLogin
            onSuccess={handleGoogleLogin}
            onError={handleGoogleError}
            size="large"
            text="signin_with"
            shape="rectangular"
            logo_alignment="center"
            width="100%"
            disabled={isFormDisabled}
          />
        </div>

        <div className="login-footer">
          <button
            type="button"
            className="link-text"
            onClick={handleForgotPassword}
          >
            Forgot Password?
          </button>
          <button
            type="button"
            className="link-text"
            onClick={handleSignupNavigation}
          >
            New Patient?- Sign up
          </button>
        </div>
      </div>

      <div className="health-orbs">
        <VitalGauge type="heart" value={72} max={200} color="#00B0FF" />
        <VitalGauge type="spo2" value={98} max={100} color="#00E5FF" />
        <VitalGauge type="temp" value={36.6} max={40} color="#FF5252" />
        <VitalGauge type="bp" value={120} max={200} color="#FFFFFF" />
      </div>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        limit={3}
      />
    </div>
  );
};

export default Login;