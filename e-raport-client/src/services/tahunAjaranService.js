import axios from 'axios'
import API_BASE from '../api'

const base = `${API_BASE}/tahun-ajaran`
const masterBase = `${API_BASE}/master-tahun-ajaran`

export async function getAllTahunAjaran(params = {}) { const res = await axios.get(base, { params }); return res.data }
export async function getForPromosi() { const res = await axios.get(base, { params: { semester: 2, uniqueByName: true } }); return res.data }
export async function getForTargetPromosi() { const res = await axios.get(base, { params: { semester: 1, uniqueByName: true } }); return res.data }
export async function getTahunAjaranById(id) { const res = await axios.get(`${base}/${id}`); return res.data }
export async function getAllMasterTahunAjaran() { const res = await axios.get(masterBase); return res.data }
export async function getPeriodesForMaster(masterId) { const res = await axios.get(base, { params: { master_tahun_ajaran_id: masterId } }); return res.data }
export async function getSemesterOnePeriode(masterId) { 
	const res = await axios.get(base, { params: { master_tahun_ajaran_id: masterId } });
	const list = res.data || [];
	// prefer numeric or string '1'
	const found = list.find(p => String(p.semester) === '1');
	return found || null;
}
export async function createTahunAjaran(payload) { const res = await axios.post(base, payload); return res.data }
export async function updateTahunAjaran(id, payload) { const res = await axios.put(`${base}/${id}`, payload); return res.data }
export async function deleteTahunAjaran(id) { const res = await axios.delete(`${base}/${id}`); return res.data }
export async function createMasterTahunAjaran(payload) { const res = await axios.post(masterBase, payload); return res.data }
export async function updateMasterTahunAjaran(id, payload) { const res = await axios.put(`${masterBase}/${id}`, payload); return res.data }
export async function deleteMasterTahunAjaran(id) { const res = await axios.delete(`${masterBase}/${id}`); return res.data }

export default { getAllTahunAjaran, getForPromosi, getForTargetPromosi, getTahunAjaranById, getAllMasterTahunAjaran, getPeriodesForMaster, getSemesterOnePeriode, createTahunAjaran, updateTahunAjaran, deleteTahunAjaran, createMasterTahunAjaran, updateMasterTahunAjaran, deleteMasterTahunAjaran }
