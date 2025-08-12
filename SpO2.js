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
import { faLungs } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import Layout from "../components/Layout";
import VitalSignNav from "../components/VitalSignNav";
import "../css/SpO2.css";

const api = axios.create({
  baseURL: "https://13.60.49.202:8000",
});

const SpO2 = () => {
  const { user, error: authError, isLoading: authLoading } = useContext(AuthContext);
  const [state, setState] = useState({
    latestSpO2: null,
    historyData: [],
    statistics: null,
    error: "",
    isLoading: true,
  });

  // Sample data as fallback
  const sampleData = Array(10)
    .fill()
    .map((_, i) => {
      const date = new Date(Date.now() - (9 - i) * 60000); // 1-minute intervals
      return {
        timestamp: date,
        formattedTime: date.toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        spo2: 90 + Math.floor(Math.random() * 10), // Random values between 90-99
      };
    });

  useEffect(() => {
    console.log("SpO2 user state:", { user, authError, authLoading });

    const fetchData = async () => {
      if (authLoading) {
        console.log("AuthContext still loading...");
        return;
      }

      if (!user || user.userType?.toLowerCase() !== "patient") {
        setState({
          ...state,
          error: "Please log in as a patient to view SpO2 data.",
          isLoading: false,
        });
        console.log("Validation failed:", { user });
        return;
      }

      if (authError) {
        setState({
          ...state,
          error: authError,
          isLoading: false,
        });
        return;
      }

      const headers = user?.authToken ? { Authorization: `Bearer ${user.authToken}` } : {};
      console.log("Request headers:", headers);

      try {
        const response = await api.get("/iot/my-data/spo2", { headers });
        console.log("SpO2 API response:", response.data);

        if (!response.data.success || !Array.isArray(response.data.data) || response.data.data.length === 0) {
          setState({
            ...state,
            error: "No SpO2 data available. Using sample data.",
            historyData: sampleData,
            latestSpO2: {
              spo2: sampleData[sampleData.length - 1].spo2,
              timestamp: sampleData[sampleData.length - 1].timestamp.toISOString(),
            },
            statistics: {
              min: Math.min(...sampleData.map((d) => d.spo2)),
              max: Math.max(...sampleData.map((d) => d.spo2)),
              avg: sampleData.reduce((sum, d) => sum + d.spo2, 0) / sampleData.length,
              count: sampleData.length,
            },
            isLoading: false,
          });
          return;
        }

        // Limit to last 50 entries for performance
        const formattedData = response.data.data
          .slice(-50)
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
              spo2: entry.value,
            };
          })
          .filter((entry) => entry !== null)
          .sort((a, b) => a.timestamp - b.timestamp);

        setState({
          ...state,
          latestSpO2: {
            spo2: response.data.statistics.latest,
            timestamp: formattedData[formattedData.length - 1]?.timestamp.toISOString(),
          },
          statistics: response.data.statistics,
          historyData: formattedData,
          error: "",
          isLoading: false,
        });
      } catch (err) {
        console.error("Error fetching SpO2 data:", {
          message: err.message,
          code: err.code,
          response: err.response?.data,
          status: err.response?.status,
        });
        setState({
          ...state,
          error:
            err.code === "ETIMEDOUT"
              ? "Request timed out: Backend server is unreachable. Using sample data."
              : err.response?.status === 401
              ? "Unauthorized: Please log in again."
              : err.response?.status === 404
              ? "SpO2 data not found. Using sample data."
              : err.response?.data?.message || `Failed to fetch SpO2 data: ${err.message}`,
          historyData: sampleData,
          latestSpO2: {
            spo2: sampleData[sampleData.length - 1].spo2,
            timestamp: sampleData[sampleData.length - 1].timestamp.toISOString(),
          },
          statistics: {
            min: Math.min(...sampleData.map((d) => d.spo2)),
            max: Math.max(...sampleData.map((d) => d.spo2)),
            avg: sampleData.reduce((sum, d) => sum + d.spo2, 0) / sampleData.length,
            count: sampleData.length,
          },
          isLoading: false,
        });
      }
    };

    fetchData();
  }, [user, authError, authLoading]);

  const { latestSpO2, historyData, statistics, error, isLoading } = state;

  return (
    <Layout title="SpO2 Monitor">
      <div className="spo2-page">
        <div className="spo2-page-layout">
          <aside className="spo2-vital-signs-sidebar">
            <VitalSignNav />
          </aside>
          <div className="spo2-container">
            <div className="spo2-header">
              <h2>Current SpO2</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {isLoading || authLoading ? (
                  <p>Loading...</p>
                ) : error ? (
                  <p className="error-message">{error}</p>
                ) : latestSpO2 ? (
                  <div className="current-spo2">
                    <FontAwesomeIcon icon={faLungs} className="spo2-icon" />
                    <span className="spo2-text">{latestSpO2.spo2} %</span>
                  </div>
                ) : (
                  <p>No data available.</p>
                )}
                <Link to="/user/realtime-spo2">
                  <button className="realtime-button">View it in Real Time</button>
                </Link>
              </div>
            </div>

            <div className="spo2-statistics">
              <h3>SpO2 Statistics</h3>
              {isLoading || authLoading ? (
                <p>Loading statistics...</p>
              ) : error ? (
                <p className="error-message">{error}</p>
              ) : statistics ? (
                <div className="statistics-grid">
                  <div className="statistic-card">
                    <span className="statistic-label">Minimum</span>
                    <span className="statistic-value">{statistics.min} %</span>
                  </div>
                  <div className="statistic-card">
                    <span className="statistic-label">Maximum</span>
                    <span className="statistic-value">{statistics.max} %</span>
                  </div>
                  <div className="statistic-card">
                    <span className="statistic-label">Average</span>
                    <span className="statistic-value">{statistics.avg.toFixed(2)} %</span>
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

            <div className="spo2-graph">
              <h3>SpO2 Trends</h3>
              {isLoading || authLoading ? (
                <p>Loading graph...</p>
              ) : error ? (
                <p className="error-message">{error}</p>
              ) : historyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart
                    data={historyData}
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
                <p>No historical data available.</p>
              )}
            </div>

            <div className="spo2-footer">
              <p>
                Data sourced from medical sensors. Last updated:{" "}
                {latestSpO2 && latestSpO2.timestamp
                  ? new Date(latestSpO2.timestamp).toLocaleString([], {
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

export default SpO2;