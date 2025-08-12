import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faLock,
  faEye,
  faEyeSlash,
  faMobile,
  faBuilding,
  faEnvelope,
  faHeartbeat,
  faExclamationTriangle, // Added
  faCheckCircle, // Added
  faSpinner, // Added
} from "@fortawesome/free-solid-svg-icons";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../../css/SignUp.css";
import { useAuth } from "../../context/AuthContext";

const API_BASE = "https://13.60.49.202:8000";

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
          {type === "spo2" ? "%" : type === "temp" ? "°C" : type === "bp" ? "" : " bpm"}
        </text>
      </svg>
      <span className="gauge-label">
        {type === "heart" ? "HR" : type === "spo2" ? "SpO₂" : type === "temp" ? "Temp" : "BP"}
      </span>
    </div>
  );
};

const SignUp = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deviceToken, setDeviceToken] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [dataSurge, setDataSurge] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const ecgCanvasRef = useRef(null);
  const cardRef = useRef(null);

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
        const y = canvas.height / 2 + Math.sin((x / 50 + time) % (2 * Math.PI)) * 50;
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
          const y = canvas.height / 2 + Math.sin((x / 50 + time) % (2 * Math.PI)) * 50;
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

  const validateFields = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!@#$%^&*]{8,}$/;

    if (!username.trim()) errors.username = "Username is required.";
    else if (!/^[a-zA-Z0-9]+$/.test(username.trim())) errors.username = "Username must be alphanumeric.";

    if (!email.trim()) errors.email = "Email is required.";
    else if (!emailRegex.test(email.trim())) errors.email = "Invalid email format.";

    if (!password.trim()) errors.password = "Password is required.";
    else if (!passwordRegex.test(password)) errors.password = "Password must be at least 8 characters with uppercase, lowercase, number, and optional special characters (!@#$%^&*).";

    if (!confirmPassword.trim()) errors.confirmPassword = "Confirm Password is required.";
    else if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match.";

    if (!deviceToken.trim()) errors.deviceToken = "Device Token is required.";
    if (!organizationName.trim()) errors.organizationName = "Organization Name is required.";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

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

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setDataSurge(true);
    setTimeout(() => setDataSurge(false), 1000);

    if (!validateFields()) {
      setError("Please fix the errors below.");
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
      showToast("error", "⚠️ Please fix the errors before submitting.");
      setIsLoading(false);
      return;
    }

    const signupData = {
      username: username.trim(),
      email: email.trim(),
      password,
      device_token: deviceToken.trim(),
      organization_name: organizationName.trim(),
    };

    try {
      const response = await axios.post(`${API_BASE}/auth/signup/patient-request`, signupData, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      login(response.data.access_token, "Patient", username.trim(), organizationName.trim());

      showToast("success", "✅ Signup request submitted! Redirecting...");
      setTimeout(() => navigate("/user/dashboard"), 3000);
    } catch (err) {
      console.error("Signup Error:", err.response?.data || err);
      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        const fieldErrors = {};
        const messages = detail.map((item) => {
          const field = item.loc?.[1] || item.loc?.[0] || "unknown";
          fieldErrors[field] = item.msg;
          return item.msg;
        }).join(" | ");
        setFieldErrors((prev) => ({ ...prev, ...fieldErrors }));
        setError(messages);
        showToast("error", `❌ ${messages}`);
      } else if (typeof detail === "string") {
        setError(detail);
        showToast("error", `❌ ${detail}`);
      } else {
        setError("Signup request failed. Please try again.");
        showToast("error", "❌ Signup request failed. Please try again.");
      }
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async (credentialResponse) => {
    setIsLoading(true);
    setError("");
    setDataSurge(true);
    setTimeout(() => setDataSurge(false), 1000);

    if (!credentialResponse.credential) {
      setError("Google Sign-Up failed: No credential received.");
      showToast("error", "❌ Google Sign-Up failed: No credential received.");
      setIsLoading(false);
      return;
    }

    if (!deviceToken.trim() || !organizationName.trim()) {
      setFieldErrors({
        deviceToken: !deviceToken.trim() ? "Device Token is required." : "",
        organizationName: !organizationName.trim() ? "Organization Name is required." : "",
      });
      setError("Please provide Device Token and Organization Name.");
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
      showToast("error", "⚠️ Please provide Device Token and Organization Name.");
      setIsLoading(false);
      return;
    }

    const signupData = {
      token: credentialResponse.credential,
      device_token: deviceToken.trim(),
      organization_name: organizationName.trim(),
    };

    try {
      const signupRes = await axios.post(`${API_BASE}/auth/google-signup/patient-request`, signupData, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      const signinRes = await axios.post(
        `${API_BASE}/auth/google-signin`,
        {
          token: credentialResponse.credential,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      login(signinRes.data.access_token, "Patient", signupRes.data.username, organizationName.trim());

      showToast("success", "✅ Signup request submitted! Redirecting...");
      setTimeout(() => navigate("/user/dashboard"), 3000);
    } catch (error) {
      console.error("Google signup error:", error.response?.data || error);
      const detail = error.response?.data?.detail;

      if (Array.isArray(detail)) {
        const fieldErrors = {};
        const messages = detail.map((item) => {
          const field = item.loc?.[1] || item.loc?.[0] || "unknown";
          fieldErrors[field] = item.msg;
          return item.msg;
        }).join(" | ");
        setFieldErrors((prev) => ({ ...prev, ...fieldErrors }));
        setError(messages);
        showToast("error", `❌ ${messages}`);
      } else if (typeof detail === "string") {
        setError(detail);
        showToast("error", `❌ ${detail}`);
      } else {
        setError("Google Sign-Up failed. Please try again.");
        showToast("error", "❌ Google Sign-Up failed. Please try again.");
      }
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mhmb-container">
      <canvas ref={ecgCanvasRef} className="ecg-canvas"></canvas>
      <div className="health-orbs">
        <VitalGauge type="heart" value={72} max={200} color="#00B0FF" />
        <VitalGauge type="spo2" value={98} max={100} color="#00E5FF" />
        <VitalGauge type="temp" value={36.6} max={40} color="#FF5252" />
        <VitalGauge type="bp" value={120} max={200} color="#FFFFFF" />
      </div>
      <div 
        ref={cardRef}
        className={`login-card ${isAnimating ? 'shake-animation' : ''} ${dataSurge ? 'data-surge' : ''}`}
      >
        <div className="mhmb-section">
          <div className="mhmb-icon-container">
            <FontAwesomeIcon icon={faHeartbeat} className="mhmb-icon" />
          </div>
          <h1 className="mhmb-title">Patient Signup</h1>
          <p className="mhmb-description">Create your account</p>
        </div>

        {error && (
          <div className="error-text" role="alert" aria-live="assertive">
            <FontAwesomeIcon icon={faExclamationTriangle} className="error-icon" />
            {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleSignup}>
          <div className="input-wrapper">
            <FontAwesomeIcon icon={faUser} className="input-icon-left" />
            <input
              type="text"
              placeholder="Username"
              className={`input-field ${fieldErrors.username ? "error" : ""}`}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setFieldErrors((prev) => ({ ...prev, username: "" }));
              }}
              disabled={isLoading}
              required
              aria-invalid={!!fieldErrors.username}
              aria-describedby={fieldErrors.username ? "username-error" : undefined}
            />
            {fieldErrors.username && (
              <div id="username-error" className="field-error">
                {fieldErrors.username}
              </div>
            )}
          </div>

          {/* Email */}
          <div className="input-wrapper">
            <FontAwesomeIcon icon={faEnvelope} className="input-icon-left" />
            <input
              type="email"
              placeholder="Email"
              className={`input-field ${fieldErrors.email ? "input-error" : ""}`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldErrors((prev) => ({ ...prev, email: "" }));
              }}
              disabled={isLoading}
            />
            {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
          </div>

          {/* Device Token */}
          <div className="input-wrapper">
            <FontAwesomeIcon icon={faMobile} className="input-icon-left" />
            <input
              type="text"
              placeholder="Device Token"
              className={`input-field ${fieldErrors.deviceToken ? "input-error" : ""}`}
              value={deviceToken}
              onChange={(e) => {
                setDeviceToken(e.target.value);
                setFieldErrors((prev) => ({ ...prev, deviceToken: "" }));
              }}
              disabled={isLoading}
            />
            {fieldErrors.deviceToken && <span className="field-error">{fieldErrors.deviceToken}</span>}
          </div>

          {/* Organization Name */}
          <div className="input-wrapper">
            <FontAwesomeIcon icon={faBuilding} className="input-icon-left" />
            <input
              type="text"
              placeholder="Organization Name"
              className={`input-field ${fieldErrors.organizationName ? "input-error" : ""}`}
              value={organizationName}
              onChange={(e) => {
                setOrganizationName(e.target.value);
                setFieldErrors((prev) => ({ ...prev, organizationName: "" }));
              }}
              disabled={isLoading}
            />
            {fieldErrors.organizationName && (
              <span className="field-error">{fieldErrors.organizationName}</span>
            )}
          </div>

          {/* Password */}
          <div className="input-wrapper password-wrapper">
            <FontAwesomeIcon icon={faLock} className="input-icon-left" />
            <input
              type={isPasswordVisible ? "text" : "password"}
              placeholder="Password"
              className={`input-field ${fieldErrors.password ? "input-error" : ""}`}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, password: "" }));
              }}
              disabled={isLoading}
            />
            <FontAwesomeIcon
              icon={isPasswordVisible ? faEye : faEyeSlash}
              className="visibility-icon"
              onClick={() => setIsPasswordVisible(!isPasswordVisible)}
              role="button"
              tabIndex="0"
              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            />
            {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
          </div>

          <div className="input-wrapper password-wrapper">
            <FontAwesomeIcon icon={faLock} className="input-icon-left" />
            <input
              type={isConfirmPasswordVisible ? "text" : "password"}
              placeholder="Confirm Password"
              className={`input-field ${fieldErrors.confirmPassword ? "error" : ""}`}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
              }}
              disabled={isLoading}
              required
              aria-invalid={!!fieldErrors.confirmPassword}
              aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
            />
            <button
              type="button"
              className="visibility-toggle"
              onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
              disabled={isLoading}
              aria-label={isConfirmPasswordVisible ? "Hide confirm password" : "Show confirm password"}
            >
              <FontAwesomeIcon
                icon={isConfirmPasswordVisible ? faEye : faEyeSlash}
                className="visibility-icon"
              />
            </button>
            {fieldErrors.confirmPassword && (
              <div id="confirmPassword-error" className="field-error">
                {fieldErrors.confirmPassword}
              </div>
            )}
          </div>

          <button
            type="submit"
            className={`action-btn ${isLoading ? "loading" : ""}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="loading-icon" spin />
                Submitting...
              </>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        <div className="divider">
          <span className="or-text">OR</span>
        </div>

        <div className="google-login">
          <GoogleLogin
            onSuccess={handleGoogleSignUp}
            onError={() => {
              setError("Google Sign-Up failed. Please try again.");
              showToast("error", "❌ Google Sign-Up failed. Please try again.");
              setIsLoading(false);
            }}
            size="large"
            text="signup_with"
            shape="rectangular"
            logo_alignment="center"
            width="100%"
            disabled={isLoading}
          />
        </div>

        <p className="signup-link">
          Already have an account?{" "}
          <button
            type="button"
            className="link-text"
            onClick={() => {
              console.log("Navigating to login");
              navigate("/user/login");
            }}
          >
            Log in
          </button>
        </p>
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

export default SignUp;