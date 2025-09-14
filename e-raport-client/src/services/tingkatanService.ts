// Base path used by the client. In development the CRA dev server sometimes
// serves index.html for unknown paths (returning HTML), so we provide a
// fallback to the backend origin (http://localhost:5000) when running on
// localhost to avoid the "Unexpected token '<'" JSON parse error.
const API_BASE_PATH = '/api/tingkatans';
const BACKEND_ORIGIN = (process.env.REACT_APP_API_BASE && process.env.REACT_APP_API_BASE.replace(/\/$/, '')) || 'http://localhost:5000';
// In development prefer targeting the backend origin directly to avoid the CRA dev
// server returning HTML for unknown API paths (e.g. "Cannot POST /api/..."). If
// REACT_APP_API_BASE is provided we respect it. In production we keep the relative
// path so the app works when served from the same origin as the backend.
const API_BASE = (process.env.REACT_APP_API_BASE
  ? `${process.env.REACT_APP_API_BASE.replace(/\/$/, '')}/api/tingkatans`
  : (process.env.NODE_ENV === 'development' ? `${BACKEND_ORIGIN}/api/tingkatans` : API_BASE_PATH)
);

async function tryFetchWithDevFallback(path: string, opts?: RequestInit) {
  // First try using the provided path (relative or absolute) so production works.
  let res = await fetch(path, opts);
  const ct = res.headers.get('content-type') || '';

  // If the response is not JSON and we're running the dev client locally (CRA dev server
  // often uses localhost or 127.0.0.1), retry against the backend origin. This avoids the
  // CRA dev server returning "Cannot POST /api/..." for API calls and lets us fallback to
  // the actual backend at BACKEND_ORIGIN.
  // Retry against backend origin when response is not JSON and the current
  // frontend origin differs from the backend origin. This covers common local
  // setups where the built app is served from a static server or CRA dev-server
  // and the POST ends up handled by that server instead of the API.
  if ((!ct.includes('application/json')) && typeof window !== 'undefined' && window.location) {
    try {
      const frontendHost = window.location.hostname;
      const backendHost = new URL(BACKEND_ORIGIN).hostname;
      if (frontendHost !== backendHost) {
        const backendUrl = (path.startsWith('http') ? path : `${BACKEND_ORIGIN}${path}`);
        console.log(`↩️ Non-JSON response from ${path}; retrying request against backend ${backendUrl}`);
        try {
          res = await fetch(backendUrl, opts);
        } catch (e) {
          console.warn('Fallback fetch to backend failed', e);
        }
      }
    } catch (e) {
      // If URL parsing fails for some reason, don't block the original response
    }
  }
  return res;
}

export interface Tingkatan {
  id: number;
  nama_tingkatan: string;
  urutan?: number;
  createdAt?: string;
  updatedAt?: string;
}

export async function getAllTingkatans(): Promise<Tingkatan[]> {
  const res = await tryFetchWithDevFallback(API_BASE);
  if (!res.ok) {
    const txt = await res.text().catch(()=>'<no-body>')
    throw new Error(`Failed to fetch tingkatans: ${res.status} ${txt}`)
  }
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('application/json')) {
    const txt = await res.text().catch(()=>'<no-body>')
    throw new Error(`Unexpected non-JSON response fetching tingkatans: ${txt}`)
  }
  return res.json();
}

export async function createTingkatan(payload: Partial<Tingkatan>): Promise<Tingkatan> {
  const res = await tryFetchWithDevFallback(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(()=>'<no-body>')
    throw new Error(`Failed to create tingkatan: ${res.status} ${txt}`)
  }
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('application/json')) {
    const txt = await res.text().catch(()=>'<no-body>')
    throw new Error(`Unexpected non-JSON response creating tingkatan: ${txt}`)
  }
  return res.json();
}

export async function updateTingkatan(id: number, payload: Partial<Tingkatan>): Promise<Tingkatan> {
  const res = await tryFetchWithDevFallback(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(()=>'<no-body>')
    throw new Error(`Failed to update tingkatan: ${res.status} ${txt}`)
  }
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('application/json')) {
    const txt = await res.text().catch(()=>'<no-body>')
    throw new Error(`Unexpected non-JSON response updating tingkatan: ${txt}`)
  }
  return res.json();
}

export async function deleteTingkatan(id: number): Promise<void> {
  const res = await tryFetchWithDevFallback(`${API_BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const txt = await res.text().catch(()=>'<no-body>')
    throw new Error(`Failed to delete tingkatan: ${res.status} ${txt}`)
  }
}
