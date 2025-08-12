import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faLock, faEye, faEyeSlash, faHeartbeat, faSpinner, faCheckCircle, faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../css/ForgotPassword.css";

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

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("patient");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showVerifyCode, setShowVerifyCode] = useState(false);
  const [dataSurge, setDataSurge] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const ecgCanvasRef = useRef(null);
  const cardRef = useRef(null);

  const baseUrl = "https://13.60.49.202:8000";

  // ECG Wave (Only with Peaks)
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

      // Primary ECG Wave with Peaks
      ctx.beginPath();
      let lastX = 0;
      for (let x = 0; x < canvas.width; x += 2) {
        const y = canvas.height / 2 + Math.sin((x / 50 + time) % (2 * Math.PI)) * 50;
        if (x % 100 === 0) {
          ctx.lineTo(x, y - 100); // R-peak spike
          ctx.lineTo(x + 10, y);
          // Draw heart icon on R-peak
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

      // Ripple Effect on Peaks
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

  const showToast = (type, message, options = {}) => {
    const defaultOptions = {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: "dark",
      ...options
    };

    const icons = {
      error: <FontAwesomeIcon icon={faExclamationTriangle} />,
      success: <FontAwesomeIcon icon={faCheckCircle} />,
      info: <FontAwesomeIcon icon={faHeartbeat} />
    };

    toast[type](message, {
      ...defaultOptions,
      icon: icons[type]
    });
  };

  const handleSendCode = async () => {
    setIsLoading(true);
    setError("");
    setDataSurge(true);
    setTimeout(() => setDataSurge(false), 1000);

    if (!email || !role) {
      setError("Please enter email and select role.");
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
      showToast("error", "Please enter email and select role.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/auth/forgot-password/send-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail || "Failed to send verification code");
      }

      setShowVerifyCode(true);
      showToast("success", "Verification code sent successfully!");
    } catch (err) {
      console.error("Send code error:", err);
      const errorMsg = err.message || "Failed to send verification code. Please try again.";
      setError(errorMsg);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
      showToast("error", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setIsLoading(true);
    setError("");
    setDataSurge(true);
    setTimeout(() => setDataSurge(false), 1000);

    if (!verificationCode || !newPassword) {
      setError("Please enter verification code and new password.");
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
      showToast("error", "Please enter verification code and new password.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/auth/forgot-password/verify-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: verificationCode, new_password: newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail || "Failed to verify code");
      }

      setError("Password reset successfully. Please login with your new password.");
      showToast("success", "Password reset successfully. Redirecting...");
      setTimeout(() => navigate("/user/login"), 2000);
    } catch (err) {
      console.error("Verify code error:", err);
      const errorMsg = err.message || "Failed to verify code. Please try again.";
      setError(errorMsg);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
      showToast("error", errorMsg);
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
          <h1 className="mhmb-title">Reset Password</h1>
          <p className="mhmb-description">Reset your account password</p>
        </div>

        {error && (
          <div className={error.includes("successfully") ? "success-text" : "error-text"} role="alert" aria-live="assertive">
            <FontAwesomeIcon icon={error.includes("successfully") ? faCheckCircle : faExclamationTriangle} className={error.includes("successfully") ? "success-icon" : "error-icon"} />
            {error}
          </div>
        )}

        {!showVerifyCode && (
          <>
            <div className="login-form">
              <div className="input-wrapper">
                <FontAwesomeIcon icon={faEnvelope} className="input-icon-left" />
                <input
                  type="email"
                  placeholder="Email"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  aria-label="Email"
                />
              </div>

              <div className="input-wrapper">
                <select
                  className="input-field"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={isLoading}
                  aria-label="Role"
                >
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                </select>
              </div>

              <button
                className={`action-btn ${isLoading ? 'loading' : ''}`}
                onClick={handleSendCode}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="loading-icon" spin />
                    Sending...
                  </>
                ) : (
                  "Send Verification Code"
                )}
              </button>
            </div>

            <div className="login-footer">
              <div className="back-link">
                <button
                  type="button"
                  className="link-text"
                  onClick={() => navigate("/user/login")}
                  disabled={isLoading}
                >
                  Back to Login
                </button>
              </div>
            </div>
          </>
        )}

        {showVerifyCode && (
          <>
            <div className="login-form">
              <div className="input-wrapper">
                <input
                  type="text"
                  placeholder="Verification Code"
                  className="input-field"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  disabled={isLoading}
                  required
                  aria-label="Verification Code"
                />
              </div>

              <div className="input-wrapper password-wrapper">
                <FontAwesomeIcon icon={faLock} className="input-icon-left" />
                <input
                  type={isPasswordVisible ? "text" : "password"}
                  placeholder="New Password"
                  className="input-field"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  aria-label="New Password"
                />
                <button
                  type="button"
                  className="visibility-toggle"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  disabled={isLoading}
                  aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                >
                  <FontAwesomeIcon
                    icon={isPasswordVisible ? faEye : faEyeSlash}
                    className="visibility-icon"
                  />
                </button>
              </div>

              <button
                className={`action-btn ${isLoading ? 'loading' : ''}`}
                onClick={handleVerifyCode}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="loading-icon" spin />
                    Verifying...
                  </>
                ) : (
                  "Verify Code"
                )}
              </button>
            </div>

            <div className="login-footer">
              <div className="back-link">
                <button
                  type="button"
                  className="link-text"
                  onClick={() => navigate("/user/login")}
                  disabled={isLoading}
                >
                  Back to Login
                </button>
              </div>
            </div>
          </>
        )}
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

export default ForgotPassword;