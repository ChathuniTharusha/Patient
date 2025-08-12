import React from "react";
import { NavLink } from "react-router-dom";
import "../css/VitalSignNav.css"; 

const vitalSigns = [
  { name: "Heart Rate", path: "/user/heart-rate" },
  { name: "SpO2", path: "/user/spo2" }, 
  { name: "Blood Pressure", path: "/user/blood-pressure" },
  { name: "Skin Temperature", path: "/user/skin-temp" },
];

const VitalSignNav = () => {
  return (
    <nav className="vital-sign-nav" aria-label="Vital Signs Navigation">
      <h3>Vital Signs</h3>
      <div className="nav-buttons">
        {vitalSigns.map((sign) => (
          <NavLink
            key={sign.path}
            to={sign.path}
            className={({ isActive }) =>
              `nav-button ${isActive ? "active" : ""}`
            }
          >
            {sign.name}
          </NavLink>
        ))}
        <NavLink
          to="/user/dashboard"
          className={({ isActive }) =>
            `nav-button ${isActive ? "active" : ""}`
          }
        >
          Back to Dashboard
        </NavLink>
      </div>
    </nav>
  );
};

export default VitalSignNav;