import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Layout from "../../components/Layout";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserMd, faUserPlus } from "@fortawesome/free-solid-svg-icons";
import "../../css/ClinicalUnits.css";

const API_BASE = "https://13.60.49.202:8000";

const ClinicalUnits = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [availableUnits, setAvailableUnits] = useState([]);
  const [myUnits, setMyUnits] = useState([]);
  const [assignedDoctors, setAssignedDoctors] = useState([]);
  const [isUnitsLoading, setIsUnitsLoading] = useState(false);
  const [isJoinLoading, setIsJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [isInitialRender, setIsInitialRender] = useState(true);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState({ unit_name: "", organization_name: "" });

  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current += 1;
    console.log(`ClinicalUnits render count: ${renderCount.current}`);
  });

  useEffect(() => {
    if (!isLoading && user?.authToken) {
      const fetchData = async () => {
        try {
          setIsUnitsLoading(true);
          const [availableRes, myUnitsRes, doctorsRes] = await Promise.all([
            axios.get(`${API_BASE}/api/patient/clinical-units`, {
              headers: { Authorization: `Bearer ${user.authToken}` },
            }),
            axios.get(`${API_BASE}/api/patient/my-clinical-units`, {
              headers: { Authorization: `Bearer ${user.authToken}` },
            }),
            axios.get(`${API_BASE}/api/patient/assigned-doctors`, {
              headers: { Authorization: `Bearer ${user.authToken}` },
            }),
          ]);

          console.log("Available Units Response:", availableRes.data);
          console.log("My Units Response:", myUnitsRes.data);
          console.log("Assigned Doctors Response:", doctorsRes.data);

          // Transform myUnits to match expected structure
          const transformedMyUnits = Array.isArray(myUnitsRes.data?.my_units)
            ? myUnitsRes.data.my_units.map(unit => ({
                unit_id: unit.unit_id,
                unit_name: unit.unit_name,
                organization_name: unit.organization_name,
                doctor_usernames: Array.isArray(unit.doctors)
                  ? unit.doctors.map(doc => doc.username)
                  : [],
                created_at: unit.joined_at || unit.created_at,
              }))
            : [];

          // Transform assignedDoctors to keep full objects
          const transformedDoctors = Array.isArray(doctorsRes.data?.assigned_doctors)
            ? doctorsRes.data.assigned_doctors
            : [];

          setAvailableUnits(Array.isArray(availableRes.data) ? availableRes.data : []);
          setMyUnits(transformedMyUnits);
          setAssignedDoctors(transformedDoctors);
        } catch (error) {
          const message = error.response?.data?.detail || "Failed to load clinical units data";
          console.error("Fetch error:", message);
          toast.error(message);
        } finally {
          setIsUnitsLoading(false);
          setIsInitialRender(false);
        }
      };

      fetchData();
    }
  }, [isLoading, user]);

  const handleOpenJoinDialog = (unit) => {
    setSelectedUnit({
      unit_name: unit.unit_name,
      organization_name: unit.organization_name,
    });
    setJoinError("");
    setShowJoinDialog(true);
  };

  const handleCloseJoinDialog = () => {
    setShowJoinDialog(false);
    setSelectedUnit({ unit_name: "", organization_name: "" });
  };

  const handleJoinRequest = async () => {
    if (!selectedUnit.unit_name || !selectedUnit.organization_name) {
      setJoinError("Unit name and organization name are required.");
      toast.error("⚠️ Unit name and organization name are required.");
      return;
    }

    setIsJoinLoading(true);
    setJoinError("");

    try {
      const response = await axios.post(
        `${API_BASE}/api/patient/clinical-units/request-join`,
        {
          unit_name: selectedUnit.unit_name,
          organization_name: selectedUnit.organization_name,
          patient_username: user.username,
        },
        {
          headers: { Authorization: `Bearer ${user.authToken}` },
        }
      );

      console.log("Join request response:", response.data);
      toast.success("✅ Join request sent successfully!");
      handleCloseJoinDialog();

      // Refresh my units
      const myUnitsRes = await axios.get(`${API_BASE}/api/patient/my-clinical-units`, {
        headers: { Authorization: `Bearer ${user.authToken}` },
      });
      console.log("Refreshed My Units Response:", myUnitsRes.data);

      // Transform refreshed myUnits
      const transformedMyUnits = Array.isArray(myUnitsRes.data?.my_units)
        ? myUnitsRes.data.my_units.map(unit => ({
            unit_id: unit.unit_id,
            unit_name: unit.unit_name,
            organization_name: unit.organization_name,
            doctor_usernames: Array.isArray(unit.doctors)
              ? unit.doctors.map(doc => doc.username)
              : [],
            created_at: unit.joined_at || unit.created_at,
          }))
        : [];
      setMyUnits(transformedMyUnits);
    } catch (error) {
      const detail = error.response?.data?.detail;
      const message = typeof detail === "string" ? detail : "Failed to send join request.";
      setJoinError(message);
      toast.error(`❌ ${message}`);
    } finally {
      setIsJoinLoading(false);
    }
  };

  return (
    <Layout title="Clinical Units">
      <ToastContainer />
      <div className="clinical-units-container">
        <h2 className="page-title">Clinical Units</h2>

        <div className="top-row">
          <section className="my-units-card">
            <h3>My Clinical Units</h3>
            <div className="units-table-container">
              {isUnitsLoading ? (
                <p>Loading my units...</p>
              ) : myUnits.length === 0 ? (
                <p>You are not part of any units.</p>
              ) : (
                <table className="units-table">
                  <thead>
                    <tr>
                      <th>Unit Name</th>
                      <th>Organization</th>
                      <th>Doctors</th>
                      <th>Date Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myUnits.map((unit) => (
                      <tr key={unit.unit_id} className={isInitialRender ? "animated-unit" : ""}>
                        <td>{unit.unit_name}</td>
                        <td>{unit.organization_name}</td>
                        <td>
                          {unit.doctor_usernames.length > 0
                            ? unit.doctor_usernames.join(", ")
                            : "No doctors assigned"}
                        </td>
                        <td>{new Date(unit.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>

        <div className="bottom-row">
          <section className="available-units-card">
            <h3>Available Clinical Units</h3>
            <div className="units-table-container">
              {isUnitsLoading ? (
                <p>Loading units...</p>
              ) : availableUnits.length === 0 ? (
                <p>No available units found.</p>
              ) : (
                <table className="units-table">
                  <thead>
                    <tr>
                      <th>Unit Name</th>
                      <th>Organization</th>
                      <th>Date Created</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableUnits.map((unit) => (
                      <tr key={unit.unit_id} className={isInitialRender ? "animated-unit" : ""}>
                        <td>{unit.unit_name}</td>
                        <td>{unit.organization_name}</td>
                        <td>{new Date(unit.created_at).toLocaleDateString()}</td>
                        <td>
                          <button
                            className="action-btn join-btn"
                            onClick={() => handleOpenJoinDialog(unit)}
                            disabled={isJoinLoading}
                          >
                            Join
                            <FontAwesomeIcon icon={faUserPlus} className="button-icon" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="doctors-card">
            <h3>Assigned Doctors</h3>
            <div className="doctor-grid">
              {isUnitsLoading ? (
                <p>Loading doctors...</p>
              ) : assignedDoctors.length === 0 ? (
                <p>No doctors assigned.</p>
              ) : (
                assignedDoctors.map((doctor, idx) => (
                  <div key={idx} className={`doctor-card ${isInitialRender ? "animated-unit" : ""}`}>
                    <div className="doctor-icon-placeholder">
                      <FontAwesomeIcon icon={faUserMd} size="2x" />
                    </div>
                    <div className="doctor-info">
                      <span className="doctor-name"><strong>{doctor.username}</strong></span>
                      <span className="doctor-email">{doctor.email}</span>
                      <span className="doctor-speciality">{doctor.speciality}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {showJoinDialog && (
          <div className="dialog-overlay">
            <div className="dialog-box">
              <h3>Join Clinical Unit</h3>
              <div className="dialog-form">
                <div className="input-wrapper">
                  <label>Unit Name</label>
                  <input
                    type="text"
                    value={selectedUnit.unit_name}
                    readOnly
                    className="unit-input dialog-input"
                  />
                </div>
                <div className="input-wrapper">
                  <label>Organization Name</label>
                  <input
                    type="text"
                    value={selectedUnit.organization_name}
                    readOnly
                    className="unit-input dialog-input"
                  />
                </div>
                {joinError && <p className="error-text">{joinError}</p>}
                <div className="dialog-buttons">
                  <button
                    className="action-btn"
                    onClick={handleJoinRequest}
                    disabled={isJoinLoading}
                  >
                    {isJoinLoading ? "Submitting..." : "Request"}
                  </button>
                  <button
                    className="action-btn cancel-btn"
                    onClick={handleCloseJoinDialog}
                    disabled={isJoinLoading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ClinicalUnits;