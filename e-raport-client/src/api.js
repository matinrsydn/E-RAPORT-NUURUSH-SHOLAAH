// api.js - centralized API base URL for frontend
const API_BASE = process.env.REACT_APP_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:5000/api';
// Derive uploads base by removing the trailing /api segment when present
const UPLOADS_BASE = API_BASE.replace(/\/api\/?$/, '');
export { API_BASE, UPLOADS_BASE };
export default API_BASE;
