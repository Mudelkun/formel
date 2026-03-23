import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateStudentSchema, type UpdateStudentFormData } from '@/lib/validators/student';
import { useUpdateStudent } from '@/hooks/use-students';
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
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import type { StudentDetail } from '@/types/student';

interface Props {
  student: StudentDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditStudentDialog({ student, open, onOpenChange }: Props) {
  const updateStudent = useUpdateStudent(student.id);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(updateStudentSchema),
    values: {
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender,
      birthDate: student.birthDate,
      nie: student.nie ?? '',
      address: student.address ?? '',
    },
  });

  async function onSubmit(data: UpdateStudentFormData) {
    const cleaned = {
      ...data,
      nie: data.nie || undefined,
      address: data.address || undefined,
    };

    await updateStudent.mutateAsync(cleaned);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier l'élève</DialogTitle>
          <DialogDescription>Mettez à jour les informations de l'élève.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-firstName">Prénom *</Label>
              <Input id="edit-firstName" {...register('firstName')} />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-lastName">Nom *</Label>
              <Input id="edit-lastName" {...register('lastName')} />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-gender">Genre *</Label>
              <select
                id="edit-gender"
                {...register('gender')}
                className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="male">Masculin</option>
                <option value="female">Féminin</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-birthDate">Date de naissance *</Label>
              <Input id="edit-birthDate" type="date" {...register('birthDate')} />
              {errors.birthDate && (
                <p className="text-xs text-destructive">{errors.birthDate.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-nie">NIE</Label>
              <Input id="edit-nie" placeholder="Optionnel" {...register('nie')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-address">Adresse</Label>
              <Textarea id="edit-address" placeholder="Optionnel" rows={1} {...register('address')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
