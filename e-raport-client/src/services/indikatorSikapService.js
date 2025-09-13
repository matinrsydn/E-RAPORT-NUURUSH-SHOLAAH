import axios from 'axios'
import API_BASE from '../api'

const base = `${API_BASE}/indikator-sikap`

export async function getAllIndikatorSikap(params) {
  const res = await axios.get(base, { params })
  return res.data
}

export async function createIndikatorSikap(payload) {
  const res = await axios.post(base, payload)
  return res.data
}

export async function updateIndikatorSikap(id, payload) {
  const res = await axios.put(`${base}/${id}`, payload)
  return res.data
}

export async function deleteIndikatorSikap(id) {
  const res = await axios.delete(`${base}/${id}`)
  return res.data
}

export default { getAllIndikatorSikap, createIndikatorSikap, updateIndikatorSikap, deleteIndikatorSikap }
