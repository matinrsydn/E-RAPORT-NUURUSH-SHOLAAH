// api.js - centralized API base URL for frontend
// Priority:
// 1) Explicit build-time env REACT_APP_API_BASE_URL
// 2) Explicit runtime global API_BASE_URL (rare)
// 3) If running in browser and the app is served from the backend, use
//    window.location.origin + '/api' so clients automatically talk to the
//    same host that served the static files.
// 4) Fallback to localhost for local dev tools/tests.
const envBase = process.env.REACT_APP_API_BASE_URL || process.env.API_BASE_URL || '';
let API_BASE = '';
if (envBase && envBase.trim() !== '') {
	API_BASE = envBase.replace(/\/$/, '');
} else if (typeof window !== 'undefined' && window.location && window.location.origin) {
	API_BASE = `${window.location.origin.replace(/\/$/, '')}/api`;
} else {
	API_BASE = 'http://localhost:5000/api';
}

// Derive uploads base by removing the trailing /api segment when present
const UPLOADS_BASE = API_BASE.replace(/\/api\/?$/, '');
export { API_BASE, UPLOADS_BASE };
export default API_BASE;
