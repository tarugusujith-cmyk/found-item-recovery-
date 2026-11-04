import axios from 'axios';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001'),
  timeout: 8000,
});

export async function getList<T>(resource: string, params: Record<string, unknown> = {}): Promise<T[]> {
  return (await http.get<T[]>(`/${resource}`, { params })).data;
}
export async function getOne<T>(resource: string, id: number | string): Promise<T> {
  return (await http.get<T>(`/${resource}/${id}`)).data;
}
export async function createOne<T>(resource: string, body: Record<string, unknown>): Promise<T> {
  return (await http.post<T>(`/${resource}`, body)).data;
}
export async function patchOne<T>(resource: string, id: number | string, body: Record<string, unknown>): Promise<T> {
  return (await http.patch<T>(`/${resource}/${id}`, body)).data;
}
export async function deleteOne(resource: string, id: number | string): Promise<void> {
  await http.delete(`/${resource}/${id}`);
}

export function errMsg(e: unknown): string {
  if (axios.isAxiosError(e)) {
    if (e.code === 'ERR_NETWORK' || e.code === 'ECONNABORTED') return 'Cannot reach the API. Start it with "npm run api" and try again.';
    if (e.response?.status === 404) return 'That record no longer exists.';
    return e.message;
  }
  return e instanceof Error ? e.message : 'Something went wrong. Try again.';
}
