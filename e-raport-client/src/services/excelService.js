import axios from 'axios'
import API_BASE from '../api'

const base = `${API_BASE}/excel`

export async function downloadCompleteTemplate(params) {
  const res = await axios.get(`${base}/download-complete-template`, { params, responseType: 'blob' })
  return res.data
}

export async function uploadCompleteData(formData, onUploadProgress) {
  const res = await axios.post(`${base}/upload-complete-data`, formData, {
    onUploadProgress: function (progressEvent) {
      if (onUploadProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onUploadProgress(percentCompleted)
      }
    }
  })
  return res.data
}

export default { downloadCompleteTemplate, uploadCompleteData }
