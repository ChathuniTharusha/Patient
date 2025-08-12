import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import '../../css/ChatWindow.css';

// Use environment variable or fallback to production URL
const WS_URL = process.env.REACT_APP_WS_URL || 'wss://13.60.49.202:8000/api';
const BASE_URL = 'https://13.60.49.202:8000/api';

const ChatWindow = () => {
  const { user, logout } = useContext(AuthContext);
  const [chatRooms, setChatRooms] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [newChatUsername, setNewChatUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState({ rooms: false, users: false, online: false, messages: false });
  const [joinedRooms, setJoinedRooms] = useState(new Set());
  const [pendingMessages, setPendingMessages] = useState([]);

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnect = 5;

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const sendOrQueueMessage = (message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      setPendingMessages(prev => [...prev, message]);
      setError('Connecting to chat server, please wait...');
    }
  };

  const initWebSocket = (token, username) => {
    if (!token || !username) {
      console.error('Missing token or username for WebSocket:', { token, username });
      setError('No user authenticated. Please login.');
      return;
    }

    const wsUrl = `${WS_URL}/ws/${token}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected successfully to:', wsUrl);
      reconnectAttempts.current = 0;
      setError(''); // Clear any connection-related errors
      // Send pending messages
      pendingMessages.forEach(message => wsRef.current.send(JSON.stringify(message)));
      setPendingMessages([]);
      // Request chat rooms
      sendOrQueueMessage({ type: 'fetch_rooms' });
      // Join existing rooms
      chatRooms.forEach(room => {
        const roomId = room.room_id;
        if (!joinedRooms.has(roomId)) {
          sendOrQueueMessage({ type: 'join_room', room_id: roomId });
          setJoinedRooms(prev => new Set(prev).add(roomId));
        }
      });
    };

    wsRef.current.onmessage = e => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'chat_message') {
          const messageData = msg.message || msg;
          const roomId = messageData.room_id;
          const newMessage = {
            id: messageData.id || Date.now(),
            content: messageData.content || '',
            sender_username: messageData.sender_username || messageData.sender || username,
            receiver_username: messageData.receiver_username || (messageData.sender_username === username ? selectedRoom?.other_user?.username : username),
            timestamp: messageData.timestamp || new Date().toISOString(),
            room_id: roomId,
            sender_type: messageData.sender_type || (messageData.sender_username === username ? 'patient' : 'doctor'),
            receiver_type: messageData.receiver_type || (messageData.sender_username === username ? 'doctor' : 'patient'),
            message_type: messageData.message_type || 'text',
          };
          setMessages(prev => {
            if (!prev.some(m => m.id === newMessage.id)) {
              return [...prev, newMessage];
            }
            return prev;
          });
          scrollToBottom();
        } else if (msg.type === 'join_room') {
          console.log(`Joined room: ${msg.room_id}`);
        } else if (msg.type === 'chat_rooms') {
          console.log('Received chat rooms:', msg.rooms);
          setChatRooms(msg.rooms?.map(room => ({
            room_id: room.room_id,
            other_user: {
              username: room.current_user === username ? room.receiver_username : room.current_user,
              userType: room.current_user === username ? room.receiver_type : room.current_user_type,
            },
          })) || []);
          setLoading(prev => ({ ...prev, rooms: false }));
        } else if (msg.type === 'messages') {
          console.log('Received messages for room:', msg.room_id, msg.messages);
          setMessages(msg.messages?.map(msg => ({
            ...msg,
            room_id: msg.room_id,
            sender_type: msg.sender_username === username ? 'patient' : 'doctor',
            receiver_type: msg.sender_username === username ? 'doctor' : 'patient',
            message_type: msg.message_type || 'text',
          })) || []);
          setLoading(prev => ({ ...prev, messages: false }));
          scrollToBottom();
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
        setError('Error processing message');
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Chat connection error');
    };

    wsRef.current.onclose = (event) => {
      console.log(`WebSocket closed with code: ${event.code}, reason: ${event.reason}`);
      if (reconnectAttempts.current < maxReconnect) {
        reconnectAttempts.current++;
        setError(`Reconnecting to chat server (attempt ${reconnectAttempts.current}/${maxReconnect})...`);
        setTimeout(() => initWebSocket(token, username), 1000 * Math.pow(2, reconnectAttempts.current));
      } else {
        console.error('WebSocket reconnection failed after max attempts');
        setError('Chat connection lost. Please refresh the page.');
      }
    };
  };

  const fetchJson = async (url, cb, key) => {
    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      const token = user?.authToken || localStorage.getItem('authToken');
      if (!token) throw new Error('No authentication token found');
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      console.log(`Fetched ${key}:`, data);
      if (!res.ok) throw new Error(data.detail || `Failed fetch ${key}`);
      cb(data);
    } catch (err) {
      console.error(`Fetch ${key} error:`, err);
      setError(err.message);
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const createChatRoom = async () => {
    if (!newChatUsername.trim()) {
      setError('Please enter a valid username');
      return;
    }
    if (!user?.authToken) {
      setError('Authentication required');
      logout();
      return;
    }
    setLoading(prev => ({ ...prev, rooms: true }));
    try {
      const response = await fetch(`${BASE_URL}/chat/create-room`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiver_username: newChatUsername.trim(),
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create chat room');
      }
      const newRoom = await response.json();
      setChatRooms(prev => [...prev, {
        room_id: newRoom.room_id,
        other_user: {
          username: newRoom.current_user === user.username ? newRoom.receiver_username : newRoom.current_user,
          userType: newRoom.current_user === user.username ? 'doctor' : 'patient',
        },
      }]);
      setNewChatUsername('');
      setError('');
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendOrQueueMessage({
          type: 'join_room',
          room_id: newRoom.room_id,
        });
        setJoinedRooms(prev => new Set(prev).add(newRoom.room_id));
      } else {
        setPendingMessages(prev => [...prev, {
          type: 'join_room',
          room_id: newRoom.room_id,
        }]);
        setJoinedRooms(prev => new Set(prev).add(newRoom.room_id));
      }
    } catch (err) {
      console.error('Error creating chat room:', err);
      setError(err.message);
    } finally {
      setLoading(prev => ({ ...prev, rooms: false }));
    }
  };

  useEffect(() => {
    const token = user?.authToken || localStorage.getItem('authToken');
    const username = user?.username || localStorage.getItem('username');
    if (token && username) {
      fetchJson(`${BASE_URL}/chat/available-users`, data => {
        console.log('Available users data:', data);
        setAvailableUsers(data.available_users?.map(u => ({
          username: u.username,
          userType: u.user_type,
        })) || []);
      }, 'users');
      fetchJson(`${BASE_URL}/chat/online-status`, data => {
        console.log('Online users data:', data);
        setOnlineUsers(data.online_users || []);
      }, 'online');
      initWebSocket(token, username);
    } else {
      console.error('Initialization failed: Missing token or username', { token, username });
      setError('No user authenticated. Please login.');
    }

    return () => wsRef.current?.readyState === WebSocket.OPEN && wsRef.current.close();
  }, [user]);

  useEffect(() => {
    if (selectedRoom?.other_user?.username) {
      const username = user?.username || localStorage.getItem('username');
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        if (!joinedRooms.has(selectedRoom.room_id)) {
          sendOrQueueMessage({ type: 'join_room', room_id: selectedRoom.room_id });
          setJoinedRooms(prev => new Set(prev).add(selectedRoom.room_id));
        }
        setLoading(prev => ({ ...prev, messages: true }));
        sendOrQueueMessage({
          type: 'fetch_messages',
          room_id: selectedRoom.room_id,
        });
      } else {
        setPendingMessages(prev => [
          ...prev,
          { type: 'join_room', room_id: selectedRoom.room_id },
          { type: 'fetch_messages', room_id: selectedRoom.room_id },
        ]);
        setJoinedRooms(prev => new Set(prev).add(selectedRoom.room_id));
        setLoading(prev => ({ ...prev, messages: true }));
      }
    }
  }, [selectedRoom]);

  const onSend = e => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || !selectedRoom) {
      setError('Select a user and enter a message.');
      return;
    }

    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected:', wsRef.current?.readyState);
      setPendingMessages(prev => [
        ...prev,
        {
          type: 'chat_message',
          message: {
            room_id: selectedRoom.room_id,
            content,
            sender_username: user?.username || localStorage.getItem('username'),
            sender_type: user?.userType || localStorage.getItem('userType') || 'patient',
            receiver_username: selectedRoom.other_user.username,
            receiver_type: selectedRoom.other_user.userType || 'doctor',
            message_type: 'text',
          },
        },
      ]);
      setError('Connecting to chat server, please wait...');
      return;
    }

    const username = user?.username || localStorage.getItem('username');
    const userType = user?.userType || localStorage.getItem('userType') || 'patient';
    const msg = {
      type: 'chat_message',
      message: {
        room_id: selectedRoom.room_id,
        content,
        sender_username: username,
        sender_type: userType,
        receiver_username: selectedRoom.other_user.username,
        receiver_type: selectedRoom.other_user.userType || 'doctor',
        message_type: 'text',
      },
    };
    try {
      wsRef.current.send(JSON.stringify(msg));
      setMessages(prev => [...prev, {
        id: Date.now(),
        content: msg.message.content,
        sender_username: msg.message.sender_username,
        receiver_username: msg.message.receiver_username,
        timestamp: new Date().toISOString(),
        room_id: msg.message.room_id,
        sender_type: msg.message.sender_type,
        receiver_type: msg.message.receiver_type,
        message_type: msg.message.message_type,
      }]);
      setNewMessage('');
      scrollToBottom();
    } catch (err) {
      console.error('Failed to send WebSocket message:', err);
      setError('Failed to send message. Please try again.');
    }
  };

  return (
    <Layout title="Chat">
      <div className="chat-container">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Chat with Doctors</h2>
        {error && <div className="error-text" role="alert">{error}</div>}

        <div className="chat-layout">
          <div className="users-sidebar">
            <h4 className="sub-title">Create New Chat</h4>
            <div className="message-form">
              <input
                type="text"
                placeholder="Search patients or doctors..."
                value={newChatUsername}
                onChange={e => setNewChatUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createChatRoom()}
                className="message-input search-input"
              />
              <button
                type="button"
                className="search-btn"
                onClick={createChatRoom}
                disabled={loading.rooms}
              >
                <FontAwesomeIcon icon={faSearch} />
              </button>
            </div>
            <h4 className="sub-title">Chat Rooms</h4>
            <ul className="users-list">
              {loading.rooms ? (
                <li>Loading chat rooms...</li>
              ) : chatRooms.length === 0 ? (
                <li>No chat rooms available</li>
              ) : (
                chatRooms.map(room => (
                  <li
                    key={room.room_id}
                    className={`user-item ${selectedRoom?.room_id === room.room_id ? 'active' : ''}`}
                    onClick={() => setSelectedRoom(room)}
                  >
                    <div className="user-info">
                      <span className="user-name">{room.other_user.username}</span>
                      <span className={`status-dot ${onlineUsers.includes(room.other_user.username) ? 'online' : 'offline'}`} />
                    </div>
                  </li>
                ))
              )}
            </ul>
            <h4 className="sub-title">Available Doctors</h4>
            <ul className="users-list">
              {loading.users ? (
                <li>Loading doctors...</li>
              ) : availableUsers.length === 0 ? (
                <li>No doctors available</li>
              ) : (
                availableUsers.map(user => (
                  <li
                    key={user.username}
                    className={`user-item ${selectedRoom?.other_user?.username === user.username ? 'active' : ''}`}
                    onClick={() => {
                      const existingRoom = chatRooms.find(r => r.other_user.username === user.username);
                      setSelectedRoom(existingRoom || {
                        room_id: `temp_${user.username}`,
                        other_user: { username: user.username, userType: user.userType },
                      });
                    }}
                  >
                    <div className="user-info">
                      <span className="user-name">{user.username}</span>
                      <span className={`status-dot ${onlineUsers.includes(user.username) ? 'online' : 'offline'}`} />
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="chat-window">
            {selectedRoom ? (
              <>
                <div className="chat-header">
                  <h3>{selectedRoom.other_user.username}</h3>
                  <span className={`status-text ${onlineUsers.includes(selectedRoom.other_user.username) ? 'online' : 'offline'}`}>
                    {onlineUsers.includes(selectedRoom.other_user.username) ? 'Online' : 'Offline'}
                  </span>
                </div>

                <div className="messages-container">
                  {loading.messages ? (
                    <p>Loading messages...</p>
                  ) : !messages.length ? (
                    <div className="no-chat">
                      <span className="no-chat-icon">🫶</span>
                      <p>Select a contact to start chatting</p>
                      <p className="no-chat-subtext">Secure, instant communication with your care team</p>
                    </div>
                  ) : error ? (
                    <p className="error-text">{error}</p>
                  ) : (
                    <>
                      {messages
                        .filter(msg => msg.room_id === selectedRoom.room_id || (selectedRoom.room_id.startsWith('temp_') && msg.receiver_username === selectedRoom.other_user.username))
                        .map(msg => (
                          <div
                            key={msg.id}
                            className={`message ${msg.sender_username === (user?.username || localStorage.getItem('username')) ? 'sent' : 'received'}`}
                          >
                            <span className="message-content">{msg.content || 'No content'}</span>
                            <span className="message-timestamp">
                              {new Date(msg.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {msg.sender_username === (user?.username || localStorage.getItem('username')) && (
                              <span className="read-receipt">✓✓</span>
                            )}
                          </div>
                        ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                <form className="message-form" onSubmit={onSend}>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    className="message-input"
                  />
                  <button type="submit" className="send-btn">
                    <FontAwesomeIcon icon={faPaperPlane} />
                  </button>
                </form>
              </>
            ) : (
              <div className="no-chat">
                <span className="no-chat-icon">🫶</span>
                <p>Select a contact to start chatting</p>
                <p className="no-chat-subtext">Secure, instant communication with your care team</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ChatWindow;