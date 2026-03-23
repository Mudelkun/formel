import { useState } from 'react';
import { useAuth } from '@/context/auth';
import { useStudentBalance, useTransferCredit } from '@/hooks/use-students';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, ArrowRightLeft, Loader2 } from 'lucide-react';

interface Props {
  studentId: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount);
}

export default function StudentBalanceCard({ studentId }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data: balance, isLoading, isError } = useStudentBalance(studentId);
  const transfer = useTransferCredit(studentId);
  const [transferFrom, setTransferFrom] = useState<'tuition' | 'books' | null>(null);
  const [transferAmount, setTransferAmount] = useState('');

  function handleTransfer() {
    if (!transferFrom || !transferAmount) return;
    const amount = Number(transferAmount);
    if (amount <= 0) return;
    transfer.mutate({ from: transferFrom, amount }, {
      onSuccess: () => {
        setTransferFrom(null);
        setTransferAmount('');
      },
    });
  }

  const maxTransfer = transferFrom === 'tuition'
    ? balance?.total.tuitionSurplus ?? 0
    : balance?.total.bookSurplus ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Solde des versements
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : isError || !balance ? (
          <p className="text-sm text-muted-foreground">
            Aucune inscription pour l'année en cours.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Credit banner */}
            {balance.total.surplus > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Crédit disponible</p>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                  +{formatCurrency(balance.total.surplus)} HTG
                </p>
              </div>
            )}

            {/* Versements */}
            <div className="space-y-2">
              {balance.versements.map((v) => (
                <div key={v.number} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{v.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Échéance : {new Date(v.dueDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(v.amountPaid)} / {formatCurrency(v.effectiveAmount)}</p>
                    {v.isPaidInFull ? (
                      <Badge variant="default" className="text-[10px]">Payé</Badge>
                    ) : v.isOverdue ? (
                      <Badge variant="destructive" className="text-[10px]">En retard</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">En attente</Badge>
                    )}
                  </div>
                </div>
              ))}
              {balance.total.tuitionSurplus > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-800 dark:bg-blue-900/10">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Crédit scolarité</p>
                  <div className="flex items-center gap-2">
                    <Badge className="text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/30">
                      +{formatCurrency(balance.total.tuitionSurplus)}
                    </Badge>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-blue-600 dark:text-blue-400"
                        onClick={() => {
                          setTransferFrom('tuition');
                          setTransferAmount(String(balance.total.tuitionSurplus));
                        }}
                      >
                        <ArrowRightLeft className="h-3 w-3 mr-1" />
                        → Livres
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Book fee */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Frais de livres</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {formatCurrency(balance.books.amountPaid)} / {formatCurrency(balance.books.effectiveFee)}
                </p>
                {balance.books.surplus > 0 ? (
                  <div className="flex items-center gap-2 justify-end">
                    <Badge className="text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/30">
                      Crédit : +{formatCurrency(balance.books.surplus)}
                    </Badge>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-blue-600 dark:text-blue-400"
                        onClick={() => {
                          setTransferFrom('books');
                          setTransferAmount(String(balance.total.bookSurplus));
                        }}
                      >
                        <ArrowRightLeft className="h-3 w-3 mr-1" />
                        → Scolarité
                      </Button>
                    )}
                  </div>
                ) : balance.books.amountRemaining <= 0 ? (
                  <Badge variant="default" className="text-[10px]">Payé</Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    Reste : {formatCurrency(balance.books.amountRemaining)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Credit transfer form */}
            {transferFrom && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-2 dark:border-blue-800 dark:bg-blue-900/10">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                  Transférer crédit {transferFrom === 'tuition' ? 'scolarité → livres' : 'livres → scolarité'}
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={maxTransfer}
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="h-7 text-sm"
                    placeholder="Montant"
                  />
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    disabled={transfer.isPending || !transferAmount || Number(transferAmount) <= 0 || Number(transferAmount) > maxTransfer}
                    onClick={handleTransfer}
                  >
                    {transfer.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Transférer'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => { setTransferFrom(null); setTransferAmount(''); }}
                  >
                    Annuler
                  </Button>
                </div>
                {Number(transferAmount) > maxTransfer && (
                  <p className="text-[10px] text-destructive">
                    Maximum : {formatCurrency(maxTransfer)}
                  </p>
                )}
              </div>
            )}

            {/* Total */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Total</p>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {formatCurrency(balance.total.amountPaid)} / {formatCurrency(balance.total.amountDue)}
                  </p>
                  {balance.total.scholarshipDiscount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Bourse : -{formatCurrency(balance.total.scholarshipDiscount)}
                    </p>
                  )}
                  {balance.total.surplus > 0 ? (
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      Crédit : +{formatCurrency(balance.total.surplus)}
                    </p>
                  ) : balance.total.amountRemaining > 0 ? (
                    <p className="text-xs text-destructive font-medium">
                      Reste : {formatCurrency(balance.total.amountRemaining)}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
