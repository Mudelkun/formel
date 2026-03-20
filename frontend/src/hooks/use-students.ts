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
  type StudentFilters,
} from '@/api/students';
import { listClasses, createClass } from '@/api/classes';
import { listSchoolYears, createSchoolYear, activateSchoolYear, promoteStudents } from '@/api/school-years';
import { createEnrollment } from '@/api/enrollments';
import type {
  CreateStudentInput,
  UpdateStudentInput,
  CreateContactInput,
  UpdateContactInput,
  CreateEnrollmentInput,
} from '@/types/student';

// ── Students ──────────────────────────────────────────────

export function useStudents(filters: StudentFilters = {}) {
  return useQuery({
    queryKey: ['students', 'list', filters],
    queryFn: () => listStudents(filters),
    placeholderData: keepPreviousData,
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: ['students', 'detail', id],
    queryFn: () => getStudent(id),
    enabled: !!id,
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
  });
}

// ── Supporting ────────────────────────────────────────────

export function useClasses() {
  return useQuery({
    queryKey: ['classes', 'list'],
    queryFn: () => listClasses(),
  });
}

export function useSchoolYears() {
  return useQuery({
    queryKey: ['school-years', 'list'],
    queryFn: () => listSchoolYears(),
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
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success(`${result.promoted} élèves promus, ${result.skipped} ignorés`);
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
