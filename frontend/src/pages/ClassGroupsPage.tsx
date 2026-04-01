import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import ConfigureFeesDialog from '@/components/class-groups/ConfigureFeesDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
import { useClassGroups, useCreateClassGroup, useUpdateClassGroup, useFees } from '@/hooks/use-class-groups';
import { useClasses, useSchoolYears } from '@/hooks/use-students';
import { useCurrency } from '@/hooks/use-currency';
import type { ClassGroup, FeesResponse } from '@/api/class-groups';
import { Badge } from '@/components/ui/badge';
import { Plus, Layers, Settings, School, Loader2, Pencil } from 'lucide-react';

const createGroupSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
});

type CreateGroupFormData = z.infer<typeof createGroupSchema>;

// Sub-component for each group card that loads its own fees
function GroupCard({
  group,
  classNames,
  activeYearId,
  isAdmin,
  onConfigure,
  onEdit,
}: {
  group: ClassGroup;
  classNames: string[];
  activeYearId: string;
  isAdmin: boolean;
  onConfigure: (group: ClassGroup, fees: FeesResponse | null) => void;
  onEdit: (group: ClassGroup) => void;
}) {
  const { formatAmount } = useCurrency();
  const { data: feesData, isLoading: feesLoading } = useFees(group.id, activeYearId);

  const versements = feesData?.versements ?? [];
  const bookFee = feesData?.bookFee ?? '0';
  const bookFeeNum = parseFloat(bookFee) || 0;
  const total = versements.reduce((s, v) => s + (parseFloat(v.amount) || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Layers className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold">{group.name}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {classNames.length} classe{classNames.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              {classNames.length > 0 && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <School className="h-3 w-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {classNames.join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(group)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onConfigure(group, feesData ?? null)}
              >
                <Settings className="mr-2 h-3.5 w-3.5" />
                Configurer
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {feesLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : versements.length === 0 && bookFeeNum === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Aucun frais configuré pour cette année.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {versements.map((v) => (
              <div key={v.id} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{v.name}</p>
                <p className="text-lg font-semibold mt-0.5">{formatAmount(v.amount)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Échéance : {formatDate(v.dueDate)}
                </p>
              </div>
            ))}
            <div className="rounded-lg border p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground">Frais de livres</p>
              <p className="text-lg font-semibold mt-0.5">{formatAmount(bookFee)}</p>
              <Separator className="my-2" />
              <p className="text-xs text-muted-foreground">Total annuel</p>
              <p className="text-sm font-semibold">{formatAmount(total + bookFeeNum)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClassGroupsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data: groupsData, isLoading: groupsLoading } = useClassGroups();
  const { data: classesData, isLoading: classesLoading } = useClasses();
  const { data: yearsData, isLoading: yearsLoading } = useSchoolYears();
  const createClassGroup = useCreateClassGroup();
  const updateClassGroup = useUpdateClassGroup();

  const [createOpen, setCreateOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<ClassGroup | null>(null);
  const [editName, setEditName] = useState('');
  const [configureGroup, setConfigureGroup] = useState<ClassGroup | null>(null);
  const [configureFees, setConfigureFees] = useState<FeesResponse | null>(null);

  const groups = groupsData?.data ?? [];
  const classes = classesData?.data ?? [];
  const years = yearsData?.data ?? [];
  const activeYear = years.find((y) => y.isActive);

  // Map classGroupId -> list of class names
  const classNamesByGroup = new Map<string, string[]>();
  classes.forEach((cls) => {
    const existing = classNamesByGroup.get(cls.classGroupId) ?? [];
    existing.push(cls.name);
    classNamesByGroup.set(cls.classGroupId, existing);
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateGroupFormData>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { name: '' },
  });

  async function onCreateSubmit(data: CreateGroupFormData) {
    try {
      await createClassGroup.mutateAsync(data);
      reset();
      setCreateOpen(false);
    } catch {
      // Error toast handled by hook
    }
  }

  function handleConfigure(group: ClassGroup, fees: FeesResponse | null) {
    setConfigureGroup(group);
    setConfigureFees(fees);
  }

  const isLoading = groupsLoading || classesLoading || yearsLoading;

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Groupes de classes"
          description="Configuration des groupes, versements et frais par année scolaire."
        />
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-24 rounded-lg" />
                  ))}
                </div>
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
        title="Groupes de classes"
        description="Configuration des groupes, versements et frais par année scolaire."
      >
        {isAdmin && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau groupe
          </Button>
        )}
      </PageHeader>

      {groups.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Aucun groupe de classes"
          description="Créez un groupe pour organiser vos classes et configurer les frais."
        >
          {isAdmin && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau groupe
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              classNames={classNamesByGroup.get(group.id) ?? []}
              activeYearId={activeYear?.id ?? ''}
              isAdmin={!!isAdmin}
              onConfigure={handleConfigure}
              onEdit={(g) => { setEditGroup(g); setEditName(g.name); }}
            />
          ))}
        </div>
      )}

      {/* Create Group Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau groupe de classes</DialogTitle>
            <DialogDescription>
              Créez un groupe pour organiser vos classes.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="groupName">Nom du groupe *</Label>
              <Input id="groupName" placeholder="ex: Préscolaire, Primaire" {...register('name')} />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
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

      {/* Edit Group Dialog */}
      <Dialog open={!!editGroup} onOpenChange={(open) => { if (!open) setEditGroup(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le groupe</DialogTitle>
            <DialogDescription>
              Modifiez le nom du groupe de classes.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!editGroup || !editName.trim()) return;
              try {
                await updateClassGroup.mutateAsync({ id: editGroup.id, name: editName.trim() });
                setEditGroup(null);
              } catch { /* handled by hook */ }
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="editGroupName">Nom du groupe *</Label>
              <Input
                id="editGroupName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditGroup(null)}>
                Annuler
              </Button>
              <Button type="submit" disabled={updateClassGroup.isPending || !editName.trim()}>
                {updateClassGroup.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Configure Fees Dialog */}
      {configureGroup && activeYear && (
        <ConfigureFeesDialog
          open={!!configureGroup}
          onOpenChange={(open) => {
            if (!open) {
              setConfigureGroup(null);
              setConfigureFees(null);
            }
          }}
          classGroupId={configureGroup.id}
          schoolYearId={activeYear.id}
          existingFees={configureFees}
        />
      )}
    </>
  );
}
