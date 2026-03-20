import api from './client';
import type { CreateEnrollmentInput, PaginatedResponse } from '@/types/student';

export interface Enrollment {
  id: string;
  studentId: string;
  classId: string;
  schoolYearId: string;
  createdAt: string;
  updatedAt: string | null;
  studentFirstName?: string;
  studentLastName?: string;
  className?: string;
  schoolYear?: string;
  scholarshipRecipient?: boolean;
}

export async function createEnrollment(input: CreateEnrollmentInput) {
  const { data } = await api.post('/enrollments', input);
  return data;
}

export async function listEnrollments(params: { schoolYearId?: string; classId?: string; page?: number; limit?: number } = {}): Promise<PaginatedResponse<Enrollment>> {
  const { data } = await api.get('/enrollments', { params: { limit: 20, ...params } });
  return data;
}
