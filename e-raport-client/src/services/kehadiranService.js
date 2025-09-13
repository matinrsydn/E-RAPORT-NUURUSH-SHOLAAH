import axios from 'axios'
import API_BASE from '../api'

const base = `${API_BASE}/kehadiran`

export async function getAllKehadiran(params) { const res = await axios.get(base, { params }); return res.data }
export async function getKehadiranById(id) { const res = await axios.get(`${base}/${id}`); return res.data }
export async function createKehadiran(payload) { const res = await axios.post(base, payload); return res.data }
export async function updateKehadiran(id, payload) { const res = await axios.put(`${base}/${id}`, payload); return res.data }
export async function deleteKehadiran(id) { const res = await axios.delete(`${base}/${id}`); return res.data }

export default { getAllKehadiran, getKehadiranById, createKehadiran, updateKehadiran, deleteKehadiran }
