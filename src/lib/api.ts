
import axios from 'axios';

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://found-item-recovery.onrender.com/api'
    : 'http://localhost:3001/api');

export const http = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

export async function getList<T>(
  resource: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const response = await http.get<T[]>(`/${resource}`, { params });
  return response.data;
}

export async function getOne<T>(
  resource: string,
  id: number | string
): Promise<T> {
  const response = await http.get<T>(`/${resource}/${id}`);
  return response.data;
}

export async function createOne<T>(
  resource: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await http.post<T>(`/${resource}`, body);
  return response.data;
}

export async function patchOne<T>(
  resource: string,
  id: number | string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await http.patch<T>(`/${resource}/${id}`, body);
  return response.data;
}

export async function deleteOne(
  resource: string,
  id: number | string
): Promise<void> {
  await http.delete(`/${resource}/${id}`);
}

export function errMsg(e: unknown): string {
  if (axios.isAxiosError(e)) {
    if (e.code === 'ERR_NETWORK' || e.code === 'ECONNABORTED') {
      return 'Cannot reach the API. Please try again.';
    }

    if (e.response?.status === 404) {
      return 'Requested API record or endpoint was not found.';
    }

    return e.response?.data?.message || e.message;
  }

  return e instanceof Error ? e.message : 'Something went wrong. Try again.';
}
