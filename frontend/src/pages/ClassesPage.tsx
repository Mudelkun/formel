import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
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
import { useClasses, useCreateClass } from '@/hooks/use-students';
import { useClassGroups } from '@/hooks/use-class-groups';
import { Plus, School } from 'lucide-react';
import { Loader2 } from 'lucide-react';

const createClassSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  gradeLevel: z.coerce.number().int().min(1, 'Niveau requis'),
  classGroupId: z.string().min(1, 'Groupe requis'),
});

type CreateClassFormData = z.infer<typeof createClassSchema>;

const colorPalette = [
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-violet-50 text-violet-700 border-violet-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-cyan-50 text-cyan-700 border-cyan-200',
];

function getGroupColor(index: number): string {
  return colorPalette[index % colorPalette.length];
}

export default function ClassesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data: classesData, isLoading: classesLoading } = useClasses();
  const { data: groupsData, isLoading: groupsLoading } = useClassGroups();
  const createClass = useCreateClass();

  const [createOpen, setCreateOpen] = useState(false);

  const classes = classesData?.data ?? [];
  const classGroups = groupsData?.data ?? [];

  const groupMap = new Map(classGroups.map((g) => [g.id, g.name]));

  // Group classes by classGroupId
  const grouped = classes.reduce<Record<string, typeof classes>>((acc, cls) => {
    const groupName = groupMap.get(cls.classGroupId) ?? 'Sans groupe';
    (acc[groupName] ??= []).push(cls);
    return acc;
  }, {});

  // Build color map based on group names
  const groupNameToColor = new Map<string, string>();
  classGroups.forEach((g, i) => {
    groupNameToColor.set(g.name, getGroupColor(i));
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createClassSchema),
    defaultValues: { name: '', gradeLevel: 1, classGroupId: '' },
  });

  async function onCreateSubmit(data: CreateClassFormData) {
    try {
      await createClass.mutateAsync(data);
      reset();
      setCreateOpen(false);
    } catch {
      // Error toast handled by hook
    }
  }

  const isLoading = classesLoading || groupsLoading;

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Classes"
          description="Toutes les classes de l'établissement par groupe."
        />
        <div className="space-y-8">
          {[1, 2].map((g) => (
            <div key={g}>
              <Skeleton className="h-5 w-32 mb-3" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <Skeleton className="h-5 w-12 rounded-full" />
                      </div>
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-4 w-28" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Classes"
        description="Toutes les classes de l'établissement par groupe."
      >
        {isAdmin && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle classe
          </Button>
        )}
      </PageHeader>

      {classes.length === 0 ? (
        <EmptyState
          icon={School}
          title="Aucune classe"
          description="Créez votre première classe pour commencer."
        >
          {isAdmin && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle classe
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([group, groupClasses]) => (
            <div key={group}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </h2>
                <Badge variant="outline" className="text-xs">{groupClasses.length} classes</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {groupClasses.map((cls) => {
                  const color = groupNameToColor.get(groupMap.get(cls.classGroupId) ?? '') ?? colorPalette[0];
                  return (
                    <Card key={cls.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${color}`}>
                            <School className="h-5 w-5" />
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Niv. {cls.gradeLevel}
                          </Badge>
                        </div>
                        <p className="font-semibold">{cls.name}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{groupMap.get(cls.classGroupId) ?? ''}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Class Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle classe</DialogTitle>
            <DialogDescription>
              Ajoutez une nouvelle classe à l'établissement.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCreateSubmit as any)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="className">Nom *</Label>
              <Input id="className" placeholder="ex: CP, 6ème" {...register('name')} />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gradeLevel">Niveau *</Label>
              <Input id="gradeLevel" type="number" min={1} {...register('gradeLevel')} />
              {errors.gradeLevel && (
                <p className="text-xs text-destructive">{errors.gradeLevel.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="classGroupId">Groupe *</Label>
              <select
                id="classGroupId"
                {...register('classGroupId')}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Sélectionner un groupe</option>
                {classGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              {errors.classGroupId && (
                <p className="text-xs text-destructive">{errors.classGroupId.message}</p>
              )}
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
    </>
  );
}
