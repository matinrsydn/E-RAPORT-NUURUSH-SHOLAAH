import axios from 'axios'
import API_BASE from '../api'

const base = `${API_BASE}/surat-keluar`;

// Keep track of ongoing downloads
const activeDownloads = new Set();

export async function generateFromTemplate(formData) {
  try {
    const res = await axios.post(`${base}/generate-from-template`, formData, {
      responseType: 'blob',
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      // Convert blob error to json
      const text = await error.response.data.text();
      try {
        const json = JSON.parse(text);
        throw new Error(json.message || 'Gagal generate surat');
      } catch {
        throw new Error('Gagal generate surat');
      }
    }
    throw error;
  }
}

export async function uploadSuratKeluar(formData) {
  const res = await axios.post(`${base}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
}

export async function downloadSuratKeluar(filename) {
  // Check if download is already in progress
  if (activeDownloads.has(filename)) {
    throw new Error('Download sedang berlangsung');
  }

  try {
    activeDownloads.add(filename);
    const res = await axios.get(`${base}/download/${filename}`, {
      responseType: 'blob',
      timeout: 30000, // 30 second timeout
    });
    return res;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      // Convert blob error to json
      const text = await error.response.data.text();
      try {
        const json = JSON.parse(text);
        throw new Error(json.message || 'Gagal download file');
      } catch {
        throw new Error('Gagal download file');
      }
    }
    throw error;
  } finally {
    activeDownloads.delete(filename);
  }
}

// Helper function to handle file downloads
export async function handleFileDownload(response, customFilename) {
  try {
    // Create blob URL
    const blob = new Blob([response], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    const url = window.URL.createObjectURL(blob);
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = customFilename;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

export default { 
  generateFromTemplate, 
  uploadSuratKeluar,
  downloadSuratKeluar,
  handleFileDownload
};
