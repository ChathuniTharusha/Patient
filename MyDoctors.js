import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../../css/MyDoctors.css';
import { FaUserMd } from 'react-icons/fa';
import Layout from '../../components/Layout';

const MyDoctors = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [specialization, setSpecialization] = useState('');
  const authToken = user?.authToken;
  const MAX_DOCTORS = 4;
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://13.60.49.202:8000';

  const DoctorSkeleton = () => (
    <div className="doctor-card">
      <div className="image-placeholder" />
      <div className="doctor-info">
        <div style={{ height: '20px', background: '#e0e0e0', width: '80%', margin: '8px auto' }} />
        <div style={{ height: '16px', background: '#e0e0e0', width: '60%', margin: '8px auto' }} />
      </div>
      <div style={{ height: '40px', background: '#e0e0e0', width: '100%', borderRadius: 'var(--border-radius)' }} />
    </div>
  );

  const fetchDoctors = async (query = '', spec = '') => {
    setIsLoading(true);
    setError(null);
    try {
      let url = `${API_BASE_URL}/api/profile/doctors?limit=${MAX_DOCTORS}&skip=0`;
      if (query.trim() || spec.trim()) {
        url = `${API_BASE_URL}/api/profile/doctors/search`;
        const params = new URLSearchParams();
        if (query.trim()) params.append('q', query.trim());
        if (spec.trim()) params.append('specialization', spec.trim());
        url += `?${params.toString()}&limit=${MAX_DOCTORS}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken ? `Bearer ${authToken}` : '',
        },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || `HTTP ${response.status}: Failed to fetch doctors`);
      }

      const data = await response.json();
      if (!data.doctors || !Array.isArray(data.doctors)) {
        throw new Error('Invalid response: doctors array missing');
      }

      const doctorsWithImages = data.doctors.map(doctor => ({
        ...doctor,
        profile_image: doctor.profile_image
          ? doctor.profile_image.startsWith('http')
            ? `${doctor.profile_image}?t=${new Date().getTime()}`
            : `${API_BASE_URL}${doctor.profile_image}?t=${new Date().getTime()}`
          : '',
      }));
      setDoctors(doctorsWithImages);

      if (data.doctors.length === 0) {
        toast.warn(query || spec ? 'No doctors found for your search. Showing all doctors.' : 'No doctors available.');
        if (query || spec) await fetchDoctors('', '');
      }
    } catch (err) {
      setError(err.message || 'Failed to load doctors.');
      toast.error(err.message || 'Failed to load doctors.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authToken) {
      setError('Please log in to view doctors.');
      setIsLoading(false);
      toast.error('Please log in to continue.');
      navigate('/login');
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      fetchDoctors(searchQuery, specialization);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [authToken, searchQuery, specialization, navigate]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim() && !specialization.trim()) {
      toast.warn('Please enter a name or specialization.');
      return;
    }
    fetchDoctors(searchQuery, specialization);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSpecialization('');
    fetchDoctors('', '');
  };

  const handleBookAppointment = (doctorUsername) => {
    if (!authToken) {
      toast.error('Please log in to book an appointment.');
      navigate('/login');
      return;
    }
    if (!doctorUsername) {
      toast.error('Invalid doctor selected.');
      return;
    }
    navigate('/user/appointments', { state: { doctor_username: doctorUsername } });
  };

  return (
    <Layout title="My Doctors">
      <div className="mydoc-container">
        <ToastContainer />
        <h2 className="page-title">Find Your Doctor</h2>

        {/* Search Section */}
        <div className="search-container">
          <form onSubmit={handleSearch} className="doctors-search-form">
            <div className="doctors-form-group">
              <label htmlFor="searchQuery">Search by Name</label>
              <input
                type="text"
                id="searchQuery"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., Dr. Smith"
                className="doctors-search-input"
                aria-label="Search doctors by name"
              />
            </div>
            <div className="doctors-form-group">
              <label htmlFor="specialization">Specialization</label>
              <input
                type="text"
                id="specialization"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="e.g., Cardiology"
                className="doctors-search-input"
                aria-label="Search doctors by specialization"
              />
            </div>
            <div className="doctors-search-buttons">
              <button type="submit" className="doctors-search-button" aria-label="Search doctors">Search</button>
              <button type="button" className="doctors-clear-button" onClick={handleClearSearch} aria-label="Clear search">Clear</button>
            </div>
          </form>
        </div>

        {/* Doctors List Section */}
        <div className="doctors-container">
          <h3 className="section-title">Your Doctors</h3>
          {isLoading ? (
            <div className="doctor-grid">
              {Array.from({ length: MAX_DOCTORS }).map((_, index) => (
                <DoctorSkeleton key={index} />
              ))}
            </div>
          ) : error ? (
            <p className="error-text">{error}</p>
          ) : doctors.length > 0 ? (
            <div className="doctor-grid">
              {doctors.map((doctor) => (
                <div key={doctor.username} className="doctor-card">
                  {doctor.profile_image ? (
                    <img
                      src={doctor.profile_image}
                      alt={doctor.full_name}
                      className="doctor-image"
                      onError={(e) => {
                        e.target.src = '/placeholder-image.jpg';
                      }}
                    />
                  ) : (
                    <div className="image-placeholder" aria-label="No doctor image available">
                      <FaUserMd size={24} />
                      <span>No Image</span>
                    </div>
                  )}
                  <div className="doctor-info">
                    <span className="doctor-name"><strong>{doctor.full_name}</strong></span>
                    <span className="doctor-specialization">{doctor.specialization}</span>
                  </div>
                  <button
                    className="action-btn"
                    onClick={() => handleBookAppointment(doctor.username)}
                    aria-label={`Book appointment with ${doctor.full_name}`}
                  >
                    Book Appointment
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No doctors found.</p>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default MyDoctors;