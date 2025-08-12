import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Layout from "./Layout";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { Calendar as CalendarIcon, Users, Lightbulb, RefreshCw } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "../css/Dashboard.css";

const API_BASE = "https://13.60.49.202:8000";
const VITALS_API = `${API_BASE}/iot/my-data/latest?limit=10`;
const DAILY_TIP_API = "http://3.7.134.6:8000";

const vitalRoutes = {
  skin_temperature: "/user/skin-temp",
  blood_pressure: "/user/blood-pressure",
  spo2: "/user/spo2",
  heart_rate: "/user/heart-rate",
  mobility: "/user/mobility",
  ecg: "/user/ecg",
};

const vitalDisplayNames = {
  skin_temperature: "Body Temperature",
  blood_pressure: "Blood Pressure",
  spo2: "SpO2",
  heart_rate: "Heart Rate",
  mobility: "Mobility",
  ecg: "ECG",
};

const vitalIcons = {
  "Body Temperature": "fas fa-thermometer-half",
  "Blood Pressure": "fas fa-heart",
  SpO2: "fas fa-lungs",
  "Heart Rate": "fas fa-heartbeat",
  Mobility: "fas fa-walking",
  ECG: "fas fa-wave-square",
};

const vitalColors = {
  skin_temperature: "#FFD93D",
  blood_pressure_systolic: "#FF8C8C",
  blood_pressure_diastolic: "#FF5555",
  spo2: "#4ECDC4",
  heart_rate: "#FF6B6B",
  mobility: "#45B7D1",
  ecg: "#96CEB4",
};

const vitalUnits = {
  skin_temperature: "°C",
  blood_pressure: "mmHg",
  spo2: "%",
  heart_rate: "bpm",
  mobility: "steps",
  ecg: "mV",
};

const vitalDomains = {
  skin_temperature: [30, 40],
  blood_pressure: [60, 180],
  spo2: [80, 100],
  heart_rate: [40, 120],
  mobility: [0, 10000],
  ecg: [-2, 2],
};

// Helper to format daily tips
const formatDailyTip = (text) => {
  if (!text) return "";
  return text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+|\s+$/g, "")
    .replace(/([.!?])\s*\n/g, "$1\n\n")
    .trim();
};

// Daily Tip Loading Popup Component
const DailyTipLoadingPopup = () => {
  return (
    <div className="daily-tip-loading-popup">
      <div className="daily-tip-loading-content">
        <div className="daily-tip-loading-header">
          <div className="daily-tip-loading-icon">🤖</div>
          <h3 className="daily-tip-loading-title">Generating Your Daily Health Tip</h3>
          <p className="daily-tip-loading-subtitle">Analyzing your vitals and location data...</p>
        </div>
        <div className="daily-tip-loading-spinner"></div>
      </div>
    </div>
  );
};

// Daily Tip Popup Component
const DailyTipPopup = ({ tip, onClose, isAutomatic = false }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, isAutomatic ? 12000 : 8000);
    return () => clearTimeout(timer);
  }, [onClose, isAutomatic]);

  if (!tip) return null;

  return (
    <div className="daily-tip-popup">
      <div className={`daily-tip-popup-content ${isAutomatic ? "automatic-update" : ""}`}>
        <div className="daily-tip-popup-header">
          <Lightbulb size={20} />
          <h3>
            {isAutomatic ? "Daily Health Tip Auto-Updated!" : "New Daily Health Tip!"}
            {isAutomatic && <span className="auto-update-badge">Auto Generated</span>}
          </h3>
          <button className="daily-tip-popup-close" onClick={onClose}>×</button>
        </div>
        <div className="daily-tip-popup-body">
          {isAutomatic && (
            <p className="auto-update-message">
              Your health tip has been automatically updated based on your latest vitals and location changes.
            </p>
          )}
          <pre className="daily-tip-popup-text">{tip}</pre>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [city, setCity] = useState("Jaffna");
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const [vitalsData, setVitalsData] = useState([]);
  const [latestVitals, setLatestVitals] = useState(null);
  const [visibleVitals, setVisibleVitals] = useState([]);
  const [isVitalsLoading, setIsVitalsLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [appointmentDates, setAppointmentDates] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dailyTip, setDailyTip] = useState("");
  const [loadingTip, setLoadingTip] = useState(false);
  const [tipError, setTipError] = useState("");
  const [showTipPopup, setShowTipPopup] = useState(false);
  const [showAutomaticTipPopup, setShowAutomaticTipPopup] = useState(false);
  const [lastTipTime, setLastTipTime] = useState(null);
  const [previousVitalsHash, setPreviousVitalsHash] = useState("");
  const [previousCity, setPreviousCity] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [lastVitalsTimestamp, setLastVitalsTimestamp] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const createVitalsHash = (vitals) => {
    if (!vitals) return "";
    const vitalsString = JSON.stringify({
      temperature: vitals.temperature || vitals.skin_temperature,
      heart_rate: vitals.heart_rate,
      blood_pressure: vitals.blood_pressure,
      spo2: vitals.spo2,
      mobility: vitals.mobility,
      ecg_anomaly: vitals.ecg_anomaly,
      timestamp: vitals.timestamp,
    });
    return btoa(vitalsString);
  };

  const saveNotificationToBackend = async (tipContent, isAutomatic = false, changeType = "manual") => {
    if (!user?.authToken || !tipContent) return;
    try {
      const response = await fetch(`${API_BASE}/notifications/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "daily_tip",
          message: isAutomatic
            ? `Your Daily Health Tip has been automatically updated based on ${changeType}!`
            : `Check your updated Daily Health Tip based on your latest vitals and location!`,
          metadata: {
            full_tip: tipContent,
            generated_at: new Date().toISOString(),
            city: city,
            trigger: isAutomatic ? "automatic_vitals_update" : "manual_refresh",
            change_type: changeType,
            vitals_timestamp: latestVitals?.timestamp,
          },
        }),
      });
      if (!response.ok) {
        console.error("Failed to save daily tip notification:", response.status);
      }
    } catch (error) {
      console.error("Error saving daily tip notification:", error);
    }
  };

  const detectSignificantChanges = (currentVitals, currentCity) => {
    if (!currentVitals || !latestVitals) return { hasChange: false, changeType: "none" };
    const changes = {
      location: previousCity && previousCity !== currentCity,
      newVitals: lastVitalsTimestamp && new Date(currentVitals.timestamp) > new Date(lastVitalsTimestamp),
      temperature: Math.abs((currentVitals.temperature || currentVitals.skin_temperature || 0) - (latestVitals.temperature || latestVitals.skin_temperature || 0)) > 0.5,
      heart_rate: Math.abs((currentVitals.heart_rate || 0) - (latestVitals.heart_rate || 0)) > 10,
      blood_pressure: currentVitals.blood_pressure && latestVitals.blood_pressure && (
        Math.abs((currentVitals.blood_pressure.systolic || 0) - (latestVitals.blood_pressure.systolic || 0)) > 10 ||
        Math.abs((currentVitals.blood_pressure.diastolic || 0) - (latestVitals.blood_pressure.diastolic || 0)) > 5
      ),
      spo2: Math.abs((currentVitals.spo2 || 0) - (latestVitals.spo2 || 0)) > 2,
      mobility: Math.abs((currentVitals.mobility || 0) - (latestVitals.mobility || 0)) > 1000,
    };
    let changeType = "none";
    if (changes.location) changeType = "location change";
    else if (changes.newVitals) changeType = "new vitals data";
    else if (changes.temperature) changeType = "temperature change";
    else if (changes.heart_rate) changeType = "heart rate change";
    else if (changes.blood_pressure) changeType = "blood pressure change";
    else if (changes.spo2) changeType = "SpO2 change";
    else if (changes.mobility) changeType = "mobility change";
    const hasChange = Object.values(changes).some((change) => change);
    return { hasChange, changeType };
  };

  const fetchDailyTip = async (vitals, isAutomatic = false, showNotification = false) => {
    if (!vitals) return;
    const { hasChange, changeType } = detectSignificantChanges(vitals, city);
    if (isAutomatic && !hasChange && !isInitialLoad) {
      console.log("No significant changes detected, skipping automatic tip update");
      return;
    }
    setLoadingTip(true);
    setTipError("");
    try {
      const res = await fetch(`${DAILY_TIP_API}/daily-suggestion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user?.username || "Patient",
          city,
          skin_temperature: vitals.temperature || vitals.skin_temperature,
          heart_rate: vitals.heart_rate,
          blood_pressure_systolic: vitals.blood_pressure?.systolic,
          blood_pressure_diastolic: vitals.blood_pressure?.diastolic,
          SpO2: vitals.spo2,
          mobility: vitals.mobility,
          ecg_anomaly: vitals.ecg_anomaly,
        }),
      });
      const json = await res.json();
      const formattedTip = formatDailyTip(json.daily_tip || "No tip available.");
      if (formattedTip !== dailyTip && formattedTip !== "No tip available.") {
        setDailyTip(formattedTip);
        setPreviousVitalsHash(createVitalsHash(vitals));
        setPreviousCity(city);
        setLastVitalsTimestamp(vitals.timestamp);
        setLastTipTime(new Date().toISOString());
        await saveNotificationToBackend(formattedTip, isAutomatic, changeType);
        if (showNotification) {
          setShowTipPopup(true);
          toast.success("New daily health tip generated!");
        } else if (isAutomatic && !isInitialLoad) {
          setShowAutomaticTipPopup(true);
          toast.info(`Daily tip auto-updated due to ${changeType}!`, {
            autoClose: 5000,
            className: "automatic-update-toast",
          });
        }
      } else if (isInitialLoad) {
        setDailyTip(formattedTip);
        setPreviousVitalsHash(createVitalsHash(vitals));
        setPreviousCity(city);
        setLastVitalsTimestamp(vitals.timestamp);
      }
    } catch (error) {
      setTipError(`Failed to load daily tip: ${error.message}`);
      setDailyTip("");
      console.error("Error fetching daily tip:", error);
    } finally {
      setLoadingTip(false);
      setIsInitialLoad(false);
    }
  };

  const refreshDailyTip = () => {
    if (latestVitals) {
      console.log("Manual daily tip refresh triggered");
      fetchDailyTip(latestVitals, false, true);
    }
  };

  useEffect(() => {
    if (latestVitals && !isVitalsLoading) {
      const timeoutId = setTimeout(() => {
        const isAutomatic = !isInitialLoad && (previousVitalsHash !== "" || previousCity !== "");
        fetchDailyTip(latestVitals, isAutomatic, false);
      }, isInitialLoad ? 0 : 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [latestVitals, city, isVitalsLoading]);

  useEffect(() => {
    if (!isLoading && user?.authToken && user?.username) {
      const fetchData = async () => {
        setIsVitalsLoading(true);
        try {
          const [vitalsRes, dataRes, apptsRes] = await Promise.all([
            fetch(`${API_BASE}/api/profile/my-vitals`, {
              headers: { Authorization: `Bearer ${user.authToken}` },
            }),
            fetch(VITALS_API, {
              headers: { Authorization: `Bearer ${user.authToken}` },
            }),
            fetch(`${API_BASE}/api/appointments/patient`, {
              headers: { Authorization: `Bearer ${user.authToken}` },
            }),
          ]);
          if (!vitalsRes.ok || !dataRes.ok || !apptsRes.ok) {
            throw new Error("Failed to fetch dashboard data");
          }
          const vitals = await vitalsRes.json();
          const data = await dataRes.json();
          const appts = await apptsRes.json();
          const normalizedVitals = (vitals.visible_vitals || []).map((vital) =>
            vital.toLowerCase().replace(/ /g, "_").replace("body_temperature", "skin_temperature")
          );
          setVisibleVitals([...new Set(normalizedVitals)]);
          const processedVitalsData = data.data?.map((item) => ({
            ...item,
            timestamp: new Date(item.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            originalTimestamp: item.timestamp,
            heart_rate: item.heart_rate || 0,
            skin_temperature: item.skin_temperature || 0,
            spo2: item.spo2 || 0,
            blood_pressure: item.blood_pressure || { systolic: 0, diastolic: 0 },
            mobility: item.mobility || 0,
            ecg: item.ecg || 0,
          })) || [];
          setVitalsData(processedVitalsData);
          if (processedVitalsData.length > 0) {
            const latest = { ...processedVitalsData[0], timestamp: processedVitalsData[0].originalTimestamp };
            setLatestVitals(latest);
            if (isInitialLoad) {
              setLastVitalsTimestamp(latest.timestamp);
            }
          }
          const currentDate = new Date();
          currentDate.setHours(0, 0, 0, 0);
          const futureAppts = appts
            .filter((appt) => {
              const apptDate = new Date(appt.date);
              apptDate.setHours(0, 0, 0, 0);
              return apptDate >= currentDate;
            })
            .slice(0, 5);
          setAppointments(futureAppts || []);
          setAppointmentDates(futureAppts.map((item) => new Date(item.date)) || []);
        } catch (error) {
          toast.error(error.message || "Failed to load data");
          if (error.message.includes("Session expired") || error.message.includes("Authentication")) {
            navigate("/auth/login/doctor");
          }
        } finally {
          setIsVitalsLoading(false);
        }
      };
      fetchData();
      const vitalsCheckInterval = setInterval(async () => {
        try {
          const dataRes = await fetch(`${API_BASE}/iot/my-data/latest?limit=1`, {
            headers: { Authorization: `Bearer ${user.authToken}` },
          });
          if (dataRes.ok) {
            const data = await dataRes.json();
            if (data.data && data.data.length > 0) {
              const latest = {
                ...data.data[0],
                heart_rate: data.data[0].heart_rate || 0,
                skin_temperature: data.data[0].skin_temperature || 0,
                spo2: data.data[0].spo2 || 0,
                blood_pressure: data.data[0].blood_pressure || { systolic: 0, diastolic: 0 },
                mobility: data.data[0].mobility || 0,
                ecg: data.data[0].ecg || 0,
              };
              if (!latestVitals || new Date(latest.timestamp) > new Date(latestVitals.timestamp)) {
                console.log("New vitals data detected via periodic check");
                setLatestVitals(latest);
              }
            }
          }
        } catch (error) {
          console.error("Error checking for vitals updates:", error);
        }
      }, 30000);
      return () => clearInterval(vitalsCheckInterval);
    } else {
      toast.error("Authentication required. Please log in.");
      navigate("/auth/login/doctor");
    }
  }, [isLoading, user, navigate]);

  const fetchWeather = async () => {
    if (!city) {
      setWeatherError("Please enter a city");
      return;
    }
    setWeatherLoading(true);
    try {
      const res = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=f61f3cae880949f083435331252703&q=${city}`
      );
      const data = await res.json();
      if (data.error) {
        setWeatherError(data.error.message);
        setWeather(null);
      } else {
        setWeather(data);
        setWeatherError("");
      }
    } catch {
      setWeatherError("Failed to load weather");
      setWeather(null);
    } finally {
      setWeatherLoading(false);
    }
  };

  const isAppointmentDay = ({ date }) =>
    appointmentDates.some((d) => d.toDateString() === date.toDateString());

  const handleWidgetClick = (vital) => {
    const normalizedKey = vital.toLowerCase().replace(/ /g, "_").replace("body_temperature", "skin_temperature");
    const route = vitalRoutes[normalizedKey];
    if (route) {
      navigate(route);
    } else {
      toast.warn(`No page available for ${vitalDisplayNames[normalizedKey] || vital}`);
    }
  };

  const renderGraph = (vitalKey, vitalDisplayName) => {
    const isBloodPressure = vitalKey === "blood_pressure";
    return (
      <ResponsiveContainer width="100%" height={60}>
        <LineChart data={vitalsData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
          <XAxis dataKey="timestamp" stroke="#2d3748" tick={{ fontSize: 10 }} />
          <YAxis
            stroke="#2d3748"
            tick={{ fontSize: 10 }}
            domain={vitalDomains[vitalKey]}
            unit={vitalUnits[vitalKey]}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(0, 0, 0, 0.8)",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
            }}
            formatter={(value, name) => [
              isBloodPressure ? `${value} mmHg` : value,
              isBloodPressure ? name.replace("blood_pressure.", "") : vitalDisplayName,
            ]}
          />
          {isBloodPressure ? (
            <>
              <Line
                type="monotone"
                dataKey="blood_pressure.systolic"
                stroke={vitalColors["blood_pressure_systolic"]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                name="Systolic"
              />
              <Line
                type="monotone"
                dataKey="blood_pressure.diastolic"
                stroke={vitalColors["blood_pressure_diastolic"]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                name="Diastolic"
              />
            </>
          ) : (
            <Line
              type="monotone"
              dataKey={vitalKey}
              stroke={vitalColors[vitalKey]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              name={vitalDisplayName}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Layout title="Dashboard">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        className="toast-container"
      />
      {loadingTip && <DailyTipLoadingPopup />}
      {showTipPopup && (
        <DailyTipPopup
          tip={dailyTip}
          onClose={() => setShowTipPopup(false)}
          isAutomatic={false}
        />
      )}
      {showAutomaticTipPopup && (
        <DailyTipPopup
          tip={dailyTip}
          onClose={() => setShowAutomaticTipPopup(false)}
          isAutomatic={true}
        />
      )}
      <div className="dashboard-container">
        <header className="dashboard-header glass">
          <div className="welcome-text-container">
            <div className="welcome-text">Welcome, {user?.username || "User"}</div>
          </div>
          <div className="datetime-display">
            <h3>{currentTime.toLocaleTimeString()}</h3>
            <p>{currentTime.toLocaleDateString()}</p>
          </div>
        </header>
        <div className="top-row">
          <section className="weather-square glass">
            <h3>Weather</h3>
            <div className="weather-search-container">
              <input
                className="weather-input"
                placeholder="Search for a city..."
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchWeather()}
              />
              <button className="search-button" onClick={fetchWeather}>Search</button>
            </div>
            {weatherLoading && <p>Loading weather...</p>}
            {weatherError && <p className="error-text">{weatherError}</p>}
            {weather && !weatherError && (
              <div className="weather-info">
                <img
                  src={`https:${weather.current.condition.icon}`}
                  alt={weather.current.condition.text}
                  className="weather-icon"
                />
                <p>
                  {weather.location.name}, {weather.location.country}
                  <br />
                  {weather.current.temp_c}°C, {weather.current.condition.text}
                </p>
              </div>
            )}
          </section>
          <section className="appointments-dailytip-container glass">
            <div className="appointments-column">
              <div className="section-header">
                <Users size={20} />
                <h3>Upcoming Appointments</h3>
              </div>
              <div className="appointments-list">
                {appointments.length === 0 && <p className="no-data">No upcoming appointments</p>}
                {appointments.map((appt) => (
                  <div key={appt._id} className="appt-row">
                    <div className="appt-date">
                      {new Date(appt.date).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <div className="appt-time">{appt.time || "N/A"}</div>
                    <div className="appt-doctor">Dr. {appt.doctor_username}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="daily-tip-column">
              <div className="section-header">
                <Lightbulb size={20} />
                <h3>Daily Health Tip</h3>
                <button
                  className="refresh-btn"
                  onClick={refreshDailyTip}
                  disabled={loadingTip}
                  title="Refresh Daily Tip"
                >
                  <RefreshCw size={16} className={loadingTip ? "spinning" : ""} />
                </button>
              </div>
              <div className="daily-tip-content">
                {loadingTip && <p className="loading-text">Loading daily tip...</p>}
                {tipError && <p className="error-text">{tipError}</p>}
                {!loadingTip && !tipError && (
                  <pre className="daily-tip-text">
                    {dailyTip || "No daily tip available. Make sure your vitals are up to date."}
                  </pre>
                )}
              </div>
            </div>
          </section>
          <div className="calendar-vitals-row">
            <section className="calendar-small glass">
              <div className="section-header">
                <CalendarIcon size={20} />
                <h3>Appointment Calendar</h3>
              </div>
              <Calendar
                tileClassName={({ date }) =>
                  isAppointmentDay({ date }) ? "calendar-highlight" : null
                }
                tileContent={({ date }) =>
                  isAppointmentDay({ date }) ? <span className="calendar-dot">•</span> : null
                }
              />
            </section>
            <section className="vitals-side glass">
              <h3>Your Vitals</h3>
              {isVitalsLoading ? (
                <p>Loading vitals...</p>
              ) : visibleVitals.length === 0 ? (
                <p>No vitals data available</p>
              ) : (
                <div className="vitals-widgets-horizontal">
                  {visibleVitals.map((vital, idx) => {
                    const normalizedKey = vital.toLowerCase().replace(/ /g, "_").replace("body_temperature", "skin_temperature");
                    const displayName = vitalDisplayNames[normalizedKey] || vital;
                    return (
                      <div
                        key={idx}
                        className="widget glass animated-widget"
                        onClick={() => handleWidgetClick(vital)}
                      >
                        <div className="widget-header">
                          <h2>{displayName}</h2>
                          <i className={vitalIcons[displayName] || "fas fa-chart-line"}></i>
                        </div>
                        {renderGraph(normalizedKey, displayName)}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
        <div
          className="ai-companion-icon"
          onClick={() => navigate("/user/ai-companion")}
          title="Go to AI Companion"
        >
          <i className="fas fa-user-md"></i>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;