import axios from 'axios'
import API_BASE from '../api'

const base = `${API_BASE}/kamar`

export async function getAllKamar() { const res = await axios.get(base); return res.data }
export async function getKamarById(id) { const res = await axios.get(`${base}/${id}`); return res.data }
export async function createKamar(payload) { const res = await axios.post(base, payload); return res.data }
export async function updateKamar(id, payload) { const res = await axios.put(`${base}/${id}`, payload); return res.data }
export async function deleteKamar(id) { const res = await axios.delete(`${base}/${id}`); return res.data }

export default { getAllKamar, getKamarById, createKamar, updateKamar, deleteKamar }
