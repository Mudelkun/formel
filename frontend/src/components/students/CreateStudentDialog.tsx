import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createStudentSchema, type CreateStudentFormData } from '@/lib/validators/student';
import { useCreateStudent, useCreateEnrollment, useCreateScholarship, useClasses, useSchoolYears } from '@/hooks/use-students';
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
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import ScholarshipForm, { EMPTY_CONFIG, isConfigActive, type ScholarshipConfig } from './ScholarshipForm';
import { configToInputs } from '@/lib/scholarship-utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const selectCls = "flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default function CreateStudentDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const createStudent = useCreateStudent();
  const createEnrollment = useCreateEnrollment();
  const createScholarship = useCreateScholarship();
  const { data: classesData } = useClasses();
  const { data: schoolYearsData } = useSchoolYears();

  const classes = classesData?.data ?? [];
  const schoolYears = schoolYearsData?.data ?? [];
  const activeYear = schoolYears.find((y) => y.isActive);

  // Scholarship config (managed outside react-hook-form)
  const [scholarshipOpen, setScholarshipOpen] = useState(false);
  const [scholarshipConfig, setScholarshipConfig] = useState<ScholarshipConfig>(EMPTY_CONFIG);

  // Contact (managed outside react-hook-form)
  const [contactOpen, setContactOpen] = useState(false);
  const [contact, setContact] = useState({ firstName: '', lastName: '', email: '', phone: '', relationship: '' });

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
      gender: undefined as any,
      birthDate: '',
      nie: '',
      address: '',
      scholarshipRecipient: false,
      classId: '',
      schoolYearId: activeYear?.id ?? '',
    },
  });

  function resetAll() {
    reset();
    setScholarshipConfig(EMPTY_CONFIG);
    setScholarshipOpen(false);
    setContact({ firstName: '', lastName: '', email: '', phone: '', relationship: '' });
    setContactOpen(false);
  }

  async function onSubmit(data: CreateStudentFormData) {
    const { classId, schoolYearId, ...studentData } = data;
    const hasScholarship = isConfigActive(scholarshipConfig);

    try {
      const student = await createStudent.mutateAsync({
        ...studentData,
        nie: studentData.nie || undefined,
        address: studentData.address || undefined,
        scholarshipRecipient: hasScholarship,
      });

      // Create enrollment
      try {
        const enrollment = await createEnrollment.mutateAsync({
          studentId: student.id,
          classId,
          schoolYearId,
        });

        // Create scholarship records (no versements available at creation — pass [])
        if (hasScholarship) {
          const inputs = configToInputs(scholarshipConfig, []);
          for (const input of inputs) {
            try {
              await createScholarship.mutateAsync({ enrollmentId: enrollment.id, data: input });
            } catch {
              toast.warning('Bourse partiellement créée. Vérifiez les détails.');
            }
          }
        }
      } catch {
        toast.warning("Élève créé mais l'inscription a échoué. Veuillez l'inscrire manuellement.");
      }

      // Create contact if provided
      if (contactOpen && contact.firstName && contact.email) {
        try {
          const { createContact } = await import('@/api/students');
          await createContact(student.id, {
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone || undefined,
            relationship: contact.relationship || 'Parent',
            isPrimary: true,
          });
        } catch {
          toast.warning("Contact non créé. Vous pouvez l'ajouter depuis la fiche élève.");
        }
      }

      resetAll();
      onOpenChange(false);
      navigate(`/students/${student.id}`);
    } catch {
      // Error toast handled by hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvel élève</DialogTitle>
          <DialogDescription>
            Remplissez les informations de l'élève et sélectionnez sa classe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
          {/* ── Personal info ──────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">Prénom *</Label>
              <Input id="firstName" {...register('firstName')} />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Nom *</Label>
              <Input id="lastName" {...register('lastName')} />
              {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="gender">Genre *</Label>
              <select id="gender" {...register('gender')} className={selectCls}>
                <option value="">Sélectionner</option>
                <option value="male">Masculin</option>
                <option value="female">Féminin</option>
              </select>
              {errors.gender && <p className="text-xs text-destructive">{errors.gender.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="birthDate">Date de naissance *</Label>
              <Input id="birthDate" type="date" {...register('birthDate')} />
              {errors.birthDate && <p className="text-xs text-destructive">{errors.birthDate.message}</p>}
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

          <Separator />

          {/* ── Scholarship ────────────────────────── */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setScholarshipOpen(!scholarshipOpen)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {scholarshipOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Élève boursier (optionnel)
            </button>
            {scholarshipOpen && (
              <div className="rounded-lg border p-3 bg-muted/30">
                <ScholarshipForm value={scholarshipConfig} onChange={setScholarshipConfig} />
              </div>
            )}
          </div>

          <Separator />

          {/* ── Contact ────────────────────────────── */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setContactOpen(!contactOpen)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {contactOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Contact principal (optionnel)
            </button>
            {contactOpen && (
              <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Prénom</Label>
                    <Input value={contact.firstName} onChange={(e) => setContact({ ...contact, firstName: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nom</Label>
                    <Input value={contact.lastName} onChange={(e) => setContact({ ...contact, lastName: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" placeholder="email@exemple.com" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Téléphone</Label>
                    <Input placeholder="Optionnel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Relation</Label>
                  <select className={selectCls} value={contact.relationship} onChange={(e) => setContact({ ...contact, relationship: e.target.value })}>
                    <option value="">Sélectionner</option>
                    <option value="Parent">Parent</option>
                    <option value="Tuteur">Tuteur</option>
                    <option value="Mère">Mère</option>
                    <option value="Père">Père</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* ── Enrollment ─────────────────────────── */}
          <p className="text-sm font-medium">Inscription initiale</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="classId">Classe *</Label>
              <select id="classId" {...register('classId')} className={selectCls}>
                <option value="">Sélectionner une classe</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.classId && <p className="text-xs text-destructive">{errors.classId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Année scolaire *</Label>
              <Input value={activeYear?.year ?? 'Aucune année active'} disabled className="h-8 bg-muted" />
              <input type="hidden" {...register('schoolYearId')} value={activeYear?.id ?? ''} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
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
