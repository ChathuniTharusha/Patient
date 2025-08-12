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
import { faThermometerHalf } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import Layout from "../components/Layout";
import VitalSignNav from "../components/VitalSignNav";
import "../css/SkinTemperature.css";

const api = axios.create({
  baseURL: "https://13.60.49.202:8000",
});

const SkinTemperature = () => {
  const { user, error: authError, isLoading: authLoading } = useContext(AuthContext);
  const [latestTemp, setLatestTemp] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log("SkinTemperature user state:", { user, authError, authLoading });

    const fetchData = async () => {
      setIsLoading(true);
      setError("");

      if (authLoading) {
        console.log("AuthContext still loading...");
        return;
      }

      if (!user || user.userType?.toLowerCase() !== "patient") {
        setError("Please log in as a patient to view skin temperature data.");
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
        const response = await api.get("/iot/my-data/body-temperature", { headers });
        console.log("SkinTemperature API response:", response.data);

        if (!response.data.success || !Array.isArray(response.data.data) || response.data.data.length === 0) {
          setError("No skin temperature data available.");
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
              body_temperature: entry.value,
            };
          })
          .filter((entry) => entry !== null)
          .sort((a, b) => a.timestamp - b.timestamp);

        // Set latest temperature and statistics
        setLatestTemp({
          body_temperature: response.data.statistics.latest,
          timestamp: formattedData[formattedData.length - 1]?.timestamp.toISOString(),
        });
        setStatistics(response.data.statistics);
        setHistoryData(formattedData);
      } catch (err) {
        console.error("Error fetching skin temperature data:", {
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
            ? "Skin temperature data not found."
            : err.response?.data?.message || `Failed to fetch skin temperature data: ${err.message}`
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, authError, authLoading]);

  return (
    <Layout title="Skin Temperature Monitor">
      <div className="skin-temp-page">
        <div className="skin-temp-page-layout">
          <aside className="skin-temp-vital-signs-sidebar">
            <VitalSignNav />
          </aside>
          <div className="skin-temp-container">
            <div className="skin-temp-header">
              <h2>Current Skin Temperature</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {isLoading || authLoading ? (
                  <p>Loading...</p>
                ) : error ? (
                  <p className="error-message">{error}</p>
                ) : latestTemp ? (
                  <div className="current-skin-temp">
                    <FontAwesomeIcon icon={faThermometerHalf} className="skin-temp-icon" />
                    <span className="skin-temp-text">{latestTemp.body_temperature.toFixed(1)} °C</span>
                  </div>
                ) : (
                  <p>No data available.</p>
                )}
                <Link to="/user/realtime-skintemp">
                  <button className="realtime-button">View it in Real Time</button>
                </Link>
              </div>
            </div>

            <div className="skin-temp-statistics">
              <h3>Skin Temperature Statistics</h3>
              {isLoading || authLoading ? (
                <p>Loading statistics...</p>
              ) : error ? (
                <p className="error-message">{error}</p>
              ) : statistics ? (
                <div className="statistics-grid">
                  <div className="statistic-card">
                    <span className="statistic-label">Minimum</span>
                    <span className="statistic-value">{statistics.min.toFixed(1)} °C</span>
                  </div>
                  <div className="statistic-card">
                    <span className="statistic-label">Maximum</span>
                    <span className="statistic-value">{statistics.max.toFixed(1)} °C</span>
                  </div>
                  <div className="statistic-card">
                    <span className="statistic-label">Average</span>
                    <span className="statistic-value">{statistics.avg.toFixed(2)} °C</span>
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

            <div className="skin-temp-graph">
              <h3>Skin Temperature Trends</h3>
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
                        value: "Temperature (°C)",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#333333",
                        offset: 10, // Move label slightly down
                      }}
                      stroke="#333333"
                      domain={[35, 40]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#B2CBDE",
                        border: "none",
                        color: "#304674",
                      }}
                      formatter={(value, name) => [value.toFixed(1), "Skin Temperature"]}
                      labelFormatter={(label) => `Time: ${label}`}
                    />
                    <ReferenceArea
                      y1={38}
                      y2={40}
                      fill="#ff4d4f"
                      fillOpacity={0.3}
                      label={{ value: "Consult Doctor", fill: "#ff4d4f", position: "insideTop" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="body_temperature"
                      stroke="#1a5b92"
                      strokeWidth={2}
                      activeDot={{ r: 5, fill: "#304674" }}
                      name="Skin Temperature"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p>No historical data available.</p>
              )}
            </div>

            <div className="skin-temp-footer">
              <p>
                Data sourced from medical sensors. Last updated:{" "}
                {latestTemp && latestTemp.timestamp
                  ? new Date(latestTemp.timestamp).toLocaleString([], {
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

export default SkinTemperature;