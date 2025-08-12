import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import '../../css/ClinicalRecords.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faTimes, faVial, faPaperPlane, faUpload, faFileMedical, faArrowRight } from '@fortawesome/free-solid-svg-icons';

const ClinicalRecords = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [medicalReports, setMedicalReports] = useState([]);
  const [clinicalDocuments, setClinicalDocuments] = useState([]);
  const [error, setError] = useState(null);
  const [referralError, setReferralError] = useState(null);
  const [referralSuccess, setReferralSuccess] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isLoading, setIsLoading] = useState({ reports: false, documents: false });
  const [referralForm, setReferralForm] = useState({
    new_organization_name: '',
    private_doctor_name: '',
    reason: ''
  });
  const [uploadForm, setUploadForm] = useState({
    file: null,
    notes: ''
  });

  const baseUrl = 'https://13.60.49.202:8000';

  // Fetch medical reports
  const fetchMedicalReports = async () => {
    if (!user?.authToken || !user?.username) {
      setError('Authentication required. Please log in.');
      navigate('/auth/login/doctor');
      return;
    }

    setIsLoading(prev => ({ ...prev, reports: true }));
    setError(null);

    try {
      const res = await fetch(`${baseUrl}/api/medical-reports/patient`, {
        headers: {
          'Authorization': `Bearer ${user.authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        let errorMessage = 'Failed to load medical reports';
        if (res.status === 401) {
          errorMessage = 'Session expired. Please log in again.';
          logout();
          navigate('/auth/login/doctor');
        } else if (res.status === 403) {
          errorMessage = 'Access denied. Insufficient permissions.';
        } else if (res.status === 404) {
          errorMessage = 'Medical reports not found.';
        } else {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await res.json();
      setMedicalReports(result.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load medical reports');
    } finally {
      setIsLoading(prev => ({ ...prev, reports: false }));
    }
  };

  // Fetch clinical history (documents)
  const fetchClinicalDocuments = async () => {
    if (!user?.authToken || !user?.username) {
      setError('Authentication required. Please log in.');
      navigate('/auth/login/doctor');
      return;
    }

    setIsLoading(prev => ({ ...prev, documents: true }));
    setError(null);

    try {
      const res = await fetch(`${baseUrl}/api/profile/patient/clinical-history`, {
        headers: {
          'Authorization': `Bearer ${user.authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        let errorMessage = 'Failed to load clinical documents';
        if (res.status === 401) {
          errorMessage = 'Session expired. Please log in again.';
          logout();
          navigate('/auth/login/doctor');
        } else if (res.status === 403) {
          errorMessage = 'Access denied. Insufficient permissions.';
        } else if (res.status === 404) {
          errorMessage = 'Clinical documents not found.';
        } else {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await res.json();
      setClinicalDocuments(result.clinical_documents || []);
    } catch (err) {
      setError(err.message || 'Failed to load clinical documents');
    } finally {
      setIsLoading(prev => ({ ...prev, documents: false }));
    }
  };

  // Handle referral form submission
  const handleReferralSubmit = async (e) => {
    e.preventDefault();
    if (!user?.authToken) {
      setReferralError('Please log in to submit a referral request');
      return;
    }

    setReferralError(null);
    setReferralSuccess(null);

    try {
      const res = await fetch(`${baseUrl}/api/patient/referral/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(referralForm),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to submit referral request');
      }

      setReferralSuccess('Referral request submitted successfully');
      setReferralForm({
        new_organization_name: '',
        private_doctor_name: '',
        reason: ''
      });
    } catch (err) {
      setReferralError(err.message || 'Failed to submit referral request');
    }
  };

  // Handle upload form submission
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!user?.authToken) {
      setUploadError('Please log in to upload a medical report');
      return;
    }
    if (!uploadForm.file) {
      setUploadError('Please select a file to upload');
      return;
    }

    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('notes', uploadForm.notes);

      const res = await fetch(`${baseUrl}/api/profile/patient/clinical-history/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.authToken}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to upload medical report');
      }

      const result = await res.json();
      setUploadSuccess(result.message || 'Clinical history uploaded successfully');
      setUploadForm({ file: null, notes: '' });
      fetchClinicalDocuments();
    } catch (err) {
      setUploadError(err.message || 'Failed to upload medical report');
    }
  };

  // Handle form input changes
  const handleReferralChange = (e) => {
    const { name, value } = e.target;
    setReferralForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUploadChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'file') {
      setUploadForm((prev) => ({ ...prev, file: files[0] }));
    } else {
      setUploadForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const openDialog = (report) => {
    setSelectedReport(report);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setSelectedReport(null);
    setDialogOpen(false);
  };

  useEffect(() => {
    fetchMedicalReports();
    fetchClinicalDocuments();
  }, [user, navigate]);

  return (
    <Layout title="Clinical Records">
      <div className="clinical-records-container">
        <div className="header-section">
          <h1 className="page-title">Clinical Records</h1>
          <p className="page-subtitle">Your complete health history in one secure place.</p>
        </div>

        {/* Medical Reports */}
        <section className="card-section">
          <div className="section-header">
            <h3 className="section-title">
              <FontAwesomeIcon icon={faFileMedical} className="section-icon" /> Medical Reports
            </h3>
          </div>
          {error && <p className="error-text">{error}</p>}
          {isLoading.reports ? (
            <p className="loading-text">Loading reports...</p>
          ) : medicalReports.length === 0 ? (
            <div className="empty-state">
              <FontAwesomeIcon icon={faFileMedical} size="2x" color="#D4E6F1" />
              <p>No medical reports available.</p>
            </div>
          ) : (
            <ul className="report-grid">
              {medicalReports.map((report) => (
                <li key={report.report_id} className="report-card">
                  <div className="report-badge">ID: {report.report_id}</div>
                  <div className="report-body">
                    <p><strong>Doctor:</strong> {report.doctor_username}</p>
                    <p><strong>Date:</strong> {new Date(report.created_at).toLocaleDateString()}</p>
                    <p><strong>Diagnosis:</strong> {report.diagnosis}</p>
                    <button className="view-btn" onClick={() => openDialog(report)}>
                      View Details <FontAwesomeIcon icon={faArrowRight} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Clinical History */}
        <section className="card-section">
          <div className="section-header">
            <h3 className="section-title">
              <FontAwesomeIcon icon={faFileMedical} className="section-icon" /> Clinical History
            </h3>
          </div>
          {isLoading.documents ? (
            <p className="loading-text">Loading documents...</p>
          ) : clinicalDocuments.length === 0 ? (
            <div className="empty-state">
              <FontAwesomeIcon icon={faFileMedical} size="2x" color="#D4E6F1" />
              <p>No clinical documents uploaded.</p>
            </div>
          ) : (
            <ul className="document-list">
              {clinicalDocuments.map((doc) => (
                <li key={doc._id} className="document-item">
                  <div className="document-info">
                    <p><strong>{doc.filename}</strong></p>
                    <p>Uploaded by: {doc.uploaded_by} • {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                    {doc.notes && <p className="notes">Notes: {doc.notes}</p>}
                  </div>
                  <a
                    href={`${baseUrl}${doc.file_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="action-btn"
                  >
                    <FontAwesomeIcon icon={faEye} /> View
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Upload Form */}
        <section className="card-section">
          <div className="section-header">
            <h3 className="section-title">Upload Medical Document</h3>
          </div>
          {uploadError && <p className="error-text">{uploadError}</p>}
          {uploadSuccess && <p className="success-text">{uploadSuccess}</p>}
          <form onSubmit={handleUploadSubmit} className="upload-form">
            <div className="form-row">
              <label className="form-label">
                <FontAwesomeIcon icon={faUpload} /> Select File
              </label>
              <input
                type="file"
                name="file"
                onChange={handleUploadChange}
                className="form-file-input"
                accept=".pdf,.doc,.docx,.jpg,.png"
                required
              />
            </div>
            <div className="form-row">
              <label className="form-label">Notes (Optional)</label>
              <textarea
                name="notes"
                value={uploadForm.notes}
                onChange={handleUploadChange}
                className="form-textarea"
                placeholder="Add any notes about this document..."
              />
            </div>
            <button type="submit" className="submit-btn">
              <FontAwesomeIcon icon={faUpload} /> Upload Document
            </button>
          </form>
        </section>

        {/* Referral Request */}
        <section className="card-section">
          <div className="section-header">
            <h3 className="section-title">Request a Referral</h3>
          </div>
          {referralError && <p className="error-text">{referralError}</p>}
          {referralSuccess && <p className="success-text">{referralSuccess}</p>}
          <form onSubmit={handleReferralSubmit} className="referral-form">
            <div className="form-row">
              <label className="form-label">Organization Name</label>
              <input
                type="text"
                name="new_organization_name"
                value={referralForm.new_organization_name}
                onChange={handleReferralChange}
                className="form-input"
                placeholder="e.g., City General Hospital"
                required
              />
            </div>
            <div className="form-row">
              <label className="form-label">Doctor Name</label>
              <input
                type="text"
                name="private_doctor_name"
                value={referralForm.private_doctor_name}
                onChange={handleReferralChange}
                className="form-input"
                placeholder="Dr. Sarah Lee"
                required
              />
            </div>
            <div className="form-row">
              <label className="form-label">Reason for Referral</label>
              <textarea
                name="reason"
                value={referralForm.reason}
                onChange={handleReferralChange}
                className="form-textarea"
                placeholder="Please describe why you need a referral..."
                required
              />
            </div>
            <button type="submit" className="submit-btn">
              <FontAwesomeIcon icon={faPaperPlane} /> Submit Referral
            </button>
          </form>
        </section>

        {/* Modal */}
        {dialogOpen && selectedReport && (
          <div className="modal-overlay" onClick={closeDialog}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Medical Report Details</h3>
                <button className="close-btn" onClick={closeDialog}>
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
              <div className="modal-body">
                <p><strong>Doctor:</strong> {selectedReport.doctor_username}</p>
                <p><strong>Date:</strong> {new Date(selectedReport.created_at).toLocaleDateString()}</p>
                <p><strong>Diagnosis:</strong> {selectedReport.diagnosis}</p>
                <p><strong>Advice:</strong> {selectedReport.advice}</p>
                <p><strong>Symptoms:</strong> {selectedReport.symptoms?.join(', ') || 'None recorded'}</p>
                <p><strong>Tests Conducted:</strong> {selectedReport.tests_conducted?.join(', ') || 'None'}</p>

                <h4>Test Results</h4>
                <ul className="test-results">
                  {selectedReport.test_results && Object.entries(selectedReport.test_results).length > 0 ? (
                    Object.entries(selectedReport.test_results).map(([test, result]) => (
                      <li key={test}>
                        <FontAwesomeIcon icon={faVial} className="test-icon" />
                        <span><strong>{test}:</strong> {result}</span>
                      </li>
                    ))
                  ) : (
                    <li>No test results available</li>
                  )}
                </ul>

                <h4>Prescriptions</h4>
                <div className="prescriptions">
                  {selectedReport.prescriptions?.length > 0 ? (
                    selectedReport.prescriptions.map((p, i) => (
                      <div key={i} className="prescription-item">
                        <p><strong>Medicine:</strong> {p.medicine_name || 'Not specified'}</p>
                        <p><strong>Dosage:</strong> {p.dosage || 'Not specified'}</p>
                        <p><strong>Frequency:</strong> {p.frequency || 'Not specified'}</p>
                        <p><strong>Duration:</strong> {p.duration || 'Not specified'}</p>
                      </div>
                    ))
                  ) : (
                    <p>No prescriptions</p>
                  )}
                </div>

                {selectedReport.feedback?.length > 0 && (
                  <>
                    <h4>Feedback</h4>
                    {selectedReport.feedback.map((fb, i) => (
                      <p key={i}>💬 {fb.comment || 'No comment'}</p>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ClinicalRecords;