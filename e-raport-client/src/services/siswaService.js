import apiClient from './apiClient'

const base = `/api/siswa`

export async function getAllSiswa(params) {
  const res = await apiClient.get(base, { params })
  return res.data
}

export async function getSiswaById(id) {
  const res = await apiClient.get(`${base}/${id}`)
  return res.data
}

export async function createSiswa(payload) {
  const res = await apiClient.post(base, payload)
  return res.data
}

export async function updateSiswa(id, payload) {
  const res = await apiClient.put(`${base}/${id}`, payload)
  return res.data
}

export async function deleteSiswa(id) {
  const res = await apiClient.delete(`${base}/${id}`)
  return res.data
}

export default { getAllSiswa, getSiswaById, createSiswa, updateSiswa, deleteSiswa }
