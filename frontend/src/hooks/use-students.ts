import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listStudents,
  createStudent,
  getStudent,
  updateStudent,
  uploadPhoto,
  listDocuments,
  uploadDocument,
  deleteDocument,
  createContact,
  updateContact,
  deleteContact,
  getBalance,
  transferCredit,
  promoteStudent,
  downgradeStudent,
  type StudentFilters,
} from '@/api/students';
import { listClasses, createClass, updateClass } from '@/api/classes';
import { listSchoolYears, createSchoolYear, activateSchoolYear, promoteStudents } from '@/api/school-years';
import { createEnrollment, updateEnrollmentStatus, createScholarship, listScholarships, updateScholarship, deleteScholarship, listPayments, type CreateScholarshipInput, type EnrollmentStatus } from '@/api/enrollments';
import type {
  CreateStudentInput,
  UpdateStudentInput,
  CreateContactInput,
  UpdateContactInput,
  CreateEnrollmentInput,
} from '@/types/student';

const STALE_30S = 30 * 1000;
const STALE_1M = 60 * 1000;
const STALE_5M = 5 * 60 * 1000;

// ── Students ──────────────────────────────────────────────

export function useStudents(filters: StudentFilters = {}) {
  return useQuery({
    queryKey: ['students', 'list', filters],
    queryFn: () => listStudents(filters),
    placeholderData: keepPreviousData,
    staleTime: STALE_30S,
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: ['students', 'detail', id],
    queryFn: () => getStudent(id),
    enabled: !!id,
    staleTime: STALE_1M,
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStudentInput) => createStudent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', 'list'] });
      toast.success('Élève créé avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la création de l\'élève');
    },
  });
}

export function useUpdateStudent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateStudentInput) => updateStudent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['students', 'list'] });
      toast.success('Élève mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });
}

// ── Photo ─────────────────────────────────────────────────

export function useUploadPhoto(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadPhoto(studentId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', 'detail', studentId] });
      toast.success('Photo mise à jour');
    },
    onError: () => {
      toast.error('Erreur lors de l\'envoi de la photo');
    },
  });
}

// ── Documents ─────────────────────────────────────────────

export function useStudentDocuments(studentId: string) {
  return useQuery({
    queryKey: ['students', studentId, 'documents'],
    queryFn: () => listDocuments(studentId),
    enabled: !!studentId,
    staleTime: STALE_5M,
  });
}

export function useUploadDocument(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, documentType }: { file: File; documentType: string }) =>
      uploadDocument(studentId, file, documentType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', studentId, 'documents'] });
      toast.success('Document ajouté');
    },
    onError: () => {
      toast.error('Erreur lors de l\'envoi du document');
    },
  });
}

export function useDeleteDocument(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => deleteDocument(studentId, docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', studentId, 'documents'] });
      toast.success('Document supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });
}

// ── Contacts ──────────────────────────────────────────────

export function useCreateContact(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateContactInput) => createContact(studentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', 'detail', studentId] });
      toast.success('Contact ajouté');
    },
    onError: () => {
      toast.error('Erreur lors de l\'ajout du contact');
    },
  });
}

export function useUpdateContact(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, data }: { contactId: string; data: UpdateContactInput }) =>
      updateContact(studentId, contactId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', 'detail', studentId] });
      toast.success('Contact mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour du contact');
    },
  });
}

export function useDeleteContact(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) => deleteContact(studentId, contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', 'detail', studentId] });
      toast.success('Contact supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });
}

// ── Balance ───────────────────────────────────────────────

export function useStudentBalance(studentId: string) {
  return useQuery({
    queryKey: ['students', studentId, 'balance'],
    queryFn: () => getBalance(studentId),
    enabled: !!studentId,
    staleTime: STALE_30S,
  });
}

export function useTransferCredit(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { from: 'tuition' | 'books'; amount: number }) =>
      transferCredit(studentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', studentId, 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Crédit transféré avec succès');
    },
    onError: () => {
      toast.error('Erreur lors du transfert de crédit');
    },
  });
}

// ── Supporting ────────────────────────────────────────────

export function useClasses() {
  return useQuery({
    queryKey: ['classes', 'list'],
    queryFn: () => listClasses(),
    staleTime: STALE_5M,
  });
}

export function useSchoolYears() {
  return useQuery({
    queryKey: ['school-years', 'list'],
    queryFn: () => listSchoolYears(),
    staleTime: STALE_5M,
  });
}

export function useCreateEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEnrollmentInput) => createEnrollment(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['students', 'detail', variables.studentId] });
    },
    onError: () => {
      toast.error('Erreur lors de l\'inscription');
    },
  });
}

export function useUpdateEnrollmentStatus(studentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ enrollmentId, status }: { enrollmentId: string; status: EnrollmentStatus }) =>
      updateEnrollmentStatus(enrollmentId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', 'detail', studentId] });
      queryClient.invalidateQueries({ queryKey: ['students', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['students', studentId, 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Statut mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour du statut');
    },
  });
}

// ── Promote / Downgrade ─────────────────────────────────

export function usePromoteStudent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => promoteStudent(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['students', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['students', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['students', id, 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments', 'scholarships'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      if (result.graduated) {
        toast.success('Élève marqué comme diplômé');
      } else {
        toast.success(`Élève promu en ${result.className}`);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erreur lors de la promotion');
    },
  });
}

export function useDowngradeStudent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => downgradeStudent(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['students', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['students', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['students', id, 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments', 'scholarships'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success(`Élève rétrogradé en ${result.className}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Erreur lors de la rétrogradation');
    },
  });
}

// ── Scholarships ────────────────────────────────────────

export function useScholarships(enrollmentId: string | undefined) {
  return useQuery({
    queryKey: ['enrollments', enrollmentId, 'scholarships'],
    queryFn: () => listScholarships(enrollmentId!),
    enabled: !!enrollmentId,
    staleTime: STALE_1M,
  });
}

export function useCreateScholarship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ enrollmentId, data }: { enrollmentId: string; data: CreateScholarshipInput }) =>
      createScholarship(enrollmentId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', variables.enrollmentId, 'scholarships'] });
      queryClient.invalidateQueries({ queryKey: ['students', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Bourse ajoutée');
    },
  });
}

export function useUpdateScholarship(enrollmentId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scholarshipId, data }: { scholarshipId: string; data: Partial<CreateScholarshipInput> }) =>
      updateScholarship(scholarshipId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', enrollmentId, 'scholarships'] });
      queryClient.invalidateQueries({ queryKey: ['students', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Bourse mise à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour de la bourse');
    },
  });
}

export function useDeleteScholarship(enrollmentId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scholarshipId: string) => deleteScholarship(scholarshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', enrollmentId, 'scholarships'] });
      queryClient.invalidateQueries({ queryKey: ['students', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Bourse supprimée');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });
}

// ── Payments ────────────────────────────────────────────

export function usePayments(enrollmentId: string | undefined) {
  return useQuery({
    queryKey: ['enrollments', enrollmentId, 'payments'],
    queryFn: () => listPayments(enrollmentId!),
    enabled: !!enrollmentId,
    staleTime: STALE_30S,
  });
}

// ── School Years ─────────────────────────────────────────

export function useCreateSchoolYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { year: string; startDate: string; endDate: string }) => createSchoolYear(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-years'] });
      toast.success('Année scolaire créée');
    },
    onError: () => {
      toast.error("Erreur lors de la création de l'année scolaire");
    },
  });
}

export function useActivateSchoolYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activateSchoolYear(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-years'] });
      toast.success('Année scolaire activée');
    },
    onError: () => {
      toast.error("Erreur lors de l'activation");
    },
  });
}

export function usePromoteStudents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => promoteStudents(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['students', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      const parts = [`${result.promoted} élèves promus`];
      if (result.graduated > 0) parts.push(`${result.graduated} diplômés`);
      if (result.skipped > 0) parts.push(`${result.skipped} ignorés`);
      toast.success(parts.join(', '));
    },
    onError: () => {
      toast.error('Erreur lors de la promotion');
    },
  });
}

// ── Classes ──────────────────────────────────────────────

export function useCreateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; gradeLevel: number; classGroupId: string }) => createClass(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Classe créée avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la création de la classe');
    },
  });
}

export function useUpdateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; gradeLevel?: number; classGroupId?: string }) =>
      updateClass(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Classe mise à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour de la classe');
    },
  });
}
