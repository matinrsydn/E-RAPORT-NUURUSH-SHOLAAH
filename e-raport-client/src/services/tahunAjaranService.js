import axios from 'axios'
import API_BASE from '../api'

const base = `${API_BASE}/tahun-ajaran`

export async function getAllTahunAjaran() { const res = await axios.get(base); return res.data }
export async function getTahunAjaranById(id) { const res = await axios.get(`${base}/${id}`); return res.data }
export async function createTahunAjaran(payload) { const res = await axios.post(base, payload); return res.data }
export async function updateTahunAjaran(id, payload) { const res = await axios.put(`${base}/${id}`, payload); return res.data }
export async function deleteTahunAjaran(id) { const res = await axios.delete(`${base}/${id}`); return res.data }

export default { getAllTahunAjaran, getTahunAjaranById, createTahunAjaran, updateTahunAjaran, deleteTahunAjaran }
