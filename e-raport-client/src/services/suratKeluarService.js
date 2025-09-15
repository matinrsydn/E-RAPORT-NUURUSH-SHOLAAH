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

export async function uploadSuratKeluar(formData) {
  const res = await axios.post(`${base}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
}

export async function downloadSuratKeluar(filename) {
  const res = await axios.get(`${base}/download/${filename}`, {
    responseType: 'blob'
  });
  return res;
}

export default { 
  generateFromTemplate, 
  uploadSuratKeluar,
  downloadSuratKeluar
};
