import { useStudentBalance } from '@/hooks/use-students';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard } from 'lucide-react';

interface Props {
  studentId: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount);
}

export default function StudentBalanceCard({ studentId }: Props) {
  const { data: balance, isLoading, isError } = useStudentBalance(studentId);

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
                {balance.books.amountRemaining <= 0 ? (
                  <Badge variant="default" className="text-[10px]">Payé</Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    Reste : {formatCurrency(balance.books.amountRemaining)}
                  </Badge>
                )}
              </div>
            </div>

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
                  {balance.total.amountRemaining > 0 && (
                    <p className="text-xs text-destructive font-medium">
                      Reste : {formatCurrency(balance.total.amountRemaining)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
