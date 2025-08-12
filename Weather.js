import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloudSun, faSearch } from "@fortawesome/free-solid-svg-icons";
import Layout from "../../components/Layout";
import "../../css/Weather.css";

const Weather = () => {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const API_KEY = "f61f3cae880949f083435331252703"; // Replace with your actual key

  const fetchWeather = async (cityName) => {
    if (!cityName || cityName.trim() === "") {
      setError("Please enter a valid city name.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Fetch current weather
      const currentResponse = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${encodeURIComponent(cityName)}`
      );
      if (!currentResponse.ok) {
        throw new Error("Could not fetch current weather");
      }
      const currentData = await currentResponse.json();
      setWeather(currentData);

      // Fetch 3-day forecast
      const forecastResponse = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${encodeURIComponent(cityName)}&days=3`
      );
      if (!forecastResponse.ok) {
        throw new Error("Could not fetch forecast");
      }
      const forecastData = await forecastResponse.json();
      setForecast(forecastData.forecast.forecastday);
    } catch (err) {
      setError(err.message || "Could not load weather data. Please try again.");
      setWeather(null);
      setForecast(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Weather Forecast">
      <div className="weather-page">
        <div className="page-layout">
          {/* Top Containers */}
          <div className="top-containers">
            {/* Search Container */}
            <div className="weather-search-container">
              <h2 className="weather-page-title">Weather Forecast</h2>
              <div className="weather-search-box">
                <FontAwesomeIcon icon={faSearch} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search city..."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && fetchWeather(city)}
                />
                <button onClick={() => fetchWeather(city)} disabled={loading}>
                  {loading ? "Searching..." : "Search"}
                </button>
              </div>
              {error && <p className="weather-error-text">{error}</p>}
            </div>

            {/* Current Weather Container */}
            {weather && !loading && (
              <div className="weather-container">
                <div className="weather-card current-weather">
                  <h3>
                    {weather.location.name}, {weather.location.country}
                  </h3>
                  <div className="weather-info">
                    <img
                      src={weather.current.condition.icon}
                      alt="Weather Icon"
                      className="current-weather-icon"
                    />
                    <div className="weather-details">
                      <p className="temperature">
                        {weather.current.temp_c}°C
                      </p>
                      <p className="condition">
                        {weather.current.condition.text}
                      </p>
                      <p>Humidity: {weather.current.humidity}%</p>
                      <p>Wind: {weather.current.wind_kph} kph</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Forecast Container */}
          {forecast && !loading && (
            <div className="forecast-container">
              <h3 className="forecast-title">3-Day Forecast</h3>
              <div className="forecast-grid">
                {forecast.map((day, index) => (
                  <div key={index} className="forecast-card">
                    <p className="forecast-date">
                      {new Date(day.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <img
                      src={day.day.condition.icon}
                      alt="Forecast Icon"
                      className="forecast-icon"
                    />
                    <p className="forecast-temp">
                      {day.day.avgtemp_c}°C
                    </p>
                    <p className="forecast-condition">
                      {day.day.condition.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && <div className="loading-spinner">Loading...</div>}
        </div>
      </div>
    </Layout>
  );
};

export default Weather;