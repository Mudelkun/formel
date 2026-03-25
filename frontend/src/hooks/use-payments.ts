import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { listAllPayments, getPayment, updatePayment, createPaymentForEnrollment, listPaymentDocuments, uploadPaymentDocument, deletePaymentDocument } from '@/api/payments';

export function usePendingPaymentsCount(enabled: boolean) {
  return useQuery({
    queryKey: ['payments', 'pending-count'],
    queryFn: () => listAllPayments({ status: 'pending', limit: 1 }),
    enabled,
    refetchInterval: 60_000,
    select: (data) => data.pagination.totalCount,
  });
}

export function usePayments(filters: { status?: string; search?: string; classId?: string; classGroupId?: string; cursor?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ['payments', 'list', filters],
    queryFn: () => listAllPayments(filters),
    placeholderData: keepPreviousData,
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: ['payments', 'detail', id],
    queryFn: () => getPayment(id),
    enabled: !!id,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ enrollmentId, file, ...input }: { enrollmentId: string; file: File; amount: string; paymentDate: string; paymentMethod?: string; isBookPayment?: boolean; autoConfirm?: boolean; notes?: string }) =>
      createPaymentForEnrollment(enrollmentId, input, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Paiement enregistré');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || "Erreur lors de l'enregistrement du paiement";
      toast.error(message);
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; status?: string; notes?: string | null }) =>
      updatePayment(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Paiement mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });
}

export function usePaymentDocuments(paymentId: string) {
  return useQuery({
    queryKey: ['payments', paymentId, 'documents'],
    queryFn: () => listPaymentDocuments(paymentId),
    enabled: !!paymentId,
  });
}

export function useUploadPaymentDocument(paymentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadPaymentDocument(paymentId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', paymentId, 'documents'] });
      toast.success('Document ajouté');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || "Erreur lors de l'envoi du document";
      toast.error(message);
    },
  });
}

export function useDeletePaymentDocument(paymentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => deletePaymentDocument(paymentId, docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', paymentId, 'documents'] });
      toast.success('Document supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });
}
