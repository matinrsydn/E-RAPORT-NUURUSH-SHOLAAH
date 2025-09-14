import axios from 'axios'
import API_BASE from '../api'

const base = `${API_BASE}/surat-keluar`;

export async function generateFromTemplate(formData) {
  const res = await axios.post(`${base}/generate-from-template`, formData, {
    responseType: 'blob',
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res;
}

export default { generateFromTemplate };
