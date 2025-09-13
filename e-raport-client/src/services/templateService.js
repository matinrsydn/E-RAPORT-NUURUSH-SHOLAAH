import axios from 'axios'
import API_BASE from '../api'

const base = `${API_BASE}/templates`

export async function getTemplates() { const res = await axios.get(base); return res.data }
export async function uploadTemplates(formData, config = {}) {
  // formData is expected to be FormData with fields: identitas, nilai, sikap
  const isForm = typeof FormData !== 'undefined' && formData instanceof FormData
  const headers = isForm ? { ...(config.headers || {}) } : { 'Content-Type': 'application/json', ...(config.headers || {}) }
  const res = await axios.post(`${base}/upload`, formData, { headers, ...config })
  return res.data
}
export async function deleteTemplate(fileName) { const res = await axios.delete(`${base}/${encodeURIComponent(fileName)}`); return res.data }
export async function generateRaport(siswaId, semester, tahun_ajaran) { const res = await axios.get(`${base}/generate/${siswaId}/${semester}/${tahun_ajaran}`, { responseType: 'blob' }); return res.data }
export async function generateIdentitas(siswaId, format='docx') { const res = await axios.get(`${base}/generate-identitas/${siswaId}`, { params: { format }, responseType: 'blob' }); return res.data }

export default { getTemplates, uploadTemplates, deleteTemplate, generateRaport, generateIdentitas }
