import api from './client';
import type { PaginatedResponse } from '@/types/student';

export interface ClassGroup {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface Versement {
  id: string;
  classGroupId: string;
  schoolYearId: string;
  number: number;
  name: string;
  amount: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface FeesResponse {
  bookFee: string;
  feeConfigId: string | null;
  versements: Versement[];
}

export async function listClassGroups(): Promise<PaginatedResponse<ClassGroup>> {
  const { data } = await api.get('/class-groups', { params: { limit: 100 } });
  return data;
}

export async function createClassGroup(input: { name: string }): Promise<ClassGroup> {
  const { data } = await api.post('/class-groups', input);
  return data;
}

export async function updateClassGroup(id: string, input: { name: string }): Promise<ClassGroup> {
  const { data } = await api.patch(`/class-groups/${id}`, input);
  return data;
}

export async function deleteClassGroup(id: string): Promise<void> {
  await api.delete(`/class-groups/${id}`);
}

export async function getFees(classGroupId: string, schoolYearId: string): Promise<FeesResponse> {
  const { data } = await api.get(`/class-groups/${classGroupId}/fees`, { params: { schoolYearId } });
  return data;
}

export async function createFees(classGroupId: string, input: { schoolYearId: string; bookFee: string; versements: { number: number; name: string; amount: string; dueDate: string }[] }): Promise<FeesResponse> {
  const { data } = await api.post(`/class-groups/${classGroupId}/fees`, input);
  return data;
}

export async function updateFees(classGroupId: string, input: { schoolYearId: string; bookFee: string; versements: { number: number; name: string; amount: string; dueDate: string }[] }): Promise<FeesResponse> {
  const { data } = await api.put(`/class-groups/${classGroupId}/fees`, input);
  return data;
}
