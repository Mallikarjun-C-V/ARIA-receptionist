import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // Increased to 60s for booking operations
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Return full response, not just data, so we can access all properties
    return response.data || response;
  },
  (error) => {
    const message = error.response?.data?.error || error.response?.data?.response || error.message || 'Network error';
    const statusCode = error.response?.status;
    return Promise.reject(new Error(`${message}${statusCode ? ` (${statusCode})` : ''}`));
  }
);

// ─── Chat API ──────────────────────────────────────────────────
export const sendMessage = async (message, sessionId, history = []) => {
  return api.post('/chat', { message, sessionId, history });
};

export const getChatHistory = async (sessionId) => {
  return api.get(`/chat/history/${sessionId}`);
};

// ─── Bookings API ──────────────────────────────────────────────
export const getAllBookings = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  return api.get(`/bookings${params ? '?' + params : ''}`);
};

export const getBooking = async (id) => {
  return api.get(`/bookings/${id}`);
};

export const createBooking = async (data) => {
  return api.post('/bookings', data);
};

export const cancelBooking = async (id) => {
  return api.patch(`/bookings/${id}/cancel`);
};

// ─── Health Check ─────────────────────────────────────────────
export const healthCheck = async () => {
  try {
    const response = await axios.get('http://localhost:5000/health', { timeout: 5000 });
    return { online: true, data: response.data };
  } catch (error) {
    console.warn('Health check failed:', error.message);
    return { online: false, error: error.message };
  }
};

export const getBookingStats = async () => {
  return api.get('/bookings/stats');
};

// ─── Availability API ──────────────────────────────────────────
export const checkAvailability = async (date, time, people) => {
  return api.get(`/availability?date=${date}&time=${time}&people=${people}`);
};

// ─── Conversations API ─────────────────────────────────────────
export const getAllConversations = async () => {
  return api.get('/conversations');
};

// ─── TTS API ──────────────────────────────────────────────────
export const synthesizeSpeech = async (text, voiceId) => {
  const response = await axios.post(
    `${API_BASE}/tts`,
    { text, voiceId },
    { responseType: 'blob', timeout: 15000 }
  );
  return response.data;
};

export default api;
