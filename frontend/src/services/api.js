import axios from 'axios';
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });
api.interceptors.response.use((response) => response, (error) => {
  const message = error.response?.data?.message || error.message || 'Request failed';
  return Promise.reject(new Error(message));
});
export default api;
