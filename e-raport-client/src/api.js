// src/api.js - single source of truth for client-side API base
// We derive API_BASE from REACT_APP_API_URL (expected to be host only, e.g. http://localhost:5000)
// Fallbacks:
// - If not set and app is served by backend, use window.location.origin + '/api'
// - Otherwise fallback to http://localhost:5000/api

const envHost = process.env.REACT_APP_API_URL || '';
let API_BASE = '';

if (envHost && envHost.trim() !== '') {
	// Use provided backend host and append /api
	API_BASE = envHost.replace(/\/$/, '') + '/api';
} else if (typeof window !== 'undefined' && window.location && window.location.origin) {
	// When frontend is served by backend in production
	API_BASE = `${window.location.origin.replace(/\/$/, '')}/api`;
} else {
	API_BASE = 'http://localhost:5000/api';
}

// Derive uploads base by removing the trailing /api segment when present
const UPLOADS_BASE = API_BASE.replace(/\/api\/?$/, '');

export { API_BASE, UPLOADS_BASE };
export default API_BASE;
