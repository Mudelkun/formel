import { useState } from 'react';
import { usePayments, useStudentBalance } from '@/hooks/use-students';
import { useAuth } from '@/context/auth';
import { useCurrency } from '@/hooks/use-currency';
import { useSettings } from '@/hooks/use-settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Receipt, Download, Loader2 } from 'lucide-react';
import { generatePaymentHistoryPdf } from '@/lib/generate-payment-pdf';
import { fetchFileAsBase64 } from '@/lib/fileUrl';
import type { StudentDetail } from '@/types/student';

interface Props {
  student: StudentDetail;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    timeZone: 'UTC',
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
  credit_transfer: 'Transfert de crédit',
};

export default function StudentPaymentHistory({ student }: Props) {
  const { formatAmount } = useCurrency();
  const { user } = useAuth();
  const { data: settings } = useSettings();
  const enrollmentId = student.currentEnrollment?.enrollmentId;
  const { data, isLoading, isError, refetch: refetchPayments } = usePayments(enrollmentId);
  const { data: balance, refetch: refetchBalance } = useStudentBalance(student.id);
  const payments = data?.data ?? [];
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const canDownload = user?.role === 'admin' && payments.length > 0;

  async function handleDownload() {
    setIsPdfLoading(true);
    try {
      const [paymentsResult, balanceResult, photoDataUrl] = await Promise.all([
        refetchPayments(),
        refetchBalance(),
        student.profilePhotoUrl
          ? fetchFileAsBase64(student.profilePhotoUrl).catch(() => null)
          : Promise.resolve(null),
      ]);
      generatePaymentHistoryPdf(
        student,
        paymentsResult.data?.data ?? payments,
        settings,
        balanceResult.data ?? balance,
        photoDataUrl,
      );
    } finally {
      setIsPdfLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Historique des paiements
          </CardTitle>
          {canDownload && (
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={isPdfLoading}>
              {isPdfLoading
                ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                : <Download className="mr-1.5 h-3.5 w-3.5" />}
              Télécharger PDF
            </Button>
          )}
        </div>
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
                  <p className="text-sm font-medium">{formatAmount(payment.amount)}</p>
                  {payment.status === 'completed' ? (
                    <Badge variant="default" className="text-[10px]">Confirmé</Badge>
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
