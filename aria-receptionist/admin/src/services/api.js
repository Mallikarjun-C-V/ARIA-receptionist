import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE, timeout: 20000 });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('aria_admin_token');
  if (token) cfg.headers['Authorization'] = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r.data,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('aria_admin_token');
      localStorage.removeItem('aria_admin_user');
      window.location.reload();
    }
    return Promise.reject(new Error(err.response?.data?.error || err.message || 'Request failed'));
  }
);

export const login         = (u, p) => api.post('/admin/login', { username: u, password: p });
export const getBookings   = ()      => api.get('/admin/bookings');
export const cancelBooking = (id)    => api.patch(`/admin/bookings/${id}/cancel`);
export const getCapacity   = ()      => api.get('/admin/capacity');
export const getStats      = ()      => api.get('/admin/stats');
export const getConvos     = ()      => api.get('/admin/conversations');
export const healthCheck   = ()      => axios.get(BASE.replace('/api','/health'), { timeout: 4000 }).then(r => r.data).catch(() => null);
