import axios from 'axios';
import API_BASE from '../api'

/**
 * Raport service - thin wrappers around /api/raports endpoints
 */
const raportService = {
  getRaportList: async () => {
    const res = await axios.get(`${API_BASE}/raports`);
    return res.data;
  },

  getRaportData: async (siswaId, tahunAjaran, semester) => {
    const res = await axios.get(`${API_BASE}/raports/${siswaId}/${tahunAjaran}/${semester}`);
    return res.data;
  },

  saveValidatedRaport: async (payload) => {
    const res = await axios.post(`${API_BASE}/raports/save-validated`, payload);
    return res.data;
  },

  // Generator endpoints (return binary/docx stream)
  generateIdentitas: (siswaId) => axios.get(`${API_BASE}/raports/generate/identitas/${siswaId}`, { responseType: 'blob' }),
  generateNilai: (siswaId, tahunAjaranId, semester) => axios.get(`${API_BASE}/raports/generate/nilai/${siswaId}/${tahunAjaranId}/${semester}`, { responseType: 'blob' }),
  generateSikap: (siswaId, tahunAjaranId, semester) => axios.get(`${API_BASE}/raports/generate/sikap/${siswaId}/${tahunAjaranId}/${semester}`, { responseType: 'blob' }),

  // Update endpoints used by ManajemenRaportPage and Validasi
  updateNilaiUjian: async (id, data) => {
    const res = await axios.put(`${API_BASE}/raports/nilai-ujian/${id}`, data);
    return res.data;
  },

  updateNilaiHafalan: async (id, data) => {
    const res = await axios.put(`${API_BASE}/raports/nilai-hafalan/${id}`, data);
    return res.data;
  },

  updateKehadiran: async (id, data) => {
    const res = await axios.put(`${API_BASE}/raports/kehadiran/${id}`, data);
    return res.data;
  },

  updateSikap: async (id, data) => {
    const res = await axios.put(`${API_BASE}/raports/sikap/${id}`, data);
    return res.data;
  },

  updateCatatan: async (id, data) => {
    const res = await axios.put(`${API_BASE}/raports/catatan/${id}`, data);
    return res.data;
  }
};

export default raportService;
