import api from './client';
import type { CreateEnrollmentInput, CursorPaginatedResponse } from '@/types/student';

export type EnrollmentStatus = 'enrolled' | 'transferred' | 'inactive' | 'graduated';

export interface Enrollment {
  id: string;
  studentId: string;
  classId: string;
  schoolYearId: string;
  status: EnrollmentStatus;
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

export async function listEnrollments(params: { schoolYearId?: string; classId?: string; cursor?: string; limit?: number } = {}): Promise<CursorPaginatedResponse<Enrollment>> {
  const { data } = await api.get('/enrollments', { params: { limit: 20, ...params } });
  return data;
}

// ── Scholarships ─────────────────────────────────────────

export interface CreateScholarshipInput {
  type: 'partial' | 'fixed_amount' | 'versement_annulation' | 'book_annulation';
  percentage?: number;
  fixedAmount?: string;
  targetVersementId?: string;
  isBookAnnulation?: boolean;
}

export async function createScholarship(enrollmentId: string, input: CreateScholarshipInput) {
  const { data } = await api.post(`/enrollments/${enrollmentId}/scholarships`, input);
  return data;
}

export interface Scholarship {
  id: string;
  enrollmentId: string;
  type: 'partial' | 'fixed_amount' | 'versement_annulation' | 'book_annulation';
  percentage: string | null;
  fixedAmount: string | null;
  targetVersementId: string | null;
  isBookAnnulation: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export async function listScholarships(enrollmentId: string): Promise<Scholarship[]> {
  const { data } = await api.get(`/enrollments/${enrollmentId}/scholarships`);
  return data;
}

export async function updateScholarship(scholarshipId: string, input: Partial<CreateScholarshipInput>): Promise<Scholarship> {
  const { data } = await api.patch(`/scholarships/${scholarshipId}`, input);
  return data;
}

export async function deleteScholarship(scholarshipId: string): Promise<void> {
  await api.delete(`/scholarships/${scholarshipId}`);
}

// ── Payments ─────────────────────────────────────────────

export interface Payment {
  id: string;
  enrollmentId: string;
  amount: string;
  paymentDate: string;
  paymentMethod: string | null;
  isBookPayment: boolean;
  status: 'pending' | 'completed';
  notes: string | null;
  receiptUrl: string | null;
  createdAt: string;
}

export async function listPayments(enrollmentId: string): Promise<{ data: Payment[] }> {
  const { data } = await api.get(`/enrollments/${enrollmentId}/payments`);
  return data;
}

// ── Enrollment Status ─────────────────────────────────────

export async function updateEnrollmentStatus(enrollmentId: string, status: EnrollmentStatus): Promise<Enrollment> {
  const { data } = await api.patch(`/enrollments/${enrollmentId}`, { status });
  return data;
}
