import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, 
  faCalendarCheck, 
  faCalendarTimes, 
  faFileMedical, 
  faHeartbeat, 
  faMicrochip, 
  faLightbulb, 
  faRobot, 
  faExclamationTriangle,
  faMapMarkerAlt,
  faUserMd,
  faClock,
  faThermometerHalf,
  faTint,
  faLungs,
  faBell
} from '@fortawesome/free-solid-svg-icons';
import '../../css/Notifications.css';

export const NotificationPopup = () => {
  const { user, login } = useContext(AuthContext);
  const [popups, setPopups] = useState([]);
  const audioRef = useRef(new Audio('https://cdn.pixabay.com/audio/2024/08/08/audio_3c03734d88.mp3'));
  const softAudioRef = useRef(new Audio('https://cdn.pixabay.com/audio/2024/08/08/audio_3c03734d88.mp3'));
  const API_BASE_URL = 'https://13.60.49.202:8000';
  const WS_BASE_URL = 'wss://13.60.49.202:8000';
  const RECONNECT_INTERVAL = 10000;
  const MAX_RECONNECT_ATTEMPTS = 5;
  const HEARTBEAT_INTERVAL = 15000;
  const POPUP_DURATION = 12000;
  const DAILY_TIP_POPUP_DURATION = 15000;
  const HEALTH_ALERT_POPUP_DURATION = 20000;

  const refreshToken = async () => {
    if (!user?.googleRefreshToken) {
      console.error('No refresh token available for popups.');
      return null;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: user.googleRefreshToken }),
      });
      if (!response.ok) {
        console.error('Token refresh failed for popups:', response.status);
        return null;
      }
      const data = await response.json();
      const { authToken, googleAccessToken } = data;
      login(authToken, user.userType, user.username, googleAccessToken, user.googleRefreshToken);
      return authToken;
    } catch (err) {
      console.error('Error refreshing token for popups:', err);
      return null;
    }
  };

  const parseHealthAnalysis = (message) => {
    try {
      const jsonMatch = message.match(/Health Analysis:\s*({.*})/s);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[1]);
        return {
          isHealthAnalysis: true,
          alertSummary: jsonData.alert_summary || '',
          medicalExplanation: jsonData.medical_explanation || '',
          preventiveAdvice: jsonData.preventive_advice || '',
          rawData: jsonData
        };
      }
    } catch (err) {
      console.error('Error parsing health analysis:', err);
    }
    return { isHealthAnalysis: false };
  };

  const detectHealthAnomalies = (message, type) => {
    if (!message || typeof message !== 'string') return false;
    
    const healthAnalysis = parseHealthAnalysis(message);
    if (healthAnalysis.isHealthAnalysis) {
      return { 
        type: 'health_analysis', 
        severity: 'critical',
        analysisData: healthAnalysis
      };
    }
    
    if (type === 'iot_data') {
      const lowerMessage = message.toLowerCase();
      
      const heartRateMatch = message.match(/heart rate.*?(\d+)\s*bpm/i);
      if (heartRateMatch) {
        const heartRate = parseInt(heartRateMatch[1]);
        if (heartRate < 50 || heartRate > 120) {
          return { type: 'heart_rate', value: heartRate, severity: heartRate < 40 || heartRate > 140 ? 'critical' : 'warning' };
        }
      }
      
      const bpMatch = message.match(/blood pressure.*?(\d+)\/(\d+)/i);
      if (bpMatch) {
        const systolic = parseInt(bpMatch[1]);
        const diastolic = parseInt(bpMatch[2]);
        if (systolic > 140 || systolic < 90 || diastolic > 90 || diastolic < 60) {
          return { type: 'blood_pressure', systolic, diastolic, severity: systolic > 160 || diastolic > 100 ? 'critical' : 'warning' };
        }
      }
      
      const tempMatch = message.match(/temperature.*?([\d.]+)°?[fc]/i);
      if (tempMatch) {
        const temp = parseFloat(tempMatch[1]);
        const tempC = message.toLowerCase().includes('f') ? (temp - 32) * 5/9 : temp;
        if (tempC > 38.5 || tempC < 35.5) {
          return { type: 'temperature', value: temp, severity: tempC > 40 || tempC < 35 ? 'critical' : 'warning' };
        }
      }
      
      const oxygenMatch = message.match(/oxygen.*?(\d+)%/i) || message.match(/spo2.*?(\d+)%/i);
      if (oxygenMatch) {
        const oxygen = parseInt(oxygenMatch[1]);
        if (oxygen < 95) {
          return { type: 'oxygen_saturation', value: oxygen, severity: oxygen < 90 ? 'critical' : 'warning' };
        }
      }
      
      const anomalyKeywords = ['abnormal', 'critical', 'high', 'low', 'irregular', 'alert', 'warning', 'concern'];
      if (anomalyKeywords.some(keyword => lowerMessage.includes(keyword))) {
        return { type: 'general_anomaly', severity: 'warning' };
      }
    }
    
    return false;
  };

  const createConciseMessage = (healthAnomaly, notificationType, originalMessage) => {
    if (healthAnomaly) {
      if (healthAnomaly.type === 'health_analysis') {
        return 'Critical health alerts detected';
      }
      
      switch (healthAnomaly.type) {
        case 'heart_rate':
          return `Heart rate ${healthAnomaly.value} BPM - ${healthAnomaly.severity === 'critical' ? 'Critical' : 'Warning'}`;
        case 'blood_pressure':
          return `Blood pressure ${healthAnomaly.systolic}/${healthAnomaly.diastolic} - ${healthAnomaly.severity === 'critical' ? 'Critical' : 'Warning'}`;
        case 'temperature':
          return `Temperature ${healthAnomaly.value}° - ${healthAnomaly.severity === 'critical' ? 'Critical' : 'Warning'}`;
        case 'oxygen_saturation':
          return `Oxygen level ${healthAnomaly.value}% - ${healthAnomaly.severity === 'critical' ? 'Critical' : 'Low'}`;
        default:
          return 'Vital signs need attention';
      }
    }
    
    if (notificationType === 'daily_tip') {
      return 'Daily health tip updated';
    }
    
    if (notificationType === 'health_analysis') {
      return 'Health anomalies detected';
    }
    
    return originalMessage.length > 40 ? originalMessage.substring(0, 37) + '...' : originalMessage;
  };

  const connectWebSocket = (token) => {
    if (!token) {
      console.error('No valid token available for popups.');
      return null;
    }
    const ws = new WebSocket(`${WS_BASE_URL}/ws/notifications?token=${token}`);
    ws.onopen = () => {
      console.log('WebSocket connection established for popups');
      ws.send(JSON.stringify({ type: 'subscribe', channel: 'notifications', user_id: user?.username }));
      const heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
          console.log('Sent heartbeat ping for popups');
        }
      }, HEARTBEAT_INTERVAL);
      ws.onclose = () => {
        clearInterval(heartbeat);
        console.log('Heartbeat stopped for popups');
      };
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'notification') {
          let cleanMessage = data.message ? data.message.replace(/: string$/, '').replace(/📅 |📋 |💡 |🚨 |⚠️ |🤖 /g, '').trim() : 'No message content';
          
          const healthAnomaly = detectHealthAnomalies(cleanMessage, data.notification_type);
          let notificationType = data.notification_type;
          let notificationTitle = '';
          let fullMessage = cleanMessage;
          
          if (healthAnomaly) {
            notificationType = 'health_alert';
            
            if (healthAnomaly.type === 'health_analysis') {
              notificationTitle = `Critical Health Analysis Alert`;
              fullMessage = `Multiple health anomalies detected in your recent vitals monitoring. Critical readings identified that require immediate attention. Please review the detailed analysis in your health dashboard.`;
            } else {
              switch (healthAnomaly.type) {
                case 'heart_rate':
                  notificationTitle = `${healthAnomaly.severity === 'critical' ? 'Critical' : 'Warning'}: Abnormal Heart Rate`;
                  fullMessage = `Heart rate of ${healthAnomaly.value} BPM detected - ${healthAnomaly.value < 50 ? 'below normal range' : 'above normal range'}. Please monitor closely and consult your healthcare provider if symptoms persist.`;
                  break;
                case 'blood_pressure':
                  notificationTitle = `${healthAnomaly.severity === 'critical' ? 'Critical' : 'Warning'}: Blood Pressure Alert`;
                  fullMessage = `Blood pressure reading ${healthAnomaly.systolic}/${healthAnomaly.diastolic} mmHg is outside normal range. Please consult your healthcare provider for proper evaluation.`;
                  break;
                case 'temperature':
                  notificationTitle = `${healthAnomaly.severity === 'critical' ? 'Critical' : 'Warning'}: Temperature Alert`;
                  fullMessage = `Body temperature of ${healthAnomaly.value}° detected - ${healthAnomaly.value > 38 ? 'fever' : 'hypothermia'} range. Monitor symptoms closely and seek medical attention if condition persists.`;
                  break;
                case 'oxygen_saturation':
                  notificationTitle = `${healthAnomaly.severity === 'critical' ? 'Critical' : 'Warning'}: Low Oxygen Levels`;
                  fullMessage = `Oxygen saturation at ${healthAnomaly.value}% is below normal (95%+).`;
                  break;
                default:
                  notificationTitle = `Health Alert: Vital Signs Monitoring`;
                  fullMessage = `Anomalous vital signs detected in your recent readings. ${cleanMessage}. Please review your health dashboard for detailed analysis.`;
              }
            }
          }
          
          const isAutomaticUpdate = data.metadata?.trigger === 'automatic_vitals_update';
          const changeType = data.metadata?.change_type || 'vitals/location change';
          
          if (data.notification_type === 'daily_tip') {
            if (isAutomaticUpdate) {
              fullMessage = `Your Daily Health Tip has been automatically updated based on ${changeType}. Check your dashboard for personalized health recommendations.`;
            } else {
              fullMessage = 'Your Daily Health Tip has been updated based on your latest vitals and location changes.';
            }
          }
          
          if (data.notification_type === 'health_analysis') {
            fullMessage = 'Anomalies detected in your vital signs during routine monitoring.';
          }
          
          const conciseMessage = createConciseMessage(healthAnomaly, data.notification_type, cleanMessage);
          
          const notification = {
            id: data.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            title: notificationTitle || (
              data.notification_type === 'appointment_accepted' ? 'Appointment Accepted' :
              data.notification_type === 'appointment_rejected' ? 'Appointment Rejected' :
              data.notification_type === 'appointment_postponed' ? 'Appointment Postponed' :
              data.notification_type === 'medical_report_created' ? 'New Medical Report' :
              data.notification_type === 'health_analysis' ? 'Health Analysis Alert' :
              data.notification_type === 'iot_data' ? 'IoT Data Update' :
              data.notification_type === 'daily_tip' ? (isAutomaticUpdate ? 'Daily Tip Auto-Updated' : 'Daily Health Tip Updated') : 'Notification'
            ),
            message: conciseMessage,
            fullMessage: fullMessage,
            type: notificationType,
            originalType: data.notification_type,
            timestamp: data.timestamp || new Date().toISOString(),
            doctor: data.message && typeof data.message === 'string' ? (data.message.match(/Dr\. \w+/)?.[0] || 'Health Assistant') : 'Health Assistant',
            isAutomatic: isAutomaticUpdate,
            changeType: changeType,
            city: data.metadata?.city || 'Unknown Location',
            vitalsTimestamp: data.metadata?.vitals_timestamp,
            healthAnomaly: healthAnomaly,
            originalMessage: cleanMessage,
            healthAnalysis: data.notification_type === 'health_analysis' ? parseHealthAnalysis(cleanMessage) : null,
            dailyTipData: data.notification_type === 'daily_tip' ? {
              fullTip: data.metadata?.full_tip || cleanMessage,
              generatedAt: data.timestamp,
              city: data.metadata?.city || 'Unknown',
              isAutomatic: isAutomaticUpdate,
              trigger: data.metadata?.trigger || 'manual',
              changeType: changeType,
              vitalsTimestamp: data.metadata?.vitals_timestamp,
            } : null,
          };
          
          setPopups((prev) => [...prev, notification]);
          
          if (notificationType === 'health_alert') {
            audioRef.current.volume = 1.0;
            audioRef.current.playbackRate = 1.2;
            audioRef.current.play().catch((err) => console.error('Health alert audio playback failed:', err));
          } else if (data.notification_type === 'daily_tip') {
            if (isAutomaticUpdate) {
              softAudioRef.current.volume = 0.4;
              softAudioRef.current.play().catch((err) => console.error('Soft audio playback failed:', err));
            } else {
              audioRef.current.volume = 0.6;
              audioRef.current.play().catch((err) => console.error('Audio playback failed:', err));
            }
          } else if (data.notification_type === 'health_analysis') {
            audioRef.current.volume = 0.9;
            audioRef.current.play().catch((err) => console.error('Audio playback failed:', err));
          } else {
            audioRef.current.volume = 0.8;
            audioRef.current.play().catch((err) => console.error('Audio playback failed:', err));
          }
          
          let duration = POPUP_DURATION;
          if (notificationType === 'health_alert') {
            duration = HEALTH_ALERT_POPUP_DURATION;
          } else if (data.notification_type === 'daily_tip') {
            duration = isAutomaticUpdate ? DAILY_TIP_POPUP_DURATION + 3000 : DAILY_TIP_POPUP_DURATION;
          } else if (data.notification_type === 'health_analysis') {
            duration = DAILY_TIP_POPUP_DURATION + 5000;
          }
          
          setTimeout(() => {
            setPopups((prev) => prev.filter((p) => p.id !== notification.id));
          }, duration);
        } else if (data.error) {
          console.error('Server error for popups:', data.error);
          ws.close();
        }
      } catch (err) {
        console.error('Error parsing WebSocket message for popups:', err);
      }
    };
    ws.onerror = (err) => console.error('WebSocket error for popups:', err);
    ws.onclose = (event) => console.log(`WebSocket closed for popups with code: ${event.code}, reason: ${event.reason}`);
    return ws;
  };

  useEffect(() => {
    let ws = null;
    let reconnectAttempts = 0;
    let reconnectTimeout = null;

    const attemptReconnect = async () => {
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        console.log(`Reconnecting popup WebSocket attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS}`);
        reconnectAttempts++;
        let token = user?.authToken;
        if (!token) {
          token = await refreshToken();
        }
        ws = connectWebSocket(token);
        if (ws) {
          ws.onclose = async (event) => {
            console.log(`WebSocket closed for popups with code: ${event.code}, reason: ${event.reason}`);
            reconnectTimeout = setTimeout(attemptReconnect, RECONNECT_INTERVAL);
          };
        } else {
          reconnectTimeout = setTimeout(attemptReconnect, RECONNECT_INTERVAL);
        }
      }
    };

    const initWebSocket = async () => {
      let token = user?.authToken;
      if (!token) {
        token = await refreshToken();
      }
      ws = connectWebSocket(token);
    };

    if (user) {
      initWebSocket();
    }

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [user, login]);

  const getNotificationIcon = (type, isAutomatic = false, originalType = null) => {
    switch (type) {
      case 'health_alert':
        return faExclamationTriangle;
      case 'appointment_accepted':
        return faCalendarCheck;
      case 'appointment_rejected':
      case 'appointment_postponed':
        return faCalendarTimes;
      case 'medical_report_created':
        return faFileMedical;
      case 'health_analysis':
        return faHeartbeat;
      case 'iot_data':
        return faMicrochip;
      case 'daily_tip':
        return isAutomatic ? faRobot : faLightbulb;
      default:
        return faBell;
    }
  };

  return (
    <div className="popup-container">
      {popups.map((popup) => (
        <div key={popup.id} className={`popup ${popup.type} ${popup.isAutomatic ? 'automatic-update' : ''} ${popup.type === 'health_alert' ? 'health-alert critical-alert' : ''} ${popup.type === 'health_analysis' ? 'health-alert' : ''}`}>
          <FontAwesomeIcon icon={getNotificationIcon(popup.type, popup.isAutomatic, popup.originalType)} className="notif-icon" />
          <div className="popup-content">
            <h3>
              {popup.title}
              {popup.isAutomatic && <span className="auto-update-indicator"><FontAwesomeIcon icon={faRobot} /></span>}
              {popup.type === 'health_alert' && popup.healthAnomaly?.severity === 'critical' && <span className="critical-indicator"><FontAwesomeIcon icon={faExclamationTriangle} /></span>}
            </h3>
            <p>{popup.message}</p>
            {popup.type === 'daily_tip' && (
              <div className="popup-metadata">
                {popup.city && <small className="popup-location"><FontAwesomeIcon icon={faMapMarkerAlt} /> {popup.city}</small>}
                {popup.isAutomatic && popup.changeType && (
                  <small className="popup-change-type">Triggered by: {popup.changeType}</small>
                )}
              </div>
            )}
            {(popup.type === 'health_analysis' || popup.type === 'health_alert') && (
              <div className="popup-metadata">
                <small className="health-alert-indicator">
                  {popup.type === 'health_alert' && popup.healthAnomaly?.severity === 'critical' ? 
                    <><FontAwesomeIcon icon={faExclamationTriangle} /> Critical - Seek immediate attention</> : 
                    <><FontAwesomeIcon icon={faExclamationTriangle} /> Monitor closely</>}
                </small>
              </div>
            )}
          </div>
          <FontAwesomeIcon
            icon={faTimes}
            className="popup-close"
            onClick={() => setPopups((prev) => prev.filter((p) => p.id !== popup.id))}
          />
        </div>
      ))}
    </div>
  );
};

export const Notifications = () => {
  const { user, logout, login } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const API_BASE_URL = 'https://13.60.49.202:8000';
  const WS_BASE_URL = 'wss://13.60.49.202:8000';
  const RECONNECT_INTERVAL = 10000;
  const MAX_RECONNECT_ATTEMPTS = 5;
  const HEARTBEAT_INTERVAL = 15000;

  const refreshToken = async () => {
    if (!user?.googleRefreshToken) {
      console.error('No refresh token available for notifications.');
      logout();
      return null;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: user.googleRefreshToken }),
      });
      if (!response.ok) {
        console.error('Token refresh failed for notifications:', response.status);
        logout();
        return null;
      }
      const data = await response.json();
      const { authToken, googleAccessToken } = data;
      login(authToken, user.userType, user.username, googleAccessToken, user.googleRefreshToken);
      return authToken;
    } catch (err) {
      console.error('Error refreshing token for notifications:', err);
      logout();
      return null;
    }
  };

  const parseHealthAnalysis = (message) => {
    try {
      const jsonMatch = message.match(/Health Analysis:\s*({.*})/s);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[1]);
        return {
          isHealthAnalysis: true,
          alertSummary: jsonData.alert_summary || '',
          medicalExplanation: jsonData.medical_explanation || '',
          preventiveAdvice: jsonData.preventive_advice || '',
          rawData: jsonData
        };
      }
    } catch (err) {
      console.error('Error parsing health analysis:', err);
    }
    return { isHealthAnalysis: false };
  };

  const detectHealthAnomalies = (message, type) => {
    if (!message || typeof message !== 'string') return false;
    
    const healthAnalysis = parseHealthAnalysis(message);
    if (healthAnalysis.isHealthAnalysis) {
      return { 
        type: 'health_analysis', 
        severity: 'critical',
        analysisData: healthAnalysis
      };
    }
    
    if (type === 'iot_data') {
      const lowerMessage = message.toLowerCase();
      
      const heartRateMatch = message.match(/heart rate.*?(\d+)\s*bpm/i);
      if (heartRateMatch) {
        const heartRate = parseInt(heartRateMatch[1]);
        if (heartRate < 50 || heartRate > 120) {
          return { type: 'heart_rate', value: heartRate, severity: heartRate < 40 || heartRate > 140 ? 'critical' : 'warning' };
        }
      }
      
      const bpMatch = message.match(/blood pressure.*?(\d+)\/(\d+)/i);
      if (bpMatch) {
        const systolic = parseInt(bpMatch[1]);
        const diastolic = parseInt(bpMatch[2]);
        if (systolic > 140 || systolic < 90 || diastolic > 90 || diastolic < 60) {
          return { type: 'blood_pressure', systolic, diastolic, severity: systolic > 160 || diastolic > 100 ? 'critical' : 'warning' };
        }
      }
      
      const tempMatch = message.match(/temperature.*?([\d.]+)°?[fc]/i);
      if (tempMatch) {
        const temp = parseFloat(tempMatch[1]);
        const tempC = message.toLowerCase().includes('f') ? (temp - 32) * 5/9 : temp;
        if (tempC > 38.5 || tempC < 35.5) {
          return { type: 'temperature', value: temp, severity: tempC > 40 || tempC < 35 ? 'critical' : 'warning' };
        }
      }
      
      const oxygenMatch = message.match(/oxygen.*?(\d+)%/i) || message.match(/spo2.*?(\d+)%/i);
      if (oxygenMatch) {
        const oxygen = parseInt(oxygenMatch[1]);
        if (oxygen < 95) {
          return { type: 'oxygen_saturation', value: oxygen, severity: oxygen < 90 ? 'critical' : 'warning' };
        }
      }
      
      const anomalyKeywords = ['abnormal', 'critical', 'high', 'low', 'irregular', 'alert', 'warning', 'concern'];
      if (anomalyKeywords.some(keyword => lowerMessage.includes(keyword))) {
        return { type: 'general_anomaly', severity: 'warning' };
      }
    }
    
    return false;
  };

  const createSummaryMessage = (healthAnomaly, notificationType, originalMessage) => {
    if (healthAnomaly) {
      if (healthAnomaly.type === 'health_analysis') {
        return 'Critical health anomalies detected in multiple vital signs';
      }
      
      switch (healthAnomaly.type) {
        case 'heart_rate':
          return `Heart rate ${healthAnomaly.value} BPM - ${healthAnomaly.value < 50 ? 'below' : 'above'} normal range`;
        case 'blood_pressure':
          return `Blood pressure ${healthAnomaly.systolic}/${healthAnomaly.diastolic} mmHg - outside normal range`;
        case 'temperature':
          return `Body temperature ${healthAnomaly.value}° - ${healthAnomaly.value > 38 ? 'fever' : 'hypothermia'} detected`;
        case 'oxygen_saturation':
          return `Oxygen saturation ${healthAnomaly.value}% - below normal levels`;
        default:
          return 'Vital signs anomaly detected - requires monitoring';
      }
    }
    
    if (notificationType === 'daily_tip') {
      return 'Daily health tip has been updated based on your latest data';
    }
    
    if (notificationType === 'health_analysis') {
      return 'Health monitoring detected anomalies in vital signs';
    }
    
    return originalMessage.length > 60 ? originalMessage.substring(0, 57) + '...' : originalMessage;
  };

  const parseDailyTip = (notif) => {
    try {
      const metadata = notif.metadata || {};
      return {
        fullTip: metadata.full_tip || notif.message,
        generatedAt: metadata.generated_at || notif.created_at,
        city: metadata.city || 'Unknown',
        isAutomatic: metadata.trigger === 'automatic_vitals_update',
        trigger: metadata.trigger || 'manual',
        changeType: metadata.change_type || 'manual refresh',
        vitalsTimestamp: metadata.vitals_timestamp,
      };
    } catch (err) {
      console.error('Error parsing daily tip:', err);
      return null;
    }
  };

  const fetchNotifications = async () => {
    if (!user?.authToken || !user?.username) {
      setError('Please log in to view notifications');
      logout();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/`, {
        headers: {
          'Authorization': `Bearer ${user.authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          return;
        }
        throw new Error('Failed to load notifications');
      }

      const data = await response.json();
      const formattedNotifications = data.map(notif => {
        let processedMessage = notif.message.replace(/: string$/, '').replace(/📅 |📋 |💡 |🚨 |⚠️ |🤖 /g, '').trim();
        
        const healthAnomaly = detectHealthAnomalies(processedMessage, notif.type);
        let notificationType = notif.type;
        let notificationTitle = '';
        let fullMessage = processedMessage;
        
        if (healthAnomaly) {
          notificationType = 'health_alert';
          
          if (healthAnomaly.type === 'health_analysis') {
            notificationTitle = `Critical Health Analysis Alert`;
            fullMessage = processedMessage;
          } else {
            switch (healthAnomaly.type) {
              case 'heart_rate':
                notificationTitle = `${healthAnomaly.severity === 'critical' ? 'Critical' : 'Warning'}: Abnormal Heart Rate`;
                fullMessage = `Heart rate of ${healthAnomaly.value} BPM detected - ${healthAnomaly.value < 50 ? 'below normal range (50-100 BPM)' : 'above normal range (50-100 BPM)'}. This reading was recorded from your IoT monitoring device. Please monitor closely and consult your healthcare provider if you experience symptoms like dizziness, chest pain, or shortness of breath.`;
                break;
              case 'blood_pressure':
                notificationTitle = `${healthAnomaly.severity === 'critical' ? 'Critical' : 'Warning'}: Blood Pressure Alert`;
                fullMessage = `Blood pressure reading of ${healthAnomaly.systolic}/${healthAnomaly.diastolic} mmHg is outside the normal range (90-140/60-90 mmHg). This measurement was taken by your connected health monitoring device. Please consult your healthcare provider for proper evaluation and consider lifestyle modifications or medication adjustments as needed.`;
                break;
              case 'temperature':
                notificationTitle = `${healthAnomaly.severity === 'critical' ? 'Critical' : 'Warning'}: Temperature Alert`;
                fullMessage = `Body temperature of ${healthAnomaly.value}° has been detected, indicating ${healthAnomaly.value > 38 ? 'fever (above 37.5°C normal range)' : 'hypothermia (below 36°C normal range)'}. This temperature was recorded by your IoT health monitoring system. Monitor symptoms closely including chills, sweating, or fatigue, and seek medical attention if the condition persists or worsens.`;
                break;
              case 'oxygen_saturation':
                notificationTitle = `${healthAnomaly.severity === 'critical' ? 'Critical' : 'Warning'}: Low Oxygen Levels`;
                fullMessage = `Oxygen saturation level of ${healthAnomaly.value}% is below the normal range (95-100%). This reading was captured by your pulse oximeter device. Low oxygen levels can indicate respiratory or cardiovascular issues. Seek immediate medical attention if you experience symptoms like shortness of breath, dizziness, confusion, or chest pain.`;
                break;
              default:
                notificationTitle = `Health Alert: Vital Signs Monitoring`;
                fullMessage = `Anomalous vital signs have been detected during routine monitoring by your IoT health devices. Original reading: ${processedMessage}. Please review your complete health dashboard for detailed analysis and consider consulting with your healthcare provider for professional evaluation.`;
            }
          }
        }
        
        const isAutomaticUpdate = notif.metadata?.trigger === 'automatic_vitals_update';
        const changeType = notif.metadata?.change_type || 'vitals/location change';
        
        if (notif.type === 'daily_tip') {
          if (isAutomaticUpdate) {
            fullMessage = `Your Daily Health Tip has been automatically updated based on recent changes in your ${changeType}. Our AI system has analyzed your latest health data and location information to provide you with personalized recommendations. Visit your dashboard to view the complete updated health tip with specific advice tailored to your current health status and environmental conditions.`;
          } else {
            fullMessage = 'Your Daily Health Tip has been updated based on your latest vitals and location changes. Our system has processed your recent health measurements and geographic data to provide you with personalized health recommendations. Check your dashboard for the complete updated tip with tailored advice for your wellness journey.';
          }
        }
        
        if (notif.type === 'health_analysis') {
          fullMessage = 'Anomalies detected in your vital signs during routine monitoring. Please check your health dashboard for detailed analysis and recommendations from our medical AI system.';
        }
        
        const summaryMessage = createSummaryMessage(healthAnomaly, notif.type, processedMessage);
        
        return {
          id: notif._id,
          title: notificationTitle || (
            notif.type === 'appointment_accepted' ? 'Appointment Accepted' :
            notif.type === 'appointment_rejected' ? 'Appointment Rejected' :
            notif.type === 'appointment_postponed' ? 'Appointment Postponed' :
            notif.type === 'medical_report_created' ? 'New Medical Report' :
            notif.type === 'health_analysis' ? 'Health Analysis Alert' :
            notif.type === 'iot_data' ? 'IoT Data Update' :
            notif.type === 'daily_tip' ? (isAutomaticUpdate ? 'Daily Tip Auto-Updated' : 'Daily Health Tip Updated') : 'Notification'
          ),
          message: summaryMessage,
          fullMessage: fullMessage,
          type: notificationType,
          originalType: notif.type,
          timestamp: notif.created_at,
          doctor: notif.message.match(/Dr\. \w+/)?.[0] || 'Health Assistant',
          unread: !notif.is_read,
          healthAnalysis: healthAnomaly?.type === 'health_analysis' ? healthAnomaly.analysisData : null,
          dailyTipData: notif.type === 'daily_tip' ? parseDailyTip(notif) : null,
          isAutomatic: isAutomaticUpdate,
          changeType: changeType,
          city: notif.metadata?.city || 'Unknown Location',
          vitalsTimestamp: notif.metadata?.vitals_timestamp,
          healthAnomaly: healthAnomaly,
          originalMessage: processedMessage,
        };
      });
      setNotifications(formattedNotifications);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    if (!user?.authToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/mark-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to mark notifications as read:', response.status);
        return;
      }

      setNotifications(notifications.map(notif => ({ ...notif, unread: false })));
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  const connectWebSocket = (token) => {
    if (!token) {
      console.error('No valid token available for notifications.');
      return null;
    }
    const ws = new WebSocket(`${WS_BASE_URL}/ws/notifications?token=${token}`);
    ws.onopen = () => {
      console.log('WebSocket connection established for notifications');
      ws.send(JSON.stringify({ type: 'subscribe', channel: 'notifications', user_id: user?.username }));
      const heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
          console.log('Sent heartbeat ping for notifications');
        }
      }, HEARTBEAT_INTERVAL);
      ws.onclose = () => {
        clearInterval(heartbeat);
        console.log('Heartbeat stopped for notifications');
      };
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'notification') {
          let cleanMessage = data.message ? data.message.replace(/: string$/, '').replace(/📅 |📋 |💡 |🚨 |⚠️ |🤖 /g, '').trim() : 'No message content';
          
          const healthAnomaly = detectHealthAnomalies(cleanMessage, data.notification_type);
          let notificationType = data.notification_type;
          let notificationTitle = '';
          let fullMessage = cleanMessage;
          
          if (healthAnomaly) {
            notificationType = 'health_alert';
            
            if (healthAnomaly.type === 'health_analysis') {
              notificationTitle = `Critical Health Analysis Alert`;
              fullMessage = cleanMessage;
            } else {
              switch (healthAnomaly.type) {
                case 'heart_rate':
                  notificationTitle = `${healthAnomaly.severity === 'critical' ? 'Critical' : 'Warning'}: Abnormal Heart Rate`;
                  fullMessage = `Heart rate of ${healthAnomaly.value} BPM detected - ${healthAnomaly.value < 50 ? 'below normal range (50-100 BPM)' : 'above normal range (50-100 BPM)'}. This reading was recorded from your IoT monitoring device. Please monitor closely and consult your healthcare provider if you experience symptoms like dizziness, chest pain, or shortness of breath.`;
                  break;
                case 'blood_pressure':
                  notificationTitle = `${healthAnomaly.severity === 'critical' ? 'Critical' : 'Warning'}: Blood Pressure Alert`;
                  fullMessage = `Blood pressure reading of ${healthAnomaly.systolic}/${healthAnomaly.diastolic} mmHg is outside the normal range (90-140/60-90 mmHg). This measurement was taken by your connected health monitoring device. Please consult your healthcare provider for proper evaluation and consider lifestyle modifications or medication adjustments as needed.`;
                  break;
                case 'temperature':
                  notificationTitle = `${healthAnomaly.severity === 'critical' ? 'Critical' : 'Warning'}: Temperature Alert`;
                  fullMessage = `Body temperature of ${healthAnomaly.value}° has been detected, indicating ${healthAnomaly.value > 38 ? 'fever (above 37.5°C normal range)' : 'hypothermia (below 36°C normal range)'}. This temperature was recorded by your IoT health monitoring system. Monitor symptoms closely including chills, sweating, or fatigue, and seek medical attention if the condition persists or worsens.`;
                  break;
                case 'oxygen_saturation':
                  notificationTitle = `${healthAnomaly.severity === 'critical' ? 'Critical' : 'Warning'}: Low Oxygen Levels`;
                  fullMessage = `Oxygen saturation level of ${healthAnomaly.value}% is below the normal range (95-100%). This reading was captured by your pulse oximeter device. Low oxygen levels can indicate respiratory or cardiovascular issues. Seek immediate medical attention if you experience symptoms like shortness of breath, dizziness, confusion, or chest pain.`;
                  break;
                default:
                  notificationTitle = `Health Alert: Vital Signs Monitoring`;
                  fullMessage = `Anomalous vital signs have been detected during routine monitoring by your IoT health devices. Original reading: ${cleanMessage}. Please review your complete health dashboard for detailed analysis and consider consulting with your healthcare provider for professional evaluation.`;
              }
            }
          }
          
          const isAutomaticUpdate = data.metadata?.trigger === 'automatic_vitals_update';
          const changeType = data.metadata?.change_type || 'vitals/location change';
          
          if (data.notification_type === 'daily_tip') {
            if (isAutomaticUpdate) {
              fullMessage = `Your Daily Health Tip has been automatically updated based on recent changes in your ${changeType}. Our AI system has analyzed your latest health data and location information to provide you with personalized recommendations. Visit your dashboard to view the complete updated health tip with specific advice tailored to your current health status and environmental conditions.`;
            } else {
              fullMessage = 'Your Daily Health Tip has been updated based on your latest vitals and location changes. Our system has processed your recent health measurements and geographic data to provide you with personalized health recommendations. Check your dashboard for the complete updated tip with tailored advice for your wellness journey.';
            }
          }
          
          if (data.notification_type === 'health_analysis') {
            fullMessage = 'Anomalies detected in your vital signs during routine monitoring. Please check your health dashboard for detailed analysis and recommendations from our medical AI system.';
          }
          
          const summaryMessage = createSummaryMessage(healthAnomaly, data.notification_type, cleanMessage);
          
          const notification = {
            id: data.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            title: notificationTitle || (
              data.notification_type === 'appointment_accepted' ? 'Appointment Accepted' :
              data.notification_type === 'appointment_rejected' ? 'Appointment Rejected' :
              data.notification_type === 'appointment_postponed' ? 'Appointment Postponed' :
              data.notification_type === 'medical_report_created' ? 'New Medical Report' :
              data.notification_type === 'health_analysis' ? 'Health Analysis Alert' :
              data.notification_type === 'iot_data' ? 'IoT Data Update' :
              data.notification_type === 'daily_tip' ? (isAutomaticUpdate ? 'Daily Tip Auto-Updated' : 'Daily Health Tip Updated') : 'Notification'
            ),
            message: summaryMessage,
            fullMessage: fullMessage,
            type: notificationType,
            originalType: data.notification_type,
            timestamp: data.timestamp || new Date().toISOString(),
            doctor: data.message && typeof data.message === 'string' ? (data.message.match(/Dr\. \w+/)?.[0] || 'Health Assistant') : 'Health Assistant',
            unread: true,
            healthAnalysis: healthAnomaly?.type === 'health_analysis' ? healthAnomaly.analysisData : null,
            dailyTipData: data.notification_type === 'daily_tip' ? { 
              fullTip: data.metadata?.full_tip || cleanMessage, 
              generatedAt: data.timestamp, 
              city: data.metadata?.city,
              isAutomatic: isAutomaticUpdate,
              trigger: data.metadata?.trigger || 'manual',
              changeType: changeType,
              vitalsTimestamp: data.metadata?.vitals_timestamp,
            } : null,
            isAutomatic: isAutomaticUpdate,
            changeType: changeType,
            city: data.metadata?.city || 'Unknown Location',
            vitalsTimestamp: data.metadata?.vitals_timestamp,
            healthAnomaly: healthAnomaly,
            originalMessage: cleanMessage,
          };
          setNotifications((prev) => {
            if (prev.some((notif) => notif.id === notification.id)) {
              return prev;
            }
            return [notification, ...prev];
          });
        } else if (data.error) {
          console.error('Server error for notifications:', data.error);
          ws.close();
        }
      } catch (err) {
        console.error('Error parsing WebSocket message for notifications:', err);
      }
    };
    ws.onerror = (err) => console.error('WebSocket error for notifications:', err);
    ws.onclose = (event) => console.log(`WebSocket closed for notifications with code: ${event.code}, reason: ${event.reason}`);
    return ws;
  };

  const openModal = (notification) => {
    setSelectedNotification(notification);
    if (notification.unread) {
      markAsRead();
    }
  };

  const closeModal = () => {
    setSelectedNotification(null);
  };

  useEffect(() => {
    fetchNotifications();

    let ws = null;
    let reconnectAttempts = 0;
    let reconnectTimeout = null;

    const attemptReconnect = async () => {
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        console.log(`Reconnecting notifications WebSocket attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS}`);
        reconnectAttempts++;
        let token = user?.authToken;
        if (!token) {
          token = await refreshToken();
        }
        ws = connectWebSocket(token);
        if (ws) {
          ws.onclose = async (event) => {
            console.log(`WebSocket closed for notifications with code: ${event.code}, reason: ${event.reason}`);
            reconnectTimeout = setTimeout(attemptReconnect, RECONNECT_INTERVAL);
          };
        } else {
          reconnectTimeout = setTimeout(attemptReconnect, RECONNECT_INTERVAL);
        }
      }
    };

    const initWebSocket = async () => {
      let token = user?.authToken;
      if (!token) {
        token = await refreshToken();
      }
      ws = connectWebSocket(token);
    };

    if (user) {
      initWebSocket();
    } else {
      setError('Please log in to view notifications');
      setLoading(false);
    }

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [user, login, logout]);

  const getNotificationIcon = (type, isAutomatic = false, originalType = null) => {
    switch (type) {
      case 'health_alert':
        return faExclamationTriangle;
      case 'appointment_accepted':
        return faCalendarCheck;
      case 'appointment_rejected':
      case 'appointment_postponed':
        return faCalendarTimes;
      case 'medical_report_created':
        return faFileMedical;
      case 'health_analysis':
        return faHeartbeat;
      case 'iot_data':
        return faMicrochip;
      case 'daily_tip':
        return isAutomatic ? faRobot : faLightbulb;
      default:
        return faBell;
    }
  };

  const formatHealthAnalysisForModal = (analysisData) => {
    if (!analysisData) return null;
    
    return {
      alertSummary: analysisData.alertSummary,
      medicalExplanation: analysisData.medicalExplanation,
      preventiveAdvice: analysisData.preventiveAdvice,
      vitalSigns: analysisData.alertSummary ? 
        analysisData.alertSummary.split(';').map(item => {
          const [key, value] = item.split('=').map(s => s.trim());
          return { key: key || item, value: value || 'N/A' };
        }).filter(item => item.key) : []
    };
  };

  const groupByDay = (notifs) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    return notifs.reduce((acc, n) => {
      const date = new Date(n.timestamp);
      date.setHours(0, 0, 0, 0);
      const diff = (today - date) / 86400000;

      if (diff < 1) acc.today.push(n);
      else if (diff < 2) acc.yesterday.push(n);
      else acc.older.push(n);

      return acc;
    }, { today: [], yesterday: [], older: [] });
  };

  const { today, yesterday, older } = groupByDay(notifications);
  const hasNotifications = !loading && notifications.length > 0;

  return (
    <Layout title="Notifications">
      <div className="notifications-page">
        <div className="header-actions">
          <h2 className="page-title">Notifications</h2>
          {hasNotifications && (
            <button className="mark-all-read" onClick={markAsRead}>
              Mark All Read
            </button>
          )}
        </div>
        <div className="notifications-list">
          {loading ? (
            <p className="loading-text">Loading your health updates...</p>
          ) : error ? (
            <p className="error-text">{error}</p>
          ) : !hasNotifications ? (
            <div className="empty-state">
              <FontAwesomeIcon icon={faBell} size="3x" color="#D4E6F1" />
              <h3>All caught up!</h3>
              <p>Your health is on track. No new alerts.</p>
            </div>
          ) : (
            <>
              {today.length > 0 && (
                <>
                  <h3 className="section-header">Today</h3>
                  {today.map((notif) => (
                    <div
                      key={notif.id}
                      className={`notification-item ${notif.type} ${notif.unread ? 'unread' : ''} ${notif.isAutomatic ? 'automatic-update' : ''} ${notif.type === 'health_alert' ? 'health-alert critical-alert' : ''} ${notif.type === 'health_analysis' ? 'health-alert' : ''}`}
                      onClick={() => openModal(notif)}
                    >
                      <FontAwesomeIcon icon={getNotificationIcon(notif.type, notif.isAutomatic, notif.originalType)} className="notif-icon" />
                      <div className="notif-content">
                        <h3>
                          {notif.title}
                          {notif.isAutomatic && <span className="auto-badge">Auto</span>}
                          {notif.type === 'health_alert' && notif.healthAnomaly?.severity === 'critical' && <span className="critical-badge">Critical</span>}
                        </h3>
                        <p>{notif.message}</p>
                        {notif.type === 'daily_tip' && (
                          <div className="notif-metadata">
                            {notif.city && <small className="notif-location"><FontAwesomeIcon icon={faMapMarkerAlt} /> {notif.city}</small>}
                            {notif.isAutomatic && notif.changeType && (
                              <small className="notif-change-type">Triggered by: {notif.changeType}</small>
                            )}
                          </div>
                        )}
                        {(notif.type === 'health_analysis' || notif.type === 'health_alert') && (
                          <div className="notif-metadata">
                            <small className="health-alert-badge">
                              {notif.type === 'health_alert' && notif.healthAnomaly?.severity === 'critical' ? 
                                <>Critical - Requires Attention</> : 
                                <>Monitor Closely</>}
                            </small>
                          </div>
                        )}
                        <span className="notif-footer">
                          <FontAwesomeIcon icon={faUserMd} /> {notif.doctor} • <FontAwesomeIcon icon={faClock} /> {new Date(notif.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {notif.unread && <div className="dot-indicator"></div>}
                    </div>
                  ))}
                </>
              )}

              {yesterday.length > 0 && (
                <>
                  <h3 className="section-header">Yesterday</h3>
                  {yesterday.map((notif) => (
                    <div
                      key={notif.id}
                      className={`notification-item ${notif.type} ${notif.unread ? 'unread' : ''} ${notif.isAutomatic ? 'automatic-update' : ''} ${notif.type === 'health_alert' ? 'health-alert critical-alert' : ''} ${notif.type === 'health_analysis' ? 'health-alert' : ''}`}
                      onClick={() => openModal(notif)}
                    >
                      <FontAwesomeIcon icon={getNotificationIcon(notif.type, notif.isAutomatic, notif.originalType)} className="notif-icon" />
                      <div className="notif-content">
                        <h3>
                          {notif.title}
                          {notif.isAutomatic && <span className="auto-badge">Auto</span>}
                          {notif.type === 'health_alert' && notif.healthAnomaly?.severity === 'critical' && <span className="critical-badge">Critical</span>}
                        </h3>
                        <p>{notif.message}</p>
                        {notif.type === 'daily_tip' && (
                          <div className="notif-metadata">
                            {notif.city && <small className="notif-location"><FontAwesomeIcon icon={faMapMarkerAlt} /> {notif.city}</small>}
                            {notif.isAutomatic && notif.changeType && (
                              <small className="notif-change-type">Triggered by: {notif.changeType}</small>
                            )}
                          </div>
                        )}
                        {(notif.type === 'health_analysis' || notif.type === 'health_alert') && (
                          <div className="notif-metadata">
                            <small className="health-alert-badge">
                              {notif.type === 'health_alert' && notif.healthAnomaly?.severity === 'critical' ? 
                                <>Critical - Requires Attention</> : 
                                <>Monitor Closely</>}
                            </small>
                          </div>
                        )}
                        <span className="notif-footer">
                          <FontAwesomeIcon icon={faUserMd} /> {notif.doctor} • <FontAwesomeIcon icon={faClock} /> {new Date(notif.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {older.length > 0 && (
                <>
                  <h3 className="section-header">Older</h3>
                  {older.map((notif) => (
                    <div
                      key={notif.id}
                      className={`notification-item ${notif.type} ${notif.unread ? 'unread' : ''} ${notif.isAutomatic ? 'automatic-update' : ''} ${notif.type === 'health_alert' ? 'health-alert critical-alert' : ''} ${notif.type === 'health_analysis' ? 'health-alert' : ''}`}
                      onClick={() => openModal(notif)}
                    >
                      <FontAwesomeIcon icon={getNotificationIcon(notif.type, notif.isAutomatic, notif.originalType)} className="notif-icon" />
                      <div className="notif-content">
                        <h3>
                          {notif.title}
                          {notif.isAutomatic && <span className="auto-badge">Auto</span>}
                          {notif.type === 'health_alert' && notif.healthAnomaly?.severity === 'critical' && <span className="critical-badge">Critical</span>}
                        </h3>
                        <p>{notif.message}</p>
                        {notif.type === 'daily_tip' && (
                          <div className="notif-metadata">
                            {notif.city && <small className="notif-location"><FontAwesomeIcon icon={faMapMarkerAlt} /> {notif.city}</small>}
                            {notif.isAutomatic && notif.changeType && (
                              <small className="notif-change-type">Triggered by: {notif.changeType}</small>
                            )}
                          </div>
                        )}
                        {(notif.type === 'health_analysis' || notif.type === 'health_alert') && (
                          <div className="notif-metadata">
                            <small className="health-alert-badge">
                              {notif.type === 'health_alert' && notif.healthAnomaly?.severity === 'critical' ? 
                                <>Critical - Requires Attention</> : 
                                <>Monitor Closely</>}
                            </small>
                          </div>
                        )}
                        <span className="notif-footer">
                          <FontAwesomeIcon icon={faUserMd} /> {notif.doctor} • <FontAwesomeIcon icon={faClock} /> {new Date(notif.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {selectedNotification && (
          <div className="modal-backdrop" onClick={closeModal}>
            <div
              className={`modal-content ${selectedNotification.type} ${selectedNotification.isAutomatic ? 'automatic-update' : ''} ${selectedNotification.type === 'health_alert' ? 'health-alert critical-alert' : ''} ${selectedNotification.type === 'health_analysis' ? 'health-alert' : ''}`}
              onClick={(e) => e.stopPropagation()}
            >
              <FontAwesomeIcon
                icon={faTimes}
                className="close-icon"
                onClick={closeModal}
              />
              <h2>
                {selectedNotification.title}
                {selectedNotification.isAutomatic && <span className="auto-badge-modal">Automatically Updated</span>}
                {selectedNotification.type === 'health_alert' && selectedNotification.healthAnomaly?.severity === 'critical' && <span className="critical-badge-modal"><FontAwesomeIcon icon={faExclamationTriangle} /> Critical</span>}
              </h2>
              
              {selectedNotification.healthAnalysis ? (
                <div className="health-analysis-details">
                  <div className="health-analysis-section">
                    <h3><FontAwesomeIcon icon={faHeartbeat} /> Health Alert Summary</h3>
                    <div className="vital-signs-grid">
                      {formatHealthAnalysisForModal(selectedNotification.healthAnalysis)?.vitalSigns.map((vital, index) => (
                        <div key={index} className="vital-sign-item">
                          <span className="vital-key">{vital.key}:</span>
                          <span className="vital-value">{vital.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="health-analysis-section">
                    <h3><FontAwesomeIcon icon={faUserMd} /> Medical Explanation</h3>
                    <div className="medical-explanation">
                      {selectedNotification.healthAnalysis.medicalExplanation}
                    </div>
                  </div>
                  
                  <div className="health-analysis-section">
                    <h3><FontAwesomeIcon icon={faLightbulb} /> Preventive Advice</h3>
                    <div className="preventive-advice">
                      {selectedNotification.healthAnalysis.preventiveAdvice}
                    </div>
                  </div>
                  
                  <div className="health-recommendations">
                    <h3><FontAwesomeIcon icon={faExclamationTriangle} /> Immediate Actions</h3>
                    <ul>
                      <li>Review all vital signs with your healthcare provider</li>
                      <li>Monitor symptoms closely over the next 24 hours</li>
                      <li>Keep a record of any unusual symptoms or changes</li>
                      <li>Contact emergency services if you experience severe symptoms</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <>
                  <p><strong>Details:</strong> {selectedNotification.fullMessage}</p>
                  
                  {selectedNotification.healthAnomaly && selectedNotification.healthAnomaly.type !== 'health_analysis' && (
                    <div className="health-anomaly-details">
                      <h3><FontAwesomeIcon icon={faHeartbeat} /> Health Alert Details:</h3>
                      <p><strong>Alert Type:</strong> {selectedNotification.healthAnomaly.type.replace('_', ' ').toUpperCase()}</p>
                      <p><strong>Severity:</strong> {selectedNotification.healthAnomaly.severity.toUpperCase()}</p>
                      {selectedNotification.healthAnomaly.value && (
                        <p>
                          <strong>Reading:</strong> {selectedNotification.healthAnomaly.value} 
                          {selectedNotification.healthAnomaly.type === 'heart_rate' && <> <FontAwesomeIcon icon={faHeartbeat} /> BPM</>}
                          {selectedNotification.healthAnomaly.type === 'oxygen_saturation' && <> <FontAwesomeIcon icon={faLungs} /> %</>}
                          {selectedNotification.healthAnomaly.type === 'temperature' && <> <FontAwesomeIcon icon={faThermometerHalf} /> °</>}
                        </p>
                      )}
                      {selectedNotification.healthAnomaly.systolic && (
                        <p><strong>Blood Pressure:</strong> <FontAwesomeIcon icon={faTint} /> {selectedNotification.healthAnomaly.systolic}/{selectedNotification.healthAnomaly.diastolic} mmHg</p>
                      )}
                      <div className="health-recommendations">
                        <strong>Recommendations:</strong>
                        <ul>
                          {selectedNotification.healthAnomaly.severity === 'critical' ? (
                            <>
                              <li>Seek immediate medical attention</li>
                              <li>Contact your healthcare provider</li>
                              <li>Monitor symptoms closely</li>
                              <li>Do not ignore persistent symptoms</li>
                            </>
                          ) : (
                            <>
                              <li>Monitor readings over the next few hours</li>
                              <li>Contact your healthcare provider if symptoms persist</li>
                              <li>Follow up with routine medical care</li>
                              <li>Note any accompanying symptoms</li>
                            </>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  {selectedNotification.dailyTipData && (
                    <div>
                      <p><strong><FontAwesomeIcon icon={faMapMarkerAlt} /> Location:</strong> {selectedNotification.dailyTipData.city}</p>
                      <p><strong>Update Type:</strong> {selectedNotification.dailyTipData.isAutomatic ? `Automatic (${selectedNotification.dailyTipData.changeType})` : 'Manual refresh'}</p>
                      {selectedNotification.dailyTipData.vitalsTimestamp && (
                        <p><strong><FontAwesomeIcon icon={faClock} /> Based on vitals from:</strong> {new Date(selectedNotification.dailyTipData.vitalsTimestamp).toLocaleString()}</p>
                      )}
                      <div className="daily-tip-full-content">
                        <strong><FontAwesomeIcon icon={faLightbulb} /> Complete Health Tip:</strong>
                        <pre className="daily-tip-modal-text">{selectedNotification.dailyTipData.fullTip}</pre>
                      </div>
                      <p><strong><FontAwesomeIcon icon={faClock} /> Generated:</strong> {new Date(selectedNotification.dailyTipData.generatedAt).toLocaleString()}</p>
                    </div>
                  )}
                </>
              )}
              
              <span className="modal-footer">
                <FontAwesomeIcon icon={faUserMd} /> {selectedNotification.doctor} • <FontAwesomeIcon icon={faClock} /> {new Date(selectedNotification.timestamp).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Notifications;