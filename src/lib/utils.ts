export const todayStr = () => new Date().toISOString().slice(0, 10);
export const isFuture = (d: string) => d > todayStr();

export function fmtDate(d?: string | null) {
  if (!d) return '—';
  const dt = new Date(d.length === 10 ? d + 'T00:00:00' : d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Resize an image file to a small JPEG data URL so it fits comfortably in JSON Server. */
export function readImage(file: File, maxSize = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Choose an image file (JPG, PNG or WebP).'));
    if (file.size > 8 * 1024 * 1024) return reject(new Error('Image is larger than 8 MB.'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not read that image.'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export interface FilterState {
  q: string; categoryId: string; location: string; dateFrom: string; dateTo: string; status: string; sort: 'newest' | 'oldest';
}
export const emptyFilters: FilterState = { q: '', categoryId: '', location: '', dateFrom: '', dateTo: '', status: '', sort: 'newest' };

export interface Filterable { categoryId: number; location: string; date: string; status: string; createdAt: string; text: string }

export function filterSort<T>(items: T[], f: FilterState, get: (t: T) => Filterable): T[] {
  const q = f.q.trim().toLowerCase();
  const loc = f.location.trim().toLowerCase();
  const out = items.filter((it) => {
    const g = get(it);
    if (q && !g.text.toLowerCase().includes(q)) return false;
    if (f.categoryId && g.categoryId !== Number(f.categoryId)) return false;
    if (loc && !g.location.toLowerCase().includes(loc)) return false;
    if (f.dateFrom && g.date < f.dateFrom) return false;
    if (f.dateTo && g.date > f.dateTo) return false;
    if (f.status && g.status !== f.status) return false;
    return true;
  });
  out.sort((a, b) => {
    const d = get(a).createdAt.localeCompare(get(b).createdAt);
    return f.sort === 'newest' ? -d : d;
  });
  return out;
}
