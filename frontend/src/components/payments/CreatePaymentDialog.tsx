import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/auth';
import { useStudents, useStudent, useStudentBalance, useClasses } from '@/hooks/use-students';
import { useCreatePayment } from '@/hooks/use-payments';
import { useCurrency } from '@/hooks/use-currency';
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
import { Loader2, Search, ArrowLeft, Upload, FileText, X, AlertTriangle } from 'lucide-react';

const paymentSchema = z.object({
  amount: z.string().min(1, 'Montant requis'),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format AAAA-MM-JJ requis'),
  paymentMethod: z.string().min(1, 'Méthode requise'),
  isBookPayment: z.boolean().optional().default(false),
  autoConfirm: z.boolean().optional().default(false),
  notes: z.string().optional().or(z.literal('')),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreatePaymentDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const createPayment = useCreatePayment();
  const { formatAmount } = useCurrency();

  // Step management
  const [step, setStep] = useState<1 | 2>(1);
  const [studentSearch, setStudentSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(studentSearch), 300);
    return () => clearTimeout(timer);
  }, [studentSearch]);

  const { data: classesData } = useClasses();
  const classList = classesData?.data ?? [];

  const { data: studentsData, isLoading: searchLoading } = useStudents({
    name: debouncedSearch || undefined,
    classId: classFilter || undefined,
    limit: 10,
  });
  const students = studentsData?.data ?? [];

  // Fetch selected student detail for enrollmentId
  const { data: studentDetail } = useStudent(selectedStudentId ?? '');

  // Fetch balance for overpayment warning
  const { data: studentBalance } = useStudentBalance(selectedStudentId ?? '');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: '',
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMethod: 'cash',
      isBookPayment: false,
      autoConfirm: false,
      notes: '',
    },
  });

  function handleClose() {
    setStep(1);
    setStudentSearch('');
    setDebouncedSearch('');
    setClassFilter('');
    setSelectedStudentId(null);
    setProofFile(null);
    setFileError('');
    reset();
    onOpenChange(false);
  }

  function selectStudent(id: string) {
    setSelectedStudentId(id);
    setStep(2);
  }

  async function onSubmit(data: PaymentFormData) {
    if (!studentDetail?.currentEnrollment) return;

    if (!proofFile) {
      setFileError('Un document justificatif est requis');
      return;
    }

    try {
      await createPayment.mutateAsync({
        enrollmentId: studentDetail.currentEnrollment.enrollmentId,
        file: proofFile,
        amount: data.amount,
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod,
        isBookPayment: data.isBookPayment,
        autoConfirm: data.autoConfirm,
        notes: data.notes || undefined,
      });
      handleClose();
    } catch {
      // Error toast handled by hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau paiement</DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Recherchez et sélectionnez l'élève concerné."
              : 'Remplissez les détails du paiement.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou NIE..."
                  className="pl-9"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <select
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="">Toutes les classes</option>
                {classList.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1">
              {searchLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : students.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {debouncedSearch || classFilter ? 'Aucun élève trouvé.' : 'Tapez un nom pour rechercher.'}
                </p>
              ) : (
                students.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => selectStudent(s.id)}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                      {s.firstName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {s.lastName} {s.firstName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.className || 'Non inscrit'} {s.nie ? `\u00B7 ${s.nie}` : ''}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
            {/* Selected student summary */}
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => {
                  setStep(1);
                  setSelectedStudentId(null);
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {studentDetail?.lastName} {studentDetail?.firstName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {studentDetail?.currentEnrollment?.className || 'Non inscrit'}
                </p>
              </div>
            </div>

            {!studentDetail?.currentEnrollment && (
              <p className="text-sm text-destructive">
                Cet élève n'a pas d'inscription active. Impossible de créer un paiement.
              </p>
            )}

            <Separator />

            {(() => {
              const amt = Number(watch('amount')) || 0;
              const isBook = watch('isBookPayment');
              if (!studentBalance || amt <= 0) return null;
              const remaining = isBook
                ? studentBalance.books.amountRemaining
                : studentBalance.total.amountRemaining - studentBalance.books.amountRemaining;
              const excess = amt - remaining;
              if (excess <= 0 || remaining <= 0) return null;
              return (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-800 dark:bg-amber-900/20">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Ce montant dépasse le solde restant de{' '}
                    <span className="font-semibold">{formatAmount(excess)}</span>.
                    Le paiement sera quand même enregistré.
                  </p>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Montant *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  {...register('amount')}
                />
                {errors.amount && (
                  <p className="text-xs text-destructive">{errors.amount.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="paymentDate">Date *</Label>
                <Input id="paymentDate" type="date" {...register('paymentDate')} />
                {errors.paymentDate && (
                  <p className="text-xs text-destructive">{errors.paymentDate.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="paymentMethod">Méthode de paiement *</Label>
              <select
                id="paymentMethod"
                {...register('paymentMethod')}
                className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="cash">Espèces</option>
                <option value="transfer">Virement</option>
                <option value="check">Chèque</option>
                <option value="mobile">Mobile</option>
                <option value="deposit">Dépôt bancaire</option>
              </select>
              {errors.paymentMethod && (
                <p className="text-xs text-destructive">{errors.paymentMethod.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isBookPayment"
                {...register('isBookPayment')}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="isBookPayment" className="text-sm font-normal">
                Paiement pour les livres
              </Label>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoConfirm"
                  {...register('autoConfirm')}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="autoConfirm" className="text-sm font-normal">
                  Confirmer automatiquement
                </Label>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Document justificatif *</Label>
              {proofFile ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg border p-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm truncate">{proofFile.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 shrink-0"
                      onClick={() => { setProofFile(null); setFileError(''); }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <iframe
                    src={URL.createObjectURL(proofFile)}
                    title="Aperçu du document"
                    className="w-full h-48 rounded-lg border"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Cliquez pour joindre un reçu ou justificatif
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const MAX_SIZE = 30 * 1024 * 1024; // 30 MB
                    if (f.size > MAX_SIZE) {
                      setFileError('Le fichier dépasse la taille maximale de 30 Mo. Veuillez choisir un fichier plus petit.');
                      setProofFile(null);
                    } else {
                      setProofFile(f);
                      setFileError('');
                    }
                  }
                  e.target.value = '';
                }}
              />
              {fileError && (
                <p className="text-xs text-destructive">{fileError}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Optionnel" rows={2} {...register('notes')} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createPayment.isPending || !studentDetail?.currentEnrollment}
              >
                {createPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
