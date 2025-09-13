import axios from 'axios'
import API_BASE from '../api'

const base = `${API_BASE}/mata-pelajaran`

export async function getAllMapel(params) { const res = await axios.get(base, { params }); return res.data }
export async function getMapelById(id) { const res = await axios.get(`${base}/${id}`); return res.data }
export async function createMapel(payload) { const res = await axios.post(base, payload); return res.data }
export async function updateMapel(id, payload) { const res = await axios.put(`${base}/${id}`, payload); return res.data }
export async function deleteMapel(id) { const res = await axios.delete(`${base}/${id}`); return res.data }

export default { getAllMapel, getMapelById, createMapel, updateMapel, deleteMapel }
