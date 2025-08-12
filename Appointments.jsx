import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../../css/Appointments.css';
import { FaUserMd } from 'react-icons/fa';
import { motion } from 'framer-motion';

const Appointments = () => {
  const { user, isLoading: authLoading } = useContext(AuthContext);
  const [appointments, setAppointments] = useState([]);
  const [pastAppointments, setPastAppointments] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);

  const [availabilityDate, setAvailabilityDate] = useState('');
  const [availability, setAvailability] = useState([]);
  const [formData, setFormData] = useState({
    doctor_username: '',
    date: '',
    time: '',
    reason: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasCheckedAvailability, setHasCheckedAvailability] = useState(false);

  const authToken = user?.authToken;
  const patientUsername = user?.username || '';
  const API_BASE_URL = 'https://13.60.49.202:8000/api';

  const fetchAppointments = async () => {
    if (!authToken) {
      setError('Please log in to view appointments');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/appointments/patient`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Cache-Control': 'no-cache',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch appointments');
      const data = await response.json();

      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);

      // Filter past, today, upcoming appointments
      const past = [];
      const today = [];
      const upcoming = [];

      data.forEach((appt) => {
        const apptDate = new Date(appt.date);
        apptDate.setHours(0, 0, 0, 0);
        if (appt.patient_username.toLowerCase() !== patientUsername.toLowerCase()) return;

        if (apptDate.getTime() < todayDate.getTime()) {
          past.push(appt);
        } else if (apptDate.getTime() === todayDate.getTime()) {
          today.push(appt);
        } else {
          upcoming.push(appt);
        }
      });

      setAppointments(data);
      setPastAppointments(past);
      setTodayAppointments(today);
      setUpcomingAppointments(upcoming);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError('Could not load appointments');
      toast.error('Could not load appointments');
    }
  };

  const fetchAvailability = async (date) => {
    if (!date) {
      toast.error('Please select a date');
      return;
    }
    setAvailability([]);
    setHasCheckedAvailability(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/appointments/availability?start_date=${date}&end_date=${date}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Cache-Control': 'no-cache',
          },
        }
      );
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to fetch availability');
      }
      const data = await response.json();

      const slots = data
        .filter((slot) => slot.available)
        .map((slot) => ({
          ...slot,
          profile_image: slot.profile_image
            ? slot.profile_image.startsWith('http')
              ? `${slot.profile_image}?t=${new Date().getTime()}`
              : `${API_BASE_URL}${slot.profile_image}?t=${new Date().getTime()}`
            : '',
        }));

      setAvailability(slots);
    } catch (err) {
      console.error('Error fetching availability:', err);
      setError(err.message);
      toast.error(err.message);
    }
  };

  const selectSlot = (slot) => {
    setFormData({
      doctor_username: slot.doctor_username,
      date: slot.date,
      time: slot.time,
      reason: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!authToken) {
      setError('Please log in to book an appointment');
      toast.error('Please log in to book an appointment');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/appointments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({
          doctor_username: formData.doctor_username,
          patient_username: patientUsername,
          date: formData.date,
          time: formData.time,
          reason: formData.reason,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to book appointment');
      }

      setSuccess('Appointment scheduled successfully');
      toast.success('Appointment scheduled successfully');
      setFormData({ doctor_username: '', date: '', time: '', reason: '' });
      fetchAppointments();
    } catch (err) {
      console.error('Error booking appointment:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authToken && !authLoading) fetchAppointments();
  }, [authToken, authLoading]);

  const today = new Date().toISOString().split('T')[0];

  return (
    <Layout title="Patient Appointments">
      <>
        <h2 className="page-title">Patient Appointments</h2>
        <div className="appointments-wrapper">
          <ToastContainer />

          <div className="appointments-section today">
            <h3>Today's Appointments</h3>
            {todayAppointments.length === 0 ? (
              <p className="no-appointments">No appointments today.</p>
            ) : (
              <div className="appointments-grid">
                {todayAppointments.map((appt) => (
                  <motion.div
                    key={appt._id}
                    className="appointment-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p><strong>Doctor:</strong> {appt.doctor_username}</p>
                    <p>🩺 <strong>Doctor:</strong> {appt.doctor_username}</p>
                    <p>⏰ <strong>Time:</strong> {appt.time}</p>
                    <p><strong>Status:</strong> {appt.status}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="appointments-section form">
            <h3>Book an Appointment</h3>
            <form onSubmit={handleSubmit} className="form-grid">
              <input
                type="text"
                placeholder="Doctor Username"
                value={formData.doctor_username}
                onChange={(e) => setFormData({ ...formData, doctor_username: e.target.value })}
                required
              />
              <input
                type="date"
                min={today}
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
              />
              <textarea
                placeholder="Reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Scheduling...' : 'Schedule Appointment'}
              </button>
            </form>
          </div>

          <div className="appointments-section upcoming">
            <h3>Upcoming Appointments</h3>
            {upcomingAppointments.length === 0 ? (
              <p className="no-appointments">No upcoming appointments.</p>
            ) : (
              <div className="appointments-grid">
                {upcomingAppointments.map((appt) => (
                  <motion.div
                    key={appt._id}
                    className="appointment-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p>🩺 <strong>Doctor:</strong> {appt.doctor_username}</p>
                    <p>⏰ <strong>Date:</strong> {appt.date.split('T')[0]}</p>
                    <p>⏰ <strong>Time:</strong> {appt.time}</p>
                    <p><strong>Status:</strong> {appt.status}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="appointments-section past">
            <h3>Past Appointments</h3>
            {pastAppointments.length === 0 ? (
              <p className="no-appointments">No past appointments found.</p>
            ) : (
              <table className="past-appointments-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Doctor</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pastAppointments.map((appt) => (
                    <tr key={appt._id}>
                      <td>{appt.date.split('T')[0]}</td>
                      <td>{appt.doctor_username}</td>
                      <td>{appt.time}</td>
                      <td>{appt.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </>
    </Layout>
  );
};

export default Appointments;
