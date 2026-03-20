import api from './client';
import type { PaginatedResponse } from '@/types/student';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'secretary' | 'teacher' | 'accountant';
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export async function listUsers(params: { role?: string; page?: number; limit?: number } = {}): Promise<PaginatedResponse<UserAccount>> {
  const { data } = await api.get('/users', { params: { limit: 20, ...params } });
  return data;
}

export async function createUser(input: { name: string; email: string; password: string; role: string }): Promise<UserAccount> {
  const { data } = await api.post('/users', input);
  return data;
}

export async function getUser(id: string): Promise<UserAccount> {
  const { data } = await api.get(`/users/${id}`);
  return data;
}

export async function updateUser(id: string, input: { name?: string; email?: string; password?: string; role?: string; isActive?: boolean }): Promise<UserAccount> {
  const { data } = await api.patch(`/users/${id}`, input);
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}
