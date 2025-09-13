import axios from 'axios'
import API_BASE from '../api'

const base = `${API_BASE}/kurikulum`

export async function getAllKurikulum(params) {
  const res = await axios.get(base, { params })
  return res.data
}

export async function createKurikulum(payload) {
  const res = await axios.post(base, payload)
  return res.data
}

export async function updateKurikulum(id, payload) {
  const res = await axios.put(`${base}/${id}`, payload)
  return res.data
}

export async function deleteKurikulum(id) {
  const res = await axios.delete(`${base}/${id}`)
  return res.data
}

export default { getAllKurikulum, createKurikulum, updateKurikulum, deleteKurikulum }