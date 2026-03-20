import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { listClassGroups, createClassGroup, updateClassGroup, deleteClassGroup, getFees, createFees, updateFees } from '@/api/class-groups';

export function useClassGroups() {
  return useQuery({
    queryKey: ['class-groups', 'list'],
    queryFn: listClassGroups,
  });
}

export function useCreateClassGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => createClassGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-groups'] });
      toast.success('Groupe créé avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la création du groupe');
    },
  });
}

export function useUpdateClassGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateClassGroup(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-groups'] });
      toast.success('Groupe mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });
}

export function useDeleteClassGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteClassGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-groups'] });
      toast.success('Groupe supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });
}

export function useFees(classGroupId: string, schoolYearId: string) {
  return useQuery({
    queryKey: ['fees', classGroupId, schoolYearId],
    queryFn: () => getFees(classGroupId, schoolYearId),
    enabled: !!classGroupId && !!schoolYearId,
  });
}

export function useCreateFees() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classGroupId, ...input }: { classGroupId: string; schoolYearId: string; bookFee: string; versements: { number: number; name: string; amount: string; dueDate: string }[] }) =>
      createFees(classGroupId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      toast.success('Frais configurés avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la configuration des frais');
    },
  });
}

export function useUpdateFees() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classGroupId, ...input }: { classGroupId: string; schoolYearId: string; bookFee: string; versements: { number: number; name: string; amount: string; dueDate: string }[] }) =>
      updateFees(classGroupId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      toast.success('Frais mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour des frais');
    },
  });
}
