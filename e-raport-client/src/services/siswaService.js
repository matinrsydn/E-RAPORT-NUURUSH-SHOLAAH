import axios from 'axios'
import API_BASE from '../api'

const base = `${API_BASE}/siswa`

export async function getAllSiswa(params) {
  const res = await axios.get(base, { params })
  return res.data
}

export async function getSiswaById(id) {
  const res = await axios.get(`${base}/${id}`)
  return res.data
}

export async function createSiswa(payload) {
  const res = await axios.post(base, payload)
  return res.data
}

export async function updateSiswa(id, payload) {
  const res = await axios.put(`${base}/${id}`, payload)
  return res.data
}

export async function deleteSiswa(id) {
  const res = await axios.delete(`${base}/${id}`)
  return res.data
}

export default { getAllSiswa, getSiswaById, createSiswa, updateSiswa, deleteSiswa }
