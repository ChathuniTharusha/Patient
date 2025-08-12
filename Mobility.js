import React from "react";
import Layout from "../components/Layout";
import "../css/Mobility.css"; 

const Mobility = () => {
  return (
    <Layout title="Mobility Monitor">
      <div className="mobility-page">
        <div className="mobility-container">
          {/* Header Section */}
          <div className="mobility-header">
            <h2>Current Mobility</h2>
            <div className="current-mobility">
              <img src="/assets/mobility.png" alt="Mobility Icon" className="mobility-icon" />
              <span className="mobility-text">8,500 Steps</span>
            </div>
          </div>

          {/* Graph Placeholder */}
          <div className="mobility-graph">
            <p>Mobility trends will appear here soon.</p>
          </div>

          {/* Footer Note */}
          <div className="mobility-footer">
            <p>Real-time data updates coming with backend integration.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Mobility;