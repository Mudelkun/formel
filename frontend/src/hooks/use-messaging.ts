import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { sendMessage } from '@/api/messaging';

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
