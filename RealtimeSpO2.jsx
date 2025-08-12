import React, { useState, useEffect /*, useContext */ } from "react";
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
import { faLungs } from "@fortawesome/free-solid-svg-icons";
// import { AuthContext } from "../context/AuthContext";
import Layout from "../components/Layout";
import VitalSignNav from "../components/VitalSignNav";
import "../css/RealtimeSpO2.css";

const RealtimeSpO2 = () => {
  // const { user, error: authError, isLoading: authLoading } = useContext(AuthContext);
  const [latestSpO2, setLatestSpO2] = useState(null);
  const [realtimeData, setRealtimeData] = useState([]);
  const [error, setError] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Temporarily hardcode user for testing
    const user = {
      userType: "Patient",
      deviceToken: "ED134",
    };

    // if (authLoading) return;

    // if (!user || user.userType?.toLowerCase() !== "patient") {
    //   setError("Please log in as a patient to view real-time SpO2 data.");
    //   navigate("/user/login");
    //   return;
    // }

    // // Original deviceToken validation
    // if (!user.deviceToken) {
    //   setError("Device token not found. Please ensure you are registered with a device.");
    //   return;
    // }

    const ws = new WebSocket(`wss://13.60.49.202:8000/ws/iot/stream?device_token=${user.deviceToken}`);

    ws.onopen = () => {
      setIsConnected(true);
      setError("");
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.topic === "healthcare/iot" && message.message_type === "mqtt_data" && message.data.spo2) {
          const { spo2, timestamp } = message.data;
          const date = new Date(timestamp);
          if (isNaN(date)) {
            console.warn("Invalid timestamp:", timestamp);
            return;
          }

          const newDataPoint = {
            timestamp: date,
            formattedTime: date.toLocaleString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            spo2: spo2.value,
          };

          setLatestSpO2({
            spo2: spo2.value,
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
  }, [/* user, authLoading, */ navigate]);

  return (
    <Layout title="Real-Time SpO2 Monitor">
      <div className="spo2-page">
        <div className="spo2-page-layout">
          <aside className="spo2-vital-signs-sidebar">
            <VitalSignNav />
          </aside>
          <div className="spo2-container">
            <div className="spo2-header">
              <h2>Real-Time SpO2</h2>
              {isConnected ? (
                latestSpO2 ? (
                  <div className="current-spo2">
                    <FontAwesomeIcon icon={faLungs} className="spo2-icon" />
                    <span className="spo2-text">{latestSpO2.spo2} %</span>
                  </div>
                ) : (
                  <p>Waiting for data...</p>
                )
              ) : (
                <p className="error-message">{error || "Connecting to WebSocket..."}</p>
              )}
            </div>

            <div className="spo2-graph">
              <h3>Real-Time SpO2 Trends</h3>
              {isConnected && realtimeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart
                    data={realtimeData}
                    margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                    isAnimationActive={false}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
                    <XAxis
                      dataKey="formattedTime"
                      stroke="#333333"
                      tickFormatter={(value) => value}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      label={{
                        value: "SpO2 (%)",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#333333",
                        offset: 10, // Move label slightly down
                      }}
                      stroke="#333333"
                      domain={[80, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#B2CBDE",
                        border: "none",
                        color: "#304674",
                      }}
                      formatter={(value, name) => [value, "SpO2"]}
                      labelFormatter={(label) => `Time: ${label}`}
                    />
                    <ReferenceArea
                      y1={80}
                      y2={94}
                      fill="#ff4d4f"
                      fillOpacity={0.2}
                      label={{ value: "Consult Doctor", fill: "#ff4d4f", position: "insideBottom" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="spo2"
                      stroke="#1a5b92"
                      strokeWidth={2}
                      activeDot={{ r: 5, fill: "#304674" }}
                      name="SpO2"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p>{error || "Waiting for real-time data..."}</p>
              )}
            </div>

            <div className="spo2-footer">
              <p>
                Real-time data sourced from medical sensors. Status: {isConnected ? "Connected" : "Disconnected"}
              </p>
              {error && <p className="error-message">{error}</p>}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RealtimeSpO2;