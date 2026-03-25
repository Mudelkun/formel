import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { sendMessage, getBulkPreview, sendBulkMessages, getBulkJobStatus, sendStudentPaymentReminder } from '@/api/messaging';
import type { BulkPreviewParams, BulkMessageInput } from '@/api/messaging';

export function useSendMessage() {
  return useMutation({
    mutationFn: (data: { contactId: string; subject: string; body: string }) => sendMessage(data),
    onSuccess: (result) => {
      toast.success(`Email envoyé à ${result.to}`);
    },
    onError: () => {
      toast.error("Erreur lors de l'envoi de l'email");
    },
  });
}

export function useBulkPreview(params: BulkPreviewParams, enabled: boolean) {
  return useQuery({
    queryKey: ['bulk-preview', params],
    queryFn: () => getBulkPreview(params),
    enabled,
    staleTime: 0,
  });
}

export function useSendBulkMessages() {
  return useMutation({
    mutationFn: (input: BulkMessageInput) => sendBulkMessages(input),
  });
}

export function useBulkJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ['bulk-job', jobId],
    queryFn: () => getBulkJobStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'done' || status === 'error' ? false : 2000;
    },
  });
}

export function useSendStudentPaymentReminder() {
  return useMutation({
    mutationFn: (studentId: string) => sendStudentPaymentReminder(studentId),
    onSuccess: (result) => {
      toast.success(`Rappel envoyé à ${result.to}`);
    },
    onError: () => {
      toast.error("Erreur lors de l'envoi du rappel");
    },
  });
}
