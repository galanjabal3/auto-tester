import axios from 'axios';

const isDev = window.location.port === '5173';
const api = axios.create({ baseURL: isDev ? 'http://localhost:3001/api' : '/api' });

api.interceptors.response.use(
  res => res,
  err => {
    console.error('[API Error]', err.config?.method?.toUpperCase(), err.config?.url, err.response?.status, err.message);
    return Promise.reject(err);
  }
);

// Sites
export const getSites = () => api.get('/sites').then(r => r.data);
export const createSite = (data: any) => api.post('/sites', data).then(r => r.data);
export const updateSite = (id: string, data: any) => api.put(`/sites/${id}`, data).then(r => r.data);
export const deleteSite = (id: string) => api.delete(`/sites/${id}`).then(r => r.data);

// Runs
export const getRuns = (siteId?: string) => api.get('/runs', { params: siteId ? { site_id: siteId } : {} }).then(r => r.data);
export const getRun = (id: string) => api.get(`/runs/${id}`).then(r => r.data);
export const getStats = () => api.get('/runs/stats/summary').then(r => r.data);

// Schedules
export const getSchedules = () => api.get('/schedules').then(r => r.data);
export const createSchedule = (data: any) => api.post('/schedules', data).then(r => r.data);
export const deleteSchedule = (id: string) => api.delete(`/schedules/${id}`).then(r => r.data);

// Tests (Codegen)
export const generateTest = (data: { site_id: string; test_name: string; code: string }) =>
  api.post('/tests/generate', data).then(r => r.data);
export const getTestSpecs = (siteId: string) =>
  api.get(`/tests/specs/${siteId}`).then(r => r.data);
