import api from './client';
import type { ClassItem, PaginatedResponse } from '@/types/student';

export async function listClasses(params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<ClassItem>> {
  const { data } = await api.get('/classes', { params: { limit: 100, ...params } });
  return data;
}

export async function createClass(input: { name: string; gradeLevel: number; classGroupId: string }): Promise<ClassItem> {
  const { data } = await api.post('/classes', input);
  return data;
}

export async function updateClass(id: string, input: { name?: string; gradeLevel?: number; classGroupId?: string }): Promise<ClassItem> {
  const { data } = await api.patch(`/classes/${id}`, input);
  return data;
}
