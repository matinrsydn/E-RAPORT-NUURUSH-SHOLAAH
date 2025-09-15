import apiClient from './apiClient'

const base = `/api/kelas`

export async function getAllKelas(qs = '') { const url = qs ? `${base}${qs}` : base; const res = await apiClient.get(url); return res.data }
export async function getKelasById(id) { const res = await apiClient.get(`${base}/${id}`); return res.data }
export async function getKelasByTingkatan(tingkatanId) { const res = await apiClient.get(`${base}?tingkatan_id=${tingkatanId}`); return res.data }
export async function createKelas(payload) { const res = await apiClient.post(base, payload); return res.data }
export async function updateKelas(id, payload) { const res = await apiClient.put(`${base}/${id}`, payload); return res.data }
export async function deleteKelas(id) { const res = await apiClient.delete(`${base}/${id}`); return res.data }

export default { getAllKelas, getKelasById, getKelasByTingkatan, createKelas, updateKelas, deleteKelas }
