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
import { faTachometerAlt } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import Layout from "../components/Layout";
import VitalSignNav from "../components/VitalSignNav";
import "../css/BloodPressure.css";

const api = axios.create({
  baseURL: "https://13.60.49.202:8000",
});

const BloodPressure = () => {
  const { user, error: authError, isLoading: authLoading } = useContext(AuthContext);
  const [latestBP, setLatestBP] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log("BloodPressure user state:", { user, authError, authLoading });

    const fetchData = async () => {
      setIsLoading(true);
      setError("");

      if (authLoading) {
        console.log("AuthContext still loading...");
        return;
      }

      if (!user || user.userType?.toLowerCase() !== "patient") {
        setError("Please log in as a patient to view blood pressure data.");
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
        const response = await api.get("/iot/my-data/blood-pressure?limit=50", { headers });
        console.log("BloodPressure API response:", response.data);

        if (!response.data.success || !response.data.blood_pressure?.readings) {
          setError("No blood pressure data available.");
          setIsLoading(false);
          return;
        }

        // Format history data for chart
        const formattedData = response.data.blood_pressure.readings
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
              bp_systolic: entry.systolic,
              bp_diastolic: entry.diastolic,
            };
          })
          .filter((entry) => entry !== null)
          .sort((a, b) => a.timestamp - b.timestamp);

        if (formattedData.length === 0) {
          setError("No valid blood pressure readings available.");
          setIsLoading(false);
          return;
        }

        // Set latest blood pressure and statistics
        setLatestBP({
          systolic: response.data.blood_pressure.statistics.systolic.latest,
          diastolic: response.data.blood_pressure.statistics.diastolic.latest,
          timestamp: formattedData[formattedData.length - 1]?.timestamp.toISOString(),
        });
        setStatistics(response.data.blood_pressure.statistics);
        setHistoryData(formattedData);
      } catch (err) {
        console.error("Error fetching blood pressure data:", {
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
            ? "Blood pressure data not found."
            : err.response?.data?.message || `Failed to fetch blood pressure data: ${err.message}`
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, authError, authLoading]);

  return (
    <Layout title="Blood Pressure Monitor">
      <div className="blood-pressure-page">
        <div className="blood-pressure-page-layout">
          <aside className="blood-pressure-vital-signs-sidebar">
            <VitalSignNav />
          </aside>
          <div className="blood-pressure-container">
            <div className="blood-pressure-header">
              <h2>Current Blood Pressure</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {isLoading || authLoading ? (
                  <p>Loading...</p>
                ) : error ? (
                  <p className="error-message">{error}</p>
                ) : latestBP ? (
                  <div className="current-blood-pressure">
                    <FontAwesomeIcon icon={faTachometerAlt} className="bp-icon" />
                    <span className="bp-text">{latestBP.systolic}/{latestBP.diastolic} mmHg</span>
                  </div>
                ) : (
                  <p>No data available.</p>
                )}
                <Link to="/user/realtime-bp">
                  <button className="realtime-button">View it in Real Time</button>
                </Link>
              </div>
            </div>

            <div className="blood-pressure-graph">
              <h3>Blood Pressure Trends</h3>
              {isLoading || authLoading ? (
                <p>Loading graph...</p>
              ) : error ? (
                <p className="error-message">{error}</p>
              ) : historyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={historyData}
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
                      domain={['auto', 'auto']}
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
                <p>No historical data available.</p>
              )}
            </div>

            <div className="bp-statistics">
              <div className="bp-stats-left">
                <h3>Systolic Statistics</h3>
                {isLoading || authLoading ? (
                  <p>Loading statistics...</p>
                ) : error ? (
                  <p className="error-message">{error}</p>
                ) : statistics ? (
                  <div className="statistics-column">
                    <div className="statistic-card">
                      <span className="statistic-label">Minimum</span>
                      <span className="statistic-value">{statistics.systolic.min} mmHg</span>
                    </div>
                    <div className="statistic-card">
                      <span className="statistic-label">Maximum</span>
                      <span className="statistic-value">{statistics.systolic.max} mmHg</span>
                    </div>
                    <div className="statistic-card">
                      <span className="statistic-label">Average</span>
                      <span className="statistic-value">{statistics.systolic.avg.toFixed(2)} mmHg</span>
                    </div>
                    <div className="statistic-card">
                      <span className="statistic-label">Readings</span>
                      <span className="statistic-value">{statistics.systolic.count}</span>
                    </div>
                  </div>
                ) : (
                  <p>No statistics available.</p>
                )}
              </div>

              <div className="bp-stats-right">
                <h3>Diastolic Statistics</h3>
                {isLoading || authLoading ? (
                  <p>Loading statistics...</p>
                ) : error ? (
                  <p className="error-message">{error}</p>
                ) : statistics ? (
                  <div className="statistics-column">
                    <div className="statistic-card">
                      <span className="statistic-label">Minimum</span>
                      <span className="statistic-value">{statistics.diastolic.min} mmHg</span>
                    </div>
                    <div className="statistic-card">
                      <span className="statistic-label">Maximum</span>
                      <span className="statistic-value">{statistics.diastolic.max} mmHg</span>
                    </div>
                    <div className="statistic-card">
                      <span className="statistic-label">Average</span>
                      <span className="statistic-value">{statistics.diastolic.avg.toFixed(2)} mmHg</span>
                    </div>
                    <div className="statistic-card">
                      <span className="statistic-label">Readings</span>
                      <span className="statistic-value">{statistics.diastolic.count}</span>
                    </div>
                  </div>
                ) : (
                  <p>No statistics available.</p>
                )}
              </div>
            </div>

            <div className="blood-pressure-footer">
              <p>
                Data sourced from medical sensors. Last updated:{" "}
                {latestBP && latestBP.timestamp
                  ? new Date(latestBP.timestamp).toLocaleString([], {
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

export default BloodPressure;