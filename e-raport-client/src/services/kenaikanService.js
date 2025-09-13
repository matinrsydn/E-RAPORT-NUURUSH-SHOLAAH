import axios from 'axios'
import API_BASE from '../api'

const base = `${API_BASE}/kenaikan`

export async function runPromotion(payload) { const res = await axios.post(base, payload); return res.data }
export async function getLogs(params) { const res = await axios.get(`${base}/logs`, { params }); return res.data }

export default { runPromotion, getLogs }
