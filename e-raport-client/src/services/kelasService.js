import axios from 'axios'
import API_BASE from '../api'

const base = `${API_BASE}/kelas`

export async function getAllKelas() { const res = await axios.get(base); return res.data }
export async function getKelasById(id) { const res = await axios.get(`${base}/${id}`); return res.data }
export async function createKelas(payload) { const res = await axios.post(base, payload); return res.data }
export async function updateKelas(id, payload) { const res = await axios.put(`${base}/${id}`, payload); return res.data }
export async function deleteKelas(id) { const res = await axios.delete(`${base}/${id}`); return res.data }

export default { getAllKelas, getKelasById, createKelas, updateKelas, deleteKelas }
