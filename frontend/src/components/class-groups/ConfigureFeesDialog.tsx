import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Separator } from '@/components/ui/separator';
import { useCreateFees, useUpdateFees } from '@/hooks/use-class-groups';
import type { FeesResponse } from '@/api/class-groups';
import { Loader2, Plus, Trash2 } from 'lucide-react';

const versementSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  amount: z.string().min(1, 'Montant requis'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date requise'),
});

const feesFormSchema = z.object({
  bookFee: z.string().min(1, 'Frais de livres requis'),
  versements: z.array(versementSchema).min(1, 'Au moins un versement requis'),
});

type FeesFormData = z.infer<typeof feesFormSchema>;

interface ConfigureFeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classGroupId: string;
  schoolYearId: string;
  existingFees?: FeesResponse | null;
}

export default function ConfigureFeesDialog({
  open,
  onOpenChange,
  classGroupId,
  schoolYearId,
  existingFees,
}: ConfigureFeesDialogProps) {
  const createFees = useCreateFees();
  const updateFees = useUpdateFees();

  const hasExisting = !!existingFees?.feeConfigId;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FeesFormData>({
    resolver: zodResolver(feesFormSchema),
    defaultValues: {
      bookFee: '',
      versements: [{ name: '1er versement', amount: '', dueDate: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'versements',
  });

  useEffect(() => {
    if (open) {
      if (existingFees?.feeConfigId && existingFees.versements.length > 0) {
        reset({
          bookFee: existingFees.bookFee,
          versements: existingFees.versements.map((v) => ({
            name: v.name,
            amount: v.amount,
            dueDate: v.dueDate.split('T')[0],
          })),
        });
      } else {
        reset({
          bookFee: '',
          versements: [{ name: '1er versement', amount: '', dueDate: '' }],
        });
      }
    }
  }, [open, existingFees, reset]);

  async function onSubmit(data: FeesFormData) {
    const payload = {
      classGroupId,
      schoolYearId,
      bookFee: data.bookFee,
      versements: data.versements.map((v, i) => ({
        number: i + 1,
        name: v.name,
        amount: v.amount,
        dueDate: v.dueDate,
      })),
    };

    try {
      if (hasExisting) {
        await updateFees.mutateAsync(payload);
      } else {
        await createFees.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      // Error toast handled by hook
    }
  }

  function addVersement() {
    const num = fields.length + 1;
    const suffix = num === 1 ? 'er' : 'ème';
    append({ name: `${num}${suffix} versement`, amount: '', dueDate: '' });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurer les frais</DialogTitle>
          <DialogDescription>
            Définissez les frais de livres et les versements pour ce groupe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bookFee">Frais de livres *</Label>
            <Input id="bookFee" placeholder="ex: 5000" {...register('bookFee')} />
            {errors.bookFee && (
              <p className="text-xs text-destructive">{errors.bookFee.message}</p>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Versements</Label>
              <Button type="button" variant="outline" size="sm" onClick={addVersement}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Ajouter un versement
              </Button>
            </div>

            {errors.versements?.root && (
              <p className="text-xs text-destructive">{errors.versements.root.message}</p>
            )}

            {fields.map((field, index) => (
              <div key={field.id} className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Versement {index + 1}</p>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nom</Label>
                    <Input
                      {...register(`versements.${index}.name`)}
                      className="h-8 text-sm"
                    />
                    {errors.versements?.[index]?.name && (
                      <p className="text-xs text-destructive">{errors.versements[index].name?.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Montant</Label>
                    <Input
                      {...register(`versements.${index}.amount`)}
                      placeholder="ex: 15000"
                      className="h-8 text-sm"
                    />
                    {errors.versements?.[index]?.amount && (
                      <p className="text-xs text-destructive">{errors.versements[index].amount?.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Échéance</Label>
                    <Input
                      type="date"
                      {...register(`versements.${index}.dueDate`)}
                      className="h-8 text-sm"
                    />
                    {errors.versements?.[index]?.dueDate && (
                      <p className="text-xs text-destructive">{errors.versements[index].dueDate?.message}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {hasExisting ? 'Mettre à jour' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
