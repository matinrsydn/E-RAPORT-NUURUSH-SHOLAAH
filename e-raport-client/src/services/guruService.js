import axios from 'axios'
import API_BASE from '../api'

const base = `${API_BASE}/guru`

export async function getAllGuru() { const res = await axios.get(base); return res.data }
export async function getGuruById(id) { const res = await axios.get(`${base}/${id}`); return res.data }

// Create guru. Accepts plain object or FormData (multipart) for signature upload.
export async function createGuru(payload, config = {}) {
	const isForm = typeof FormData !== 'undefined' && payload instanceof FormData
	// IMPORTANT: Do NOT set a manual Content-Type for FormData here.
	// Let the browser / Axios set the proper multipart boundary header.
	const headers = isForm ? { ...(config.headers || {}) } : { 'Content-Type': 'application/json', ...(config.headers || {}) }
	const res = await axios.post(base, payload, { headers, ...config })
	return res.data
}

// Update guru. Accepts object or FormData.
export async function updateGuru(id, payload, config = {}) {
	const isForm = typeof FormData !== 'undefined' && payload instanceof FormData
	// Do not set Content-Type manually for FormData; allow Axios/browser to include boundary
	const headers = isForm ? { ...(config.headers || {}) } : { 'Content-Type': 'application/json', ...(config.headers || {}) }
	const res = await axios.put(`${base}/${id}`, payload, { headers, ...config })
	return res.data
}

export async function deleteGuru(id) { const res = await axios.delete(`${base}/${id}`); return res.data }

export default { getAllGuru, getGuruById, createGuru, updateGuru, deleteGuru }
