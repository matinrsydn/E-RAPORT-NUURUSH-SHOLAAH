import axios from 'axios';
import { create } from 'zustand';

// Type for surat keluar entries
type SuratKeluar = {
  id: number;
  nama_file: string;
  jenis_dokumen: string;
  keterangan?: string;
  created_at: string;
};

interface SuratKeluarStore {
  files: SuratKeluar[];
  loading: boolean;
  error: string | null;
  fetchFiles: () => Promise<void>;
  addFile: (file: SuratKeluar) => void;
  deleteFile: (id: number) => Promise<void>;
}

// Create a store for managing surat keluar state
export const useSuratKeluarStore = create<SuratKeluarStore>((set) => ({
  files: [],
  loading: false,
  error: null,

  fetchFiles: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get('/api/surat-keluar');
      set({ files: response.data, loading: false });
    } catch (error) {
      set({ error: 'Gagal memuat daftar surat', loading: false });
    }
  },

  addFile: (file) => {
    set((state) => ({
      files: [...state.files, file],
    }));
  },

  deleteFile: async (id) => {
    try {
      await axios.delete(`/api/surat-keluar/${id}`);
      set((state) => ({
        files: state.files.filter((file) => file.id !== id),
      }));
    } catch (error) {
      set({ error: 'Gagal menghapus surat' });
    }
  },
}));