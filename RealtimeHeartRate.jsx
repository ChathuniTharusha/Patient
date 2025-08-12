import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeartbeat } from "@fortawesome/free-solid-svg-icons";
import { AuthContext } from "../context/AuthContext";
import Layout from "../components/Layout";
import VitalSignNav from "../components/VitalSignNav";
import "../css/RealtimeHeartRate.css";

const RealtimeHeartRate = () => {
  const { user, error: authError, isLoading: authLoading } = useContext(AuthContext);
  const [latestHeartRate, setLatestHeartRate] = useState(null);
  const [realtimeData, setRealtimeData] = useState([]);
  const [error, setError] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for authentication to complete
    if (authLoading) return;

    // Check if user is authenticated and is a patient
    if (!user || user.userType?.toLowerCase() !== "patient") {
      setError("Please log in as a patient to view real-time heart rate data.");
      navigate("/user/login");
      return;
    }

    // Check if device token exists
    if (!user.deviceToken) {
      setError("Device token not found. Please ensure you are registered with a device.");
      return;
    }

    const ws = new WebSocket(`wss://13.60.49.202:8000/ws/iot/stream?device_token=${user.deviceToken}`);

    ws.onopen = () => {
      setIsConnected(true);
      setError("");
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.topic === "healthcare/iot" && message.message_type === "mqtt_data" && message.data.heart_rate) {
          const { heart_rate, timestamp } = message.data;
          const date = new Date(timestamp);
          if (isNaN(date)) {
            console.warn("Invalid timestamp:", timestamp);
            return;
          }

          // Handle both .value structure and direct value structure
          const heartRateValue = heart_rate.value !== undefined ? heart_rate.value : heart_rate;

          const newDataPoint = {
            timestamp: date,
            formattedTime: date.toLocaleString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            heartrate: heartRateValue,
          };

          setLatestHeartRate({
            heartrate: heartRateValue,
            timestamp,
          });

          setRealtimeData((prev) => {
            const newData = [...prev, newDataPoint].slice(-20); // Keep last 20 data points
            return newData;
          });
        }
      } catch (err) {
        setError("Failed to parse WebSocket data.");
        console.error("WebSocket message error:", err);
      }
    };

    ws.onerror = () => {
      setError("WebSocket connection failed.");
      setIsConnected(false);
      console.error("WebSocket error");
    };

    ws.onclose = () => {
      setIsConnected(false);
      setError("WebSocket connection closed.");
      console.log("WebSocket closed");
    };

    return () => {
      ws.close();
      console.log("WebSocket cleanup");
    };
  }, [user, authLoading, navigate]);

  // Show loading state while authentication is in progress
  if (authLoading) {
    return (
      <Layout title="Real-Time Heart Rate Monitor">
        <div className="heart-rate-page">
          <div className="heart-rate-page-layout">
            <aside className="heart-rate-vital-signs-sidebar">
              <VitalSignNav />
            </aside>
            <div className="heart-rate-container">
              <p>Loading authentication...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Show authentication error if exists
  if (authError) {
    return (
      <Layout title="Real-Time Heart Rate Monitor">
        <div className="heart-rate-page">
          <div className="heart-rate-page-layout">
            <aside className="heart-rate-vital-signs-sidebar">
              <VitalSignNav />
            </aside>
            <div className="heart-rate-container">
              <p className="error-message">Authentication error: {authError}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Real-Time Heart Rate Monitor">
      <div className="heart-rate-page">
        <div className="heart-rate-page-layout">
          <aside className="heart-rate-vital-signs-sidebar">
            <VitalSignNav />
          </aside>
          <div className="heart-rate-container">
            <div className="heart-rate-header">
              <h2>Real-Time Heart Rate</h2>
              {isConnected ? (
                latestHeartRate ? (
                  <div className="current-heart-rate">
                    <FontAwesomeIcon icon={faHeartbeat} className="heart-rate-icon" />
                    <span className="heart-rate-text">{latestHeartRate.heartrate} BPM</span>
                  </div>
                ) : (
                  <p>Waiting for data...</p>
                )
              ) : (
                <p className="error-message">{error || "Connecting to WebSocket..."}</p>
              )}
            </div>

            <div className="heart-rate-graph">
              <h3>Real-Time Heart Rate Trends</h3>
              {isConnected && realtimeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={realtimeData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
                    <XAxis
                      dataKey="formattedTime"
                      stroke="#333333"
                      tickFormatter={(value) => value}
                      interval="preserveStartEnd"
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      label={{
                        value: "Heart Rate (BPM)",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#333333",
                      }}
                      stroke="#333333"
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#B2CBDE",
                        border: "none",
                        color: "#304674",
                      }}
                      formatter={(value, name) => [value, "Heart Rate"]}
                      labelFormatter={(label) => `Time: ${label}`}
                    />
                    <ReferenceArea
                      y1={100}
                      y2={120}
                      fill="#ff4d4f"
                      fillOpacity={0.3}
                      label={{ value: "Consult Doctor", fill: "#ff4d4f", position: "insideTop" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="heartrate"
                      stroke="#1a5b92"
                      strokeWidth={2}
                      activeDot={{ r: 5, fill: "#304674" }}
                      name="Heart Rate"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p>{error || "Waiting for real-time data..."}</p>
              )}
            </div>

            <div className="heart-rate-footer">
              <p>
                Real-time data sourced from medical sensors. Status: {isConnected ? "Connected" : "Disconnected"}
              </p>
              {user?.deviceToken && (
                <p>Device: {user.deviceToken}</p>
              )}
              {error && <p className="error-message">{error}</p>}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RealtimeHeartRate;