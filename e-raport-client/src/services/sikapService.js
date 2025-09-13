import axios from 'axios'
import API_BASE from '../api'

const base = `${API_BASE}/sikap`

export async function getAllSikap(params) {
  const res = await axios.get(base, { params })
  return res.data
}

export async function createSikap(payload) {
  const res = await axios.post(base, payload)
  return res.data
}

export async function updateSikap(id, payload) {
  const res = await axios.put(`${base}/${id}`, payload)
  return res.data
}

export async function deleteSikap(id) {
  const res = await axios.delete(`${base}/${id}`)
  return res.data
}

export default { getAllSikap, createSikap, updateSikap, deleteSikap }
