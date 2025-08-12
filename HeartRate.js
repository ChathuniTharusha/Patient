import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
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
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import Layout from "../components/Layout";
import VitalSignNav from "../components/VitalSignNav";
import "../css/HeartRate.css";

const api = axios.create({
  baseURL: "https://13.60.49.202:8000",
});

const HeartRate = () => {
  const { user, error: authError, isLoading: authLoading } = useContext(AuthContext);
  const [latestHeartRate, setLatestHeartRate] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log("HeartRate user state:", { user, authError, authLoading });

    const fetchData = async () => {
      setIsLoading(true);
      setError("");

      if (authLoading) {
        console.log("AuthContext still loading...");
        return;
      }

      if (!user || user.userType?.toLowerCase() !== "patient") {
        setError("Please log in as a patient to view heart rate data.");
        setIsLoading(false);
        console.log("Validation failed:", { user });
        return;
      }

      if (authError) {
        setError(authError);
        setIsLoading(false);
        return;
      }

      const headers = user?.authToken ? { Authorization: `Bearer ${user.authToken}` } : {};
      console.log("Request headers:", headers);

      try {
        const response = await api.get("/iot/my-data/heart-rate", { headers });
        console.log("HeartRate API response:", response.data);

        if (
          !response.data.success ||
          !Array.isArray(response.data.data) ||
          response.data.data.length === 0
        ) {
          setError("No heart rate data available.");
          setIsLoading(false);
          return;
        }

        // Format history data for chart
        const formattedData = response.data.data
          .map((entry) => {
            const date = new Date(entry.timestamp);
            if (isNaN(date)) {
              console.warn("Invalid timestamp:", entry.timestamp);
              return null;
            }
            return {
              timestamp: date,
              formattedTime: date.toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }),
              heartrate: entry.value,
            };
          })
          .filter((entry) => entry !== null)
          .sort((a, b) => a.timestamp - b.timestamp);

        // Set latest heart rate and statistics
        setLatestHeartRate({
          heartrate: response.data.statistics.latest,
          timestamp: formattedData[formattedData.length - 1]?.timestamp.toISOString(),
        });
        setStatistics(response.data.statistics);
        setHistoryData(formattedData);
      } catch (err) {
        console.error("Error fetching heart rate data:", {
          message: err.message,
          code: err.code,
          response: err.response?.data,
          status: err.response?.status,
        });
        setError(
          err.code === "ETIMEDOUT"
            ? "Request timed out: Backend server is unreachable."
            : err.response?.status === 401
            ? "Unauthorized: Please log in again."
            : err.response?.status === 404
            ? "Heart rate data not found."
            : err.response?.data?.message || `Failed to fetch heart rate data: ${err.message}`
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, authError, authLoading]);

  return (
    <Layout title="Heart Rate Monitor">
      <div className="heart-rate-page">
        <div className="heart-rate-page-layout">
          <aside className="heart-rate-vital-signs-sidebar">
            <VitalSignNav />
          </aside>
          <div className="heart-rate-container">
            <div className="heart-rate-header">
              <h2>Current Heart Rate</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {isLoading || authLoading ? (
                  <p>Loading...</p>
                ) : error ? (
                  <p className="error-message">{error}</p>
                ) : latestHeartRate ? (
                  <div className="current-heart-rate">
                    <FontAwesomeIcon icon={faHeartbeat} className="heart-rate-icon" />
                    <span className="heart-rate-text">{latestHeartRate.heartrate} BPM</span>
                  </div>
                ) : (
                  <p>No data available.</p>
                )}
                <Link to="/user/realtime-heartrate">
                  <button className="realtime-button">View it in Real Time</button>
                </Link>
              </div>
            </div>

            <div className="heart-rate-statistics">
              <h3>Heart Rate Statistics</h3>
              {isLoading || authLoading ? (
                <p>Loading statistics...</p>
              ) : error ? (
                <p className="error-message">{error}</p>
              ) : statistics ? (
                <div className="statistics-grid">
                  <div className="statistic-card">
                    <span className="statistic-label">Minimum</span>
                    <span className="statistic-value">{statistics.min} BPM</span>
                  </div>
                  <div className="statistic-card">
                    <span className="statistic-label">Maximum</span>
                    <span className="statistic-value">{statistics.max} BPM</span>
                  </div>
                  <div className="statistic-card">
                    <span className="statistic-label">Average</span>
                    <span className="statistic-value">{statistics.avg.toFixed(2)} BPM</span>
                  </div>
                  <div className="statistic-card">
                    <span className="statistic-label">Readings</span>
                    <span className="statistic-value">{statistics.count}</span>
                  </div>
                </div>
              ) : (
                <p>No statistics available.</p>
              )}
            </div>

            <div className="heart-rate-graph">
              <h3>Heart Rate Trends</h3>
              {isLoading || authLoading ? (
                <p>Loading graph...</p>
              ) : error ? (
                <p className="error-message">{error}</p>
              ) : historyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart
                    data={historyData}
                    margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
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
                        value: "Heart Rate (BPM)",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#333333",
                        offset: 10, // Move label slightly down
                      }}
                      stroke="#333333"
                      domain={[50, 120]}
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
                <p>No historical data available.</p>
              )}
            </div>

            <div className="heart-rate-footer">
              <p>
                Data sourced from medical sensors. Last updated:{" "}
                {latestHeartRate && latestHeartRate.timestamp
                  ? new Date(latestHeartRate.timestamp).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "N/A"}
              </p>
              {error && <p className="error-message">{error}</p>}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HeartRate;