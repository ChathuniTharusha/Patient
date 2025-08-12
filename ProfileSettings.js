import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import '../../css/ProfileSettings.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  FaUser,
  FaEnvelope,
  FaCalendar,
  FaVenusMars,
  FaPhone,
  FaMapMarkerAlt,
  FaUserPlus,
  FaTint,
  FaNotesMedical,
  FaPills,
  FaAllergies,
  FaImage,
  FaEdit,
  FaSave,
  FaTrashAlt,
} from 'react-icons/fa';

const API_BASE_URL = 'https://13.60.49.202:8000';

const ProfileSettings = () => {
  const { user, isLoading: authLoading, logout } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [personalData, setPersonalData] = useState({
    full_name: '',
    email: '',
    date_of_birth: '',
    gender: '',
  });
  const [professionalData, setProfessionalData] = useState({
    blood_type: '',
    medical_history: '',
    current_medications: '',
    allergies: '',
  });
  const [contactData, setContactData] = useState({
    contact_phone: '',
    contact_email: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPersonalEditing, setIsPersonalEditing] = useState(false);
  const [isProfessionalEditing, setIsProfessionalEditing] = useState(false);
  const [isContactEditing, setIsContactEditing] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user?.authToken || localStorage.getItem('authToken')) {
      fetchPatientProfile();
    } else {
      setIsLoading(false);
      setError('Please log in to view your profile');
    }
  }, [user, authLoading]);

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not specified';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const handleResponse = async (response) => {
    const responseText = await response.text();
    if (!response.ok) {
      let errorData = JSON.parse(responseText) || { detail: responseText || 'Invalid server response' };
      const errorMsg = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData);
      if (response.status === 401) {
        setError('Session expired. Please log in again.');
        setTimeout(logout, 2000);
      }
      throw new Error(errorMsg);
    }
    return JSON.parse(responseText);
  };

  const fetchPatientProfile = async () => {
    const token = user?.authToken || localStorage.getItem('authToken');
    if (!token) {
      setError('Authentication token missing. Please log in.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/patient/me`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      });
      const data = await handleResponse(response);
      setProfile(data);
      setPersonalData({
        full_name: data.full_name || '',
        email: data.email || '',
        date_of_birth: data.date_of_birth || '',
        gender: data.gender || '',
      });
      setProfessionalData({
        blood_type: data.blood_type || '',
        medical_history: data.medical_history || '',
        current_medications: data.current_medications || '',
        allergies: data.allergies || '',
      });
      setContactData({
        contact_phone: data.contact_info || '',
        contact_email: data.contact_email || '',
        address: data.address || '',
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_phone: data.emergency_contact_phone || '',
      });
    } catch (err) {
      setError(err.message || 'Could not load profile');
      if (err.message.includes('Session expired')) logout();
    } finally {
      setIsLoading(false);
    }
  };

  const updateSection = async (sectionData, sectionName) => {
    setError(null);
    setIsUpdating(true);
    const token = user?.authToken || localStorage.getItem('authToken');
    if (!token) {
      setError('Authentication token missing. Please log in.');
      setIsUpdating(false);
      return;
    }
    const formData = new FormData();
    Object.entries(sectionData).forEach(([key, value]) => {
      if (key !== 'profile_image') formData.append(key === 'contact_phone' ? 'contact_info' : key, value || '');
    });
    if (imageFile && sectionName === 'personal') formData.append('profile_image', imageFile);
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/patient/me`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await handleResponse(response);
      setProfile(data);
      if (sectionName === 'personal') {
        const newImageUrl = data.profile_image ? `${data.profile_image}?t=${Date.now()}` : null;
        setPersonalData({
          full_name: data.full_name || '',
          email: data.email || '',
          date_of_birth: data.date_of_birth || '',
          gender: data.gender || '',
        });
        if (newImageUrl) setImageFile(null);
        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { profileImage: newImageUrl } }));
      } else if (sectionName === 'professional') {
        setProfessionalData({
          blood_type: data.blood_type || '',
          medical_history: data.medical_history || '',
          current_medications: data.current_medications || '',
          allergies: data.allergies || '',
        });
      } else if (sectionName === 'contact') {
        setContactData({
          contact_phone: data.contact_info || '',
          contact_email: data.contact_email || '',
          address: data.address || '',
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_phone: data.emergency_contact_phone || '',
        });
      }
      toast.success(`${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)} updated successfully!`);
    } catch (err) {
      toast.error(err.message || 'Could not update profile');
    } finally {
      setIsUpdating(false);
      if (sectionName === 'personal') setIsPersonalEditing(false);
      else if (sectionName === 'professional') setIsProfessionalEditing(false);
      else if (sectionName === 'contact') setIsContactEditing(false);
    }
  };

  const deleteProfileImage = async () => {
    if (!window.confirm('Are you sure you want to delete your profile image?')) return;
    const token = user?.authToken || localStorage.getItem('authToken');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/image`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
      });
      await handleResponse(response);
      setProfile(prev => ({ ...prev, profile_image: null }));
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { profileImage: null } }));
      toast.success('Profile image deleted!');
    } catch (err) {
      toast.error(err.message || 'Could not delete profile image');
    }
  };

  const validateSection = (sectionData) => {
    if (!sectionData.full_name?.trim()) {
      toast.error('Full name is required');
      return false;
    }
    if (!sectionData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sectionData.email)) {
      toast.error('Valid email is required');
      return false;
    }
    return true;
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }
      setImageFile(file);
    }
  };

  return (
    <Layout title="Profile Settings">
      <div className="profile-settings-container">
        <ToastContainer position="top-right" autoClose={3000} />

        <header className="profile-header">
          <h1 className="page-title">Profile Settings</h1>
          <p className="page-subtitle">Update your personal, medical, and contact information securely.</p>
        </header>

        {authLoading || isLoading ? (
          <div className="loader">Loading profile...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : profile ? (
          <div className="profile-layout">
            {/* Left Column: Profile Card */}
            <div className="profile-sidebar">
              <div className="profile-card">
                <div className="profile-image-wrapper">
                  {profile.profile_image || imageFile ? (
                    <img
                      src={imageFile ? URL.createObjectURL(imageFile) : profile.profile_image}
                      alt="Profile"
                      className="profile-image"
                      onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                    />
                  ) : (
                    <div className="image-placeholder">
                      <FaUser size={32} />
                    </div>
                  )}
                  <label htmlFor="profile-upload" className="edit-image-btn">
                    <FaEdit /> Edit
                  </label>
                  <input
                    id="profile-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="image-upload-input"
                  />
                  {profile.profile_image && (
                    <button className="remove-image-btn" onClick={deleteProfileImage} type="button">
                      <FaTrashAlt /> Remove
                    </button>
                  )}
                </div>

                <div className="profile-info">
                  <h3>{profile.full_name || 'Patient'}</h3>
                  <p className="profile-role">Patient</p>
                  <p className="profile-updated">
                    Last updated: {formatDateTime(profile.updated_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Editable Sections */}
            <div className="profile-forms">
              {/* Personal Info */}
              <section className="profile-section">
                <div className="section-header">
                  <h3>
                    <FaUser /> Personal Information
                  </h3>
                  {!isPersonalEditing && (
                    <button className="edit-btn" onClick={() => setIsPersonalEditing(true)}>
                      <FaEdit /> Edit
                    </button>
                  )}
                </div>

                {!isPersonalEditing ? (
                  <div className="info-grid">
                    <div className="info-item">
                      <strong>Full Name</strong>
                      <span>{personalData.full_name || 'Not specified'}</span>
                    </div>
                    <div className="info-item">
                      <strong>Email</strong>
                      <span>{personalData.email || 'Not specified'}</span>
                    </div>
                    <div className="info-item">
                      <strong>Date of Birth</strong>
                      <span>{formatDateTime(personalData.date_of_birth)}</span>
                    </div>
                    <div className="info-item">
                      <strong>Gender</strong>
                      <span>{personalData.gender || 'Not specified'}</span>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); if (validateSection(personalData)) updateSection(personalData, 'personal'); }}>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Full Name *</label>
                        <input
                          type="text"
                          value={personalData.full_name}
                          onChange={(e) => setPersonalData({ ...personalData, full_name: e.target.value })}
                          placeholder="e.g., John Doe"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Email *</label>
                        <input
                          type="email"
                          value={personalData.email}
                          onChange={(e) => setPersonalData({ ...personalData, email: e.target.value })}
                          placeholder="e.g., patient@example.com"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Date of Birth</label>
                        <input
                          type="text"
                          value={personalData.date_of_birth}
                          onChange={(e) => setPersonalData({ ...personalData, date_of_birth: e.target.value })}
                          placeholder="e.g., 5th June 2000"
                        />
                      </div>
                      <div className="form-group">
                        <label>Gender</label>
                        <select
                          value={personalData.gender}
                          onChange={(e) => setPersonalData({ ...personalData, gender: e.target.value })}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" disabled={isUpdating}>
                        {isUpdating ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button type="button" onClick={() => setIsPersonalEditing(false)} disabled={isUpdating}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </section>

              {/* Medical Info */}
              <section className="profile-section">
                <div className="section-header">
                  <h3>
                    <FaNotesMedical /> Medical Information
                  </h3>
                  {!isProfessionalEditing && (
                    <button className="edit-btn" onClick={() => setIsProfessionalEditing(true)}>
                      <FaEdit /> Edit
                    </button>
                  )}
                </div>

                {!isProfessionalEditing ? (
                  <div className="info-grid">
                    <div className="info-item">
                      <strong>Blood Type</strong>
                      <span>{professionalData.blood_type || 'Not specified'}</span>
                    </div>
                    <div className="info-item">
                      <strong>Medical History</strong>
                      <span>{professionalData.medical_history || 'Not specified'}</span>
                    </div>
                    <div className="info-item">
                      <strong>Current Medications</strong>
                      <span>{professionalData.current_medications || 'Not specified'}</span>
                    </div>
                    <div className="info-item">
                      <strong>Allergies</strong>
                      <span>{professionalData.allergies || 'Not specified'}</span>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); updateSection(professionalData, 'professional'); }}>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Blood Type</label>
                        <select
                          value={professionalData.blood_type}
                          onChange={(e) => setProfessionalData({ ...professionalData, blood_type: e.target.value })}
                        >
                          <option value="">Select Blood Type</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Medical History</label>
                        <textarea
                          value={professionalData.medical_history}
                          onChange={(e) => setProfessionalData({ ...professionalData, medical_history: e.target.value })}
                          placeholder="e.g., Hypertension, Diabetes"
                          rows="3"
                        />
                      </div>
                      <div className="form-group">
                        <label>Current Medications</label>
                        <textarea
                          value={professionalData.current_medications}
                          onChange={(e) => setProfessionalData({ ...professionalData, current_medications: e.target.value })}
                          placeholder="e.g., Metformin, Lisinopril"
                          rows="3"
                        />
                      </div>
                      <div className="form-group">
                        <label>Allergies</label>
                        <textarea
                          value={professionalData.allergies}
                          onChange={(e) => setProfessionalData({ ...professionalData, allergies: e.target.value })}
                          placeholder="e.g., Penicillin, Peanuts"
                          rows="3"
                        />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" disabled={isUpdating}>
                        {isUpdating ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button type="button" onClick={() => setIsProfessionalEditing(false)} disabled={isUpdating}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </section>

              {/* Contact Info */}
              <section className="profile-section">
                <div className="section-header">
                  <h3>
                    <FaPhone /> Contact Information
                  </h3>
                  {!isContactEditing && (
                    <button className="edit-btn" onClick={() => setIsContactEditing(true)}>
                      <FaEdit /> Edit
                    </button>
                  )}
                </div>

                {!isContactEditing ? (
                  <div className="info-grid">
                    <div className="info-item">
                      <strong>Contact Phone</strong>
                      <span>{contactData.contact_phone || 'Not specified'}</span>
                    </div>
                    <div className="info-item">
                      <strong>Contact Email</strong>
                      <span>{contactData.contact_email || 'Not specified'}</span>
                    </div>
                    <div className="info-item">
                      <strong>Address</strong>
                      <span>{contactData.address || 'Not specified'}</span>
                    </div>
                    <div className="info-item">
                      <strong>Emergency Contact</strong>
                      <span>{contactData.emergency_contact_name || 'Not specified'}</span>
                    </div>
                    <div className="info-item">
                      <strong>Emergency Phone</strong>
                      <span>{contactData.emergency_contact_phone || 'Not specified'}</span>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); updateSection(contactData, 'contact'); }}>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Contact Phone</label>
                        <input
                          type="text"
                          value={contactData.contact_phone}
                          onChange={(e) => setContactData({ ...contactData, contact_phone: e.target.value })}
                          placeholder="e.g., +1234567890"
                        />
                      </div>
                      <div className="form-group">
                        <label>Contact Email</label>
                        <input
                          type="email"
                          value={contactData.contact_email}
                          onChange={(e) => setContactData({ ...contactData, contact_email: e.target.value })}
                          placeholder="e.g., contact@example.com"
                        />
                      </div>
                      <div className="form-group">
                        <label>Address</label>
                        <textarea
                          value={contactData.address}
                          onChange={(e) => setContactData({ ...contactData, address: e.target.value })}
                          placeholder="e.g., 123 Main St, City, Country"
                          rows="3"
                        />
                      </div>
                      <div className="form-group">
                        <label>Emergency Contact Name</label>
                        <input
                          type="text"
                          value={contactData.emergency_contact_name}
                          onChange={(e) => setContactData({ ...contactData, emergency_contact_name: e.target.value })}
                          placeholder="e.g., Jane Doe"
                        />
                      </div>
                      <div className="form-group">
                        <label>Emergency Contact Phone</label>
                        <input
                          type="text"
                          value={contactData.emergency_contact_phone}
                          onChange={(e) => setContactData({ ...contactData, emergency_contact_phone: e.target.value })}
                          placeholder="e.g., +1234567890"
                        />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" disabled={isUpdating}>
                        {isUpdating ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button type="button" onClick={() => setIsContactEditing(false)} disabled={isUpdating}>
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </section>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
};

export default ProfileSettings;