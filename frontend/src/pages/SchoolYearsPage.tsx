import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/context/auth';
import { useSchoolYears, useCreateSchoolYear, useUpdateSchoolYear, useActivateSchoolYear, usePromoteStudents } from '@/hooks/use-students';
import type { SchoolYear } from '@/types/student';
import { Plus, CalendarDays, Check, ArrowUpRight, Loader2, Pencil } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const createYearSchema = z.object({
  year: z.string().min(1, 'Année requise').regex(/^\d{4}-\d{4}$/, 'Format requis : 2025-2026'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date requise'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date requise'),
});

const editDatesSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date requise'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date requise'),
});

type CreateYearFormData = z.infer<typeof createYearSchema>;
type EditDatesFormData = z.infer<typeof editDatesSchema>;

export default function SchoolYearsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data: yearsData, isLoading } = useSchoolYears();
  const createSchoolYear = useCreateSchoolYear();
  const activateSchoolYear = useActivateSchoolYear();
  const promoteStudents = usePromoteStudents();

  const updateSchoolYear = useUpdateSchoolYear();

  const [createOpen, setCreateOpen] = useState(false);
  const [editYear, setEditYear] = useState<SchoolYear | null>(null);
  const [activateId, setActivateId] = useState<string | null>(null);
  const [promoteOpen, setPromoteOpen] = useState(false);

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isEditSubmitting },
  } = useForm<EditDatesFormData>({ resolver: zodResolver(editDatesSchema) });

  function openEdit(year: SchoolYear) {
    resetEdit({ startDate: year.startDate, endDate: year.endDate });
    setEditYear(year);
  }

  async function onEditSubmit(data: EditDatesFormData) {
    if (!editYear) return;
    try {
      await updateSchoolYear.mutateAsync({ id: editYear.id, ...data });
      setEditYear(null);
    } catch {
      // Error toast handled by hook
    }
  }

  const years = [...(yearsData?.data ?? [])].sort((a, b) => a.year.localeCompare(b.year));
  const activeYear = years.find((y) => y.isActive);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateYearFormData>({
    resolver: zodResolver(createYearSchema),
    defaultValues: { year: '', startDate: '', endDate: '' },
  });

  async function onCreateSubmit(data: CreateYearFormData) {
    try {
      await createSchoolYear.mutateAsync(data);
      reset();
      setCreateOpen(false);
    } catch {
      // Error toast handled by hook
    }
  }

  async function handleActivate() {
    if (!activateId) return;
    try {
      await activateSchoolYear.mutateAsync(activateId);
      setActivateId(null);
    } catch {
      // Error toast handled by hook
    }
  }

  async function handlePromote() {
    if (!activeYear) return;
    try {
      await promoteStudents.mutateAsync(activeYear.id);
      setPromoteOpen(false);
    } catch {
      // Error toast handled by hook
    }
  }

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Années scolaires"
          description="Gérez les années scolaires et activez l'année en cours."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Années scolaires"
        description="Gérez les années scolaires et activez l'année en cours."
      >
        {isAdmin && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle année
          </Button>
        )}
      </PageHeader>

      {years.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Aucune année scolaire"
          description="Créez votre première année scolaire pour commencer."
        >
          {isAdmin && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle année
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {years.map((year) => (
            <Card
              key={year.id}
              className={`flex flex-col ${year.isActive ? 'border-primary/50 shadow-sm' : ''}`}
            >
              <CardContent className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <CalendarDays className="h-5 w-5 text-muted-foreground" />
                  </div>
                  {year.isActive ? (
                    <Badge className="text-xs">
                      <Check className="mr-1 h-3 w-3" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Inactive</Badge>
                  )}
                </div>
                <p className="text-lg font-semibold">{year.year}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDate(year.startDate)} — {formatDate(year.endDate)}
                </p>
                {isAdmin && (
                  <div className="mt-auto pt-4 flex flex-col gap-2">
                    {year.isActive ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setPromoteOpen(true)}
                      >
                        <ArrowUpRight className="mr-2 h-3.5 w-3.5" />
                        Promotion automatique
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setActivateId(year.id)}
                      >
                        Activer cette année
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => openEdit(year)}
                    >
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Modifier les dates
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle année scolaire</DialogTitle>
            <DialogDescription>
              Créez une nouvelle année scolaire.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="year">Année *</Label>
              <Input id="year" placeholder="2025-2026" {...register('year')} />
              {errors.year && (
                <p className="text-xs text-destructive">{errors.year.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Date de début *</Label>
                <Input id="startDate" type="date" {...register('startDate')} />
                {errors.startDate && (
                  <p className="text-xs text-destructive">{errors.startDate.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">Date de fin *</Label>
                <Input id="endDate" type="date" {...register('endDate')} />
                {errors.endDate && (
                  <p className="text-xs text-destructive">{errors.endDate.message}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dates Dialog */}
      <Dialog open={!!editYear} onOpenChange={(open) => !open && setEditYear(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier les dates — {editYear?.year}</DialogTitle>
            <DialogDescription>
              Mettez à jour les dates de début et de fin de l'année scolaire.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-startDate">Date de début *</Label>
                <Input id="edit-startDate" type="date" {...registerEdit('startDate')} />
                {editErrors.startDate && (
                  <p className="text-xs text-destructive">{editErrors.startDate.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-endDate">Date de fin *</Label>
                <Input id="edit-endDate" type="date" {...registerEdit('endDate')} />
                {editErrors.endDate && (
                  <p className="text-xs text-destructive">{editErrors.endDate.message}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditYear(null)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isEditSubmitting}>
                {isEditSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Activate Confirm Dialog */}
      <ConfirmDialog
        open={!!activateId}
        onOpenChange={(open) => !open && setActivateId(null)}
        title="Activer cette année scolaire ?"
        description="L'année scolaire actuelle sera désactivée et celle-ci deviendra l'année active."
        onConfirm={handleActivate}
        isLoading={activateSchoolYear.isPending}
        confirmLabel="Activer"
      />

      {/* Promote Confirm Dialog */}
      <ConfirmDialog
        open={promoteOpen}
        onOpenChange={setPromoteOpen}
        title="Promotion automatique"
        description="Tous les élèves inscrits dans l'année active seront promus dans la classe supérieure pour la prochaine année scolaire. Cette action ne peut pas être annulée."
        onConfirm={handlePromote}
        isLoading={promoteStudents.isPending}
        confirmLabel="Promouvoir"
      />
    </>
  );
}
