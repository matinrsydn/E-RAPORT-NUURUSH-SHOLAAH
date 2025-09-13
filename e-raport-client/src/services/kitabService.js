import axios from 'axios'
import API_BASE from '../api'

const base = `${API_BASE}/kitab`

export async function getAllKitab(params) { const res = await axios.get(base, { params }); return res.data }
export async function getKitabById(id) { const res = await axios.get(`${base}/${id}`); return res.data }
export async function createKitab(payload) { const res = await axios.post(base, payload); return res.data }
export async function updateKitab(id, payload) { const res = await axios.put(`${base}/${id}`, payload); return res.data }
export async function deleteKitab(id) { const res = await axios.delete(`${base}/${id}`); return res.data }

export default { getAllKitab, getKitabById, createKitab, updateKitab, deleteKitab }
