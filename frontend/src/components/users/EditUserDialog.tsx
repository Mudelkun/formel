import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUpdateUser } from '@/hooks/use-users';
import type { UserAccount } from '@/api/users';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const editUserSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(100),
  password: z.string()
    .min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, 'Doit contenir une majuscule')
    .regex(/[0-9]/, 'Doit contenir un chiffre')
    .optional().or(z.literal('')),
  role: z.enum(['admin', 'secretary', 'teacher', 'accountant'], { error: 'Rôle requis' }),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

interface Props {
  user: UserAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditUserDialog({ user: editUser, open, onOpenChange }: Props) {
  const updateUser = useUpdateUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: editUser.name,
      password: '',
      role: editUser.role,
    },
  });

  // Reset form when user prop changes
  useEffect(() => {
    reset({
      name: editUser.name,
      password: '',
      role: editUser.role,
    });
  }, [editUser, reset]);

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  async function onSubmit(data: EditUserFormData) {
    try {
      await updateUser.mutateAsync({
        id: editUser.id,
        name: data.name,
        role: data.role,
        ...(data.password ? { password: data.password } : {}),
      });
      handleClose();
    } catch {
      // Error toast handled by hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier l'utilisateur</DialogTitle>
          <DialogDescription>
            Modifiez les informations du compte.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Nom complet *</Label>
            <Input id="edit-name" {...register('name')} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" type="email" value={editUser.email} disabled className="opacity-60" />
            <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-password">Mot de passe</Label>
            <Input
              id="edit-password"
              type="password"
              placeholder="Laisser vide pour ne pas modifier"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-role">Rôle *</Label>
            <select
              id="edit-role"
              {...register('role')}
              className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="secretary">Secrétaire</option>
              <option value="teacher">Enseignant</option>
              <option value="accountant">Comptable</option>
              <option value="admin">Administrateur</option>
            </select>
            {errors.role && (
              <p className="text-xs text-destructive">{errors.role.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={updateUser.isPending}>
              {updateUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
