import apiClient from './apiClient'

const base = `/api/kurikulum`

export async function getAllKurikulum(params) {
  // params can include: { tingkatan_id }
  const res = await apiClient.get(base, { params })
  return res.data
}

export async function createKurikulum(payload) {
  // payload should include tingkatan_id and mapel_ids (array)
  const res = await apiClient.post(base, payload)
  return res.data
}

export async function updateKurikulum(id, payload) {
  const res = await apiClient.put(`${base}/${id}`, payload)
  return res.data
}

export async function deleteKurikulum(id) {
  const res = await apiClient.delete(`${base}/${id}`)
  return res.data
}

export default { getAllKurikulum, createKurikulum, updateKurikulum, deleteKurikulum }