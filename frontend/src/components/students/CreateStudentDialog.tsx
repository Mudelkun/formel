import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createStudentSchema, type CreateStudentFormData } from '@/lib/validators/student';
import { useCreateStudent, useCreateEnrollment, useClasses, useSchoolYears } from '@/hooks/use-students';
import { toast } from 'sonner';
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
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateStudentDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const createStudent = useCreateStudent();
  const createEnrollment = useCreateEnrollment();
  const { data: classesData } = useClasses();
  const { data: schoolYearsData } = useSchoolYears();

  const classes = classesData?.data ?? [];
  const schoolYears = schoolYearsData?.data ?? [];
  const activeYear = schoolYears.find((y) => y.isActive);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      gender: undefined,
      birthDate: '',
      nie: '',
      address: '',
      scholarshipRecipient: false,
      classId: '',
      schoolYearId: activeYear?.id ?? '',
    },
  });

  async function onSubmit(data: CreateStudentFormData) {
    const { classId, schoolYearId, ...studentData } = data;

    // Clean optional fields
    const cleanStudent = {
      ...studentData,
      nie: studentData.nie || undefined,
      address: studentData.address || undefined,
    };

    try {
      const student = await createStudent.mutateAsync(cleanStudent);

      try {
        await createEnrollment.mutateAsync({
          studentId: student.id,
          classId,
          schoolYearId,
        });
      } catch {
        toast.warning('Élève créé mais l\'inscription a échoué. Veuillez l\'inscrire manuellement.');
      }

      reset();
      onOpenChange(false);
      navigate(`/students/${student.id}`);
    } catch {
      // Error toast handled by hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvel élève</DialogTitle>
          <DialogDescription>
            Remplissez les informations de l'élève et sélectionnez sa classe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">Prénom *</Label>
              <Input id="firstName" {...register('firstName')} />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Nom *</Label>
              <Input id="lastName" {...register('lastName')} />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="gender">Genre *</Label>
              <select
                id="gender"
                {...register('gender')}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Sélectionner</option>
                <option value="male">Masculin</option>
                <option value="female">Féminin</option>
              </select>
              {errors.gender && (
                <p className="text-xs text-destructive">{errors.gender.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="birthDate">Date de naissance *</Label>
              <Input id="birthDate" type="date" {...register('birthDate')} />
              {errors.birthDate && (
                <p className="text-xs text-destructive">{errors.birthDate.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="nie">NIE</Label>
              <Input id="nie" placeholder="Optionnel" {...register('nie')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Adresse</Label>
              <Textarea id="address" placeholder="Optionnel" rows={1} {...register('address')} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="scholarshipRecipient"
              {...register('scholarshipRecipient')}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="scholarshipRecipient" className="text-sm font-normal">
              Élève boursier
            </Label>
          </div>

          <Separator />

          <p className="text-sm font-medium">Inscription initiale</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="classId">Classe *</Label>
              <select
                id="classId"
                {...register('classId')}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Sélectionner une classe</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.classId && (
                <p className="text-xs text-destructive">{errors.classId.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schoolYearId">Année scolaire *</Label>
              <select
                id="schoolYearId"
                {...register('schoolYearId')}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Sélectionner</option>
                {schoolYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.year}{y.isActive ? ' (Active)' : ''}
                  </option>
                ))}
              </select>
              {errors.schoolYearId && (
                <p className="text-xs text-destructive">{errors.schoolYearId.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer l'élève
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
