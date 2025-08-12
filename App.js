import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PatientLogin from "./pages/patient/Login";
import PatientSignup from "./pages/patient/SignUp";
import Dashboard from "./components/dashboard";
import HeartRate from "./vital signs/HeartRate";
import SpO2 from "./vital signs/SpO2";
import BloodPressure from "./vital signs/BloodPressure";
import SkinTemperature from "./vital signs/SkinTemperature";
import Mobility from "./vital signs/Mobility";
import ECG from "./vital signs/ECG";
import Layout from "./components/Layout";
import PrivateRoute from "./components/ProtectedRoute";
import Weather from "./pages/patient/Weather";
import { Notifications, NotificationPopup } from "./pages/patient/Notifications"; 
import ChatWindow from "./pages/patient/ChatWindow";
import Appointments from "./pages/patient/Appointments";
import ClinicalRecords from "./pages/patient/ClinicalRecords";
import ForgotPassword from "../src/pages/ForgotPassword"; 
import ClinicalUnits from "./pages/patient/ClinicalUnits";
import ProfileSettings from "./pages/patient/ProfileSettings";
import AICompanion from "./pages/patient/AICompanion"; // ✅ Import AI Companion
import RealtimeBP from "./vital signs/RealtimeBP"; 
import RealtimeHeartRate from "./vital signs/RealtimeHeartRate";
import RealtimeSkinTemp from "./vital signs/RealtimeSkinTemp";
import RealtimeSpO2 from "./vital signs/RealtimeSpO2";


import 'normalize.css';

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <NotificationPopup /> {/* Global notification popup */}
        <Routes>
          <Route path="/" element={<Navigate to="/user/login" replace />} />
          <Route path="/user/login" element={<PatientLogin />} />
          <Route path="/user/signup" element={<PatientSignup />} />
          <Route path="/user/forgot-password" element={<ForgotPassword />} />
          
          <Route
            path="/user"
            element={
              <PrivateRoute>
                <Layout title="Dashboard" />
              </PrivateRoute>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="heart-rate" element={<HeartRate />} />
            <Route path="spo2" element={<SpO2 />} />
            <Route path="blood-pressure" element={<BloodPressure />} />
            <Route path="skin-temp" element={<SkinTemperature />} />
            <Route path="mobility" element={<Mobility />} />
            <Route path="ecg" element={<ECG />} />
            <Route path="weather" element={<Weather />} />
            <Route path="profile-settings" element={<ProfileSettings />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="chatwindow" element={<ChatWindow />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="clinical-records" element={<ClinicalRecords />} />
            <Route path="clinical-units" element={<ClinicalUnits />} />
            <Route path="ai-companion" element={<AICompanion />} /> {/* ✅ New AI Companion route */}
            <Route path= "realtime-bp" element={<RealtimeBP />} />
            <Route path="realtime-heartrate" element={<RealtimeHeartRate />} />
            <Route path="realtime-skintemp" element={<RealtimeSkinTemp />} />
            <Route path="realtime-spo2" element={<RealtimeSpO2 />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
