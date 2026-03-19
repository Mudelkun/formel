import api from './client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'secretary' | 'teacher' | 'accountant';
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

interface AuthResponse {
  accessToken: string;
  user: User;
}

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
  return data;
}

export async function refreshApi(): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/refresh');
  return data;
}

export async function logoutApi(): Promise<void> {
  await api.post('/auth/logout');
}
