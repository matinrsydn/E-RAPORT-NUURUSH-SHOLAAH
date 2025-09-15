import axios from 'axios'
import API_BASE from '../api'

const base = `${API_BASE}/templates`

export async function getTemplates() { const res = await axios.get(base); return res.data }
export async function uploadTemplates(formData, config = {}) {
  // formData is expected to be FormData with fields: identitas, nilai, sikap, surat_keluar
  const isForm = typeof FormData !== 'undefined' && formData instanceof FormData
  const headers = isForm ? { ...(config.headers || {}) } : { 'Content-Type': 'application/json', ...(config.headers || {}) }
  const res = await axios.post(`${base}/upload`, formData, { headers, ...config })
  return res.data
}
export async function deleteTemplate(fileName) { const res = await axios.delete(`${base}/${encodeURIComponent(fileName)}`); return res.data }
export async function generateRaport(siswaId, semester, tahunAjaranOrId) {
  // Accept either numeric tahunAjaranId (preferred) or legacy textual tahun_ajaran
  const isId = typeof tahunAjaranOrId === 'number' || (!isNaN(Number(tahunAjaranOrId)) && String(tahunAjaranOrId).trim() !== '');
  const segment = isId ? `${tahunAjaranOrId}` : encodeURIComponent(String(tahunAjaranOrId || ''));
  // prefer id-based route if caller passed a numeric id; fall back to legacy textual route
  const url = isId ? `${base}/generate/${siswaId}/${segment}/${semester}` : `${base}/generate/${siswaId}/${semester}/${segment}`;
  const res = await axios.get(url, { responseType: 'blob' });
  return res.data
}
export async function generateIdentitas(siswaId, format='docx') { const res = await axios.get(`${base}/generate-identitas/${siswaId}`, { params: { format }, responseType: 'blob' }); return res.data }

export default { getTemplates, uploadTemplates, deleteTemplate, generateRaport, generateIdentitas }
