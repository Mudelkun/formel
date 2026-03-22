import { usePayments } from '@/hooks/use-students';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt } from 'lucide-react';
import type { StudentDetail } from '@/types/student';

interface Props {
  student: StudentDetail;
}

function formatCurrency(amount: number | string) {
  return new Intl.NumberFormat('fr-FR').format(Number(amount));
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const methodLabels: Record<string, string> = {
  cash: 'Espèces',
  check: 'Chèque',
  transfer: 'Virement',
  mobile: 'Mobile',
  deposit: 'Dépôt bancaire',
};

export default function StudentPaymentHistory({ student }: Props) {
  const enrollmentId = student.currentEnrollment?.enrollmentId;
  const { data, isLoading, isError } = usePayments(enrollmentId);
  const payments = data?.data ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          Historique des paiements
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!enrollmentId ? (
          <p className="text-sm text-muted-foreground">
            Aucune inscription pour l'année en cours.
          </p>
        ) : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : isError || payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun paiement enregistré pour cette année.
          </p>
        ) : (
          <div className="space-y-2">
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">
                    {payment.isBookPayment ? 'Frais de livres' : 'Scolarité'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(payment.paymentDate)}
                    {payment.paymentMethod && ` — ${methodLabels[payment.paymentMethod] ?? payment.paymentMethod}`}
                  </p>
                  {payment.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5">{payment.notes}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(payment.amount)} HTG</p>
                  {payment.status === 'completed' ? (
                    <Badge variant="default" className="text-[10px]">Confirmé</Badge>
                  ) : payment.status === 'failed' ? (
                    <Badge variant="destructive" className="text-[10px]">Rejeté</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">En attente</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
