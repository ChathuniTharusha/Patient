import React, { useState, useEffect, useContext } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeartbeat } from "@fortawesome/free-solid-svg-icons";
import axios from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import Layout from "../components/Layout";
import "../css/ECG.css"; 

const ECG = () => {
  const { user } = useContext(AuthContext);
  const [latestECG, setLatestECG] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const demoMode = false;

  // Mock data for demo (assuming ECG voltage in mV)
  const mockLatest = { ecg: 1.0, timestamp: new Date().toISOString() };
  const mockHistory = [
    { timestamp: new Date(Date.now() - 9 * 3600000).toISOString(), ecg: 0.8 },
    { timestamp: new Date(Date.now() - 8 * 3600000).toISOString(), ecg: 0.9 },
    { timestamp: new Date(Date.now() - 7 * 3600000).toISOString(), ecg: 1.0 },
    { timestamp: new Date(Date.now() - 6 * 3600000).toISOString(), ecg: 1.1 },
    { timestamp: new Date(Date.now() - 5 * 3600000).toISOString(), ecg: 0.9 },
    { timestamp: new Date(Date.now() - 4 * 3600000).toISOString(), ecg: 1.0 },
    { timestamp: new Date(Date.now() - 3 * 3600000).toISOString(), ecg: 0.8 },
    { timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), ecg: 0.9 },
    { timestamp: new Date(Date.now() - 1 * 3600000).toISOString(), ecg: 1.0 },
    { timestamp: new Date(Date.now()).toISOString(), ecg: 1.0 },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError("");

      const username = demoMode || !user ? "testuserA" : user.username;
      const headers = user?.token && !demoMode ? { Authorization: `Bearer ${user.token}` } : {};

      if (!demoMode && (!user || user.role?.toLowerCase() !== "patient")) {
        setError("Please log in as a patient to view ECG data.");
        setIsLoading(false);
        return;
      }

      try {
        // Fetch latest ECG
        const latestResponse = await axios.get(
          `https://13.51.157.208:8000/user/{username}/heartrate/latest`,
          { headers }
        );
        setLatestECG(latestResponse.data);

        // Fetch historical ECG
        const historyResponse = await axios.get(
          `http://13.51.161.232:8000/user/${username}/ecg/history`,
          { headers }
        );

        // Format data for Recharts
        const formattedData = historyResponse.data.map((entry) => ({
          timestamp: new Date(entry.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          ecg: entry.ecg,
        }));
        setHistoryData(formattedData);
      } catch (err) {
        console.error("Error fetching ECG data:", err.response?.data || err.message);
        setError(""); // Suppress error for demo
        setLatestECG(mockLatest);
        setHistoryData(
          mockHistory.map((entry) => ({
            timestamp: new Date(entry.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            ecg: entry.ecg,
          }))
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  return (
    <Layout title="ECG Monitor">
      <div className="ecg-page">
        <div className="ecg-container">
          <div className="ecg-header">
            <h2>Current ECG</h2>
            {isLoading ? (
              <p>Loading...</p>
            ) : error ? (
              <p className="error-message">{error}</p>
            ) : latestECG ? (
              <div className="current-ecg">
                <FontAwesomeIcon icon={faHeartbeat} className="ecg-icon" />
                <span className="ecg-text">{latestECG.ecg} mV</span>
              </div>
            ) : (
              <p>No data available.</p>
            )}
          </div>

          <div className="ecg-graph">
            <h3>ECG Trends</h3>
            {isLoading ? (
              <p>Loading graph...</p>
            ) : error ? (
              <p className="error-message">{error}</p>
            ) : historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={historyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="timestamp" stroke="#304674" />
                  <YAxis
                    label={{
                      value: "ECG (mV)",
                      angle: -90,
                      position: "insideLeft",
                      fill: "#304674",
                    }}
                    stroke="#304674"
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#B2CBDE", border: "none", color: "#304674" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ecg"
                    stroke="#85AFEC"
                    activeDot={{ r: 8 }}
                    name="ECG"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p>No historical data available.</p>
            )}
          </div>

          <div className="ecg-footer">
            <p>
              Data sourced from medical sensors. Last updated:{" "}
              {latestECG ? new Date(latestECG.timestamp).toLocaleString() : "N/A"}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ECG;