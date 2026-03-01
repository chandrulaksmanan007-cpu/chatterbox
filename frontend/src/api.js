import axios from 'axios';
import { io } from 'socket.io-client';

const BASE_URL = 'http://localhost:5000';

// ─── AXIOS INSTANCE ──────────────────────────────────────────────────────────
const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── SOCKET ───────────────────────────────────────────────────────────────────
let socket = null;

export const connectSocket = (userId, role) => {
  if (socket?.connected) return socket;
  socket = io(BASE_URL, { transports: ['websocket'] });
  socket.on('connect', () => {
    socket.emit('authenticate', { userId, role });
  });
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

// ─── AUTH API ─────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  register: (name, email, password, bio) => api.post('/api/auth/register', { name, email, password, bio }),
  me: () => api.get('/api/auth/me'),
};

// ─── USER API ─────────────────────────────────────────────────────────────────
export const userAPI = {
  getAll: () => api.get('/api/users'),
};

// ─── ADMIN API ────────────────────────────────────────────────────────────────
export const adminAPI = {
  getStats: () => api.get('/api/admin/stats'),
  getPending: () => api.get('/api/admin/pending'),
  getAllUsers: () => api.get('/api/admin/users'),
  approve: (id) => api.post(`/api/admin/approve/${id}`),
  reject: (id) => api.post(`/api/admin/reject/${id}`),
  removeUser: (id) => api.delete(`/api/admin/users/${id}`),
};

// ─── GROUP API ────────────────────────────────────────────────────────────────
export const groupAPI = {
  getMyGroups: () => api.get('/api/groups'),
  create: (name, members, description) => api.post('/api/groups', { name, members, description }),
};

// ─── MESSAGE API ──────────────────────────────────────────────────────────────
export const messageAPI = {
  getMessages: (chatId) => api.get(`/api/messages/${chatId}`),
  uploadFile: (chatId, file) => {
    const form = new FormData();
    form.append('file', file);
    form.append('chatId', chatId);
    return api.post('/api/messages/upload', form);
  },
};

export const getChatKey = (id1, id2) => [id1, id2].sort().join('-');

export default api;
