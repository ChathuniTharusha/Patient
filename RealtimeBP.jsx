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
import { faTachometerAlt } from "@fortawesome/free-solid-svg-icons";
import { AuthContext } from "../context/AuthContext";
import Layout from "../components/Layout";
import VitalSignNav from "../components/VitalSignNav";
import "../css/RealtimeBP.css";

const RealtimeBP = () => {
  const { user, error: authError, isLoading: authLoading } = useContext(AuthContext);
  const [latestBP, setLatestBP] = useState(null);
  const [realtimeData, setRealtimeData] = useState([]);
  const [error, setError] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;

    if (!user || user.userType?.toLowerCase() !== "patient") {
      setError("Please log in as a patient to view real-time blood pressure data.");
      navigate("/user/login");
      return;
    }

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
        if (message.topic === "healthcare/iot" && message.message_type === "mqtt_data" && message.data.blood_pressure) {
          const { blood_pressure, timestamp } = message.data;
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
            bp_systolic: blood_pressure.systolic,
            bp_diastolic: blood_pressure.diastolic,
          };

          setLatestBP({
            systolic: blood_pressure.systolic,
            diastolic: blood_pressure.diastolic,
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

  return (
    <Layout title="Real-Time Blood Pressure Monitor">
      <div className="blood-pressure-page">
        <div className="blood-pressure-page-layout">
          <aside className="blood-pressure-vital-signs-sidebar">
            <VitalSignNav />
          </aside>
          <div className="blood-pressure-container">
            <div className="blood-pressure-header">
              <h2>Real-Time Blood Pressure</h2>
              {isConnected ? (
                latestBP ? (
                  <div className="current-blood-pressure">
                    <FontAwesomeIcon icon={faTachometerAlt} className="bp-icon" />
                    <span className="bp-text">{latestBP.systolic}/{latestBP.diastolic} mmHg</span>
                  </div>
                ) : (
                  <p>Waiting for data...</p>
                )
              ) : (
                <p className="error-message">{error || "Connecting to WebSocket..."}</p>
              )}
            </div>

            <div className="blood-pressure-graph">
              <h3>Real-Time Blood Pressure Trends</h3>
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
                        value: "Blood Pressure (mmHg)",
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
                      formatter={(value, name) => [value, name === "bp_systolic" ? "Systolic" : "Diastolic"]}
                      labelFormatter={(label) => `Time: ${label}`}
                    />
                    <ReferenceArea
                      y1={130}
                      y2={140}
                      fill="#ff4d4f"
                      fillOpacity={0.3}
                      label={{ value: "Consult Doctor", fill: "#ff4d4f", position: "insideTop" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="bp_systolic"
                      stroke="#304674"
                      strokeWidth={2}
                      activeDot={{ r: 5, fill: "#304674" }}
                      name="bp_systolic"
                    />
                    <Line
                      type="monotone"
                      dataKey="bp_diastolic"
                      stroke="#EC8585"
                      strokeWidth={2}
                      activeDot={{ r: 5, fill: "#304674" }}
                      name="bp_diastolic"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p>{error || "Waiting for real-time data..."}</p>
              )}
            </div>

            <div className="blood-pressure-footer">
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

export default RealtimeBP;