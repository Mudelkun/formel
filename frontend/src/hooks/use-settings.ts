import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSettings, updateSettings, type UpdateSettingsInput } from '@/api/settings';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateSettingsInput) => updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Paramètres mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour des paramètres');
    },
  });
}
