import api from './client';
import type { SchoolYear, PaginatedResponse } from '@/types/student';

export async function listSchoolYears(params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<SchoolYear>> {
  const { data } = await api.get('/school-years', { params: { limit: 100, ...params } });
  return data;
}

export async function createSchoolYear(input: { year: string; startDate: string; endDate: string }): Promise<SchoolYear> {
  const { data } = await api.post('/school-years', input);
  return data;
}

export async function updateSchoolYear(id: string, input: { year?: string; startDate?: string; endDate?: string }): Promise<SchoolYear> {
  const { data } = await api.patch(`/school-years/${id}`, input);
  return data;
}

export async function activateSchoolYear(id: string): Promise<SchoolYear> {
  const { data } = await api.patch(`/school-years/${id}/activate`);
  return data;
}

export async function promoteStudents(id: string): Promise<{ promoted: number; skipped: number; graduated: number; sourceYear: string; targetYear: string }> {
  const { data } = await api.post(`/school-years/${id}/promote`);
  return data;
}
