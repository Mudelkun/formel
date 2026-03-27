import api from './client';
import type {
  Student,
  StudentDetail,
  Contact,
  StudentDocument,
  BalanceResponse,
  CursorPaginatedResponse,
  CreateStudentInput,
  UpdateStudentInput,
  CreateContactInput,
  UpdateContactInput,
} from '@/types/student';

// ── Students ──────────────────────────────────────────────

export interface StudentFilters {
  name?: string;
  status?: string;
  enrollmentStatus?: string;
  overdue?: string;
  classId?: string;
  scholarship?: string;
  cursor?: string;
  limit?: number;
}

export async function listStudents(params: StudentFilters = {}): Promise<CursorPaginatedResponse<Student>> {
  const { data } = await api.get('/students', { params });
  return data;
}

export async function createStudent(input: CreateStudentInput): Promise<Student> {
  const { data } = await api.post('/students', input);
  return data;
}

export async function getStudent(id: string): Promise<StudentDetail> {
  const { data } = await api.get(`/students/${id}`);
  return data;
}

export async function updateStudent(id: string, input: UpdateStudentInput): Promise<Student> {
  const { data } = await api.patch(`/students/${id}`, input);
  return data;
}

// ── Photo ─────────────────────────────────────────────────

export async function uploadPhoto(studentId: string, file: File): Promise<{ profilePhotoUrl: string }> {
  const formData = new FormData();
  formData.append('photo', file);
  const { data } = await api.post(`/students/${studentId}/photo`, formData);
  return data;
}

// ── Documents ─────────────────────────────────────────────

export async function listDocuments(studentId: string): Promise<{ data: StudentDocument[] }> {
  const { data } = await api.get(`/students/${studentId}/documents`);
  return data;
}

export async function uploadDocument(
  studentId: string,
  file: File,
  documentType: string
): Promise<StudentDocument> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', documentType);
  const { data } = await api.post(`/students/${studentId}/documents`, formData);
  return data;
}

export async function deleteDocument(studentId: string, docId: string): Promise<void> {
  await api.delete(`/students/${studentId}/documents/${docId}`);
}

// ── Contacts ──────────────────────────────────────────────

export async function listContacts(studentId: string): Promise<{ data: Contact[] }> {
  const { data } = await api.get(`/students/${studentId}/contacts`);
  return data;
}

export async function createContact(studentId: string, input: CreateContactInput): Promise<Contact> {
  const { data } = await api.post(`/students/${studentId}/contacts`, input);
  return data;
}

export async function updateContact(
  studentId: string,
  contactId: string,
  input: UpdateContactInput
): Promise<Contact> {
  const { data } = await api.patch(`/students/${studentId}/contacts/${contactId}`, input);
  return data;
}

export async function deleteContact(studentId: string, contactId: string): Promise<void> {
  await api.delete(`/students/${studentId}/contacts/${contactId}`);
}

// ── Promote / Downgrade ──────────────────────────────────

export async function promoteStudent(studentId: string): Promise<{ className: string; gradeLevel: number; graduated?: boolean }> {
  const { data } = await api.post(`/students/${studentId}/promote`);
  return data;
}

export async function downgradeStudent(studentId: string): Promise<{ className: string; gradeLevel: number }> {
  const { data } = await api.post(`/students/${studentId}/downgrade`);
  return data;
}

// ── Balance ───────────────────────────────────────────────

export async function getBalance(studentId: string): Promise<BalanceResponse> {
  const { data } = await api.get(`/students/${studentId}/balance`);
  return data;
}

export async function transferCredit(
  studentId: string,
  body: { from: 'tuition' | 'books'; amount: number }
): Promise<BalanceResponse> {
  const { data } = await api.post(`/students/${studentId}/credit-transfer`, body);
  return data;
}
