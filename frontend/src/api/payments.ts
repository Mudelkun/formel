import api from './client';
import type { CursorPaginatedResponse } from '@/types/student';

export interface Payment {
  id: string;
  amount: string;
  paymentDate: string;
  paymentMethod: string | null;
  isBookPayment: boolean;
  status: 'pending' | 'completed' | 'failed';
  notes: string | null;
  enrollmentId: string;
  createdAt: string;
  studentId?: string;
  studentFirstName?: string;
  studentLastName?: string;
  className?: string;
  schoolYear?: string;
}

export interface PaymentDocument {
  id: string;
  paymentId: string;
  documentName: string;
  documentUrl: string;
  createdAt: string;
}

export async function listAllPayments(params: { status?: string; search?: string; cursor?: string; limit?: number } = {}): Promise<CursorPaginatedResponse<Payment>> {
  const { data } = await api.get('/payments', { params: { limit: 20, ...params } });
  return data;
}

export async function getPayment(id: string): Promise<Payment> {
  const { data } = await api.get(`/payments/${id}`);
  return data;
}

export async function updatePayment(id: string, input: { status?: string; notes?: string | null }): Promise<Payment> {
  const { data } = await api.patch(`/payments/${id}`, input);
  return data;
}

export async function createPaymentForEnrollment(
  enrollmentId: string,
  input: { amount: string; paymentDate: string; paymentMethod?: string; isBookPayment?: boolean; notes?: string },
  file: File,
): Promise<Payment> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('amount', input.amount);
  formData.append('paymentDate', input.paymentDate);
  if (input.paymentMethod) formData.append('paymentMethod', input.paymentMethod);
  if (input.isBookPayment) formData.append('isBookPayment', 'true');
  if (input.notes) formData.append('notes', input.notes);
  const { data } = await api.post(`/enrollments/${enrollmentId}/payments`, formData);
  return data;
}

export async function listPaymentDocuments(paymentId: string): Promise<{ data: PaymentDocument[] }> {
  const { data } = await api.get(`/payments/${paymentId}/documents`);
  return data;
}

export async function uploadPaymentDocument(paymentId: string, file: File): Promise<PaymentDocument> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post(`/payments/${paymentId}/documents`, formData);
  return data;
}

export async function deletePaymentDocument(paymentId: string, docId: string): Promise<void> {
  await api.delete(`/payments/${paymentId}/documents/${docId}`);
}
