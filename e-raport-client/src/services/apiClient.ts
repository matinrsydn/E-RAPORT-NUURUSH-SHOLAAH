import axios from 'axios';

const base = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');

const apiClient = axios.create({
  baseURL: base,
  withCredentials: false,
  headers: {
    'Accept': 'application/json'
  }
});

export default apiClient;
