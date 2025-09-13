import axios from 'axios'
import API_BASE from '../api'

const base = `${API_BASE}/nilai`

export async function getAllNilai(params) { const res = await axios.get(base, { params }); return res.data }
export async function getNilaiById(id) { const res = await axios.get(`${base}/${id}`); return res.data }
export async function createNilai(payload) { const res = await axios.post(base, payload); return res.data }
export async function updateNilai(id, payload) { const res = await axios.put(`${base}/${id}`, payload); return res.data }
export async function deleteNilai(id) { const res = await axios.delete(`${base}/${id}`); return res.data }

export default { getAllNilai, getNilaiById, createNilai, updateNilai, deleteNilai }
