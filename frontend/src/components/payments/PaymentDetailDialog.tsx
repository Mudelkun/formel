import { useState, useRef } from 'react';
import { useAuth } from '@/context/auth';
import { usePayment, useUpdatePayment, usePaymentDocuments, useUploadPaymentDocument, useDeletePaymentDocument } from '@/hooks/use-payments';
import { useCurrency } from '@/hooks/use-currency';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Upload, Trash2, Check, Clock, X, ChevronLeft, ChevronRight, ZoomIn, ExternalLink } from 'lucide-react';

const methodLabels: Record<string, string> = {
  cash: 'Espèces',
  transfer: 'Virement',
  check: 'Chèque',
  mobile: 'Mobile',
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof Check }> = {
  completed: { label: 'Confirmé', color: 'text-green-600', icon: Check },
  pending: { label: 'En attente', color: 'text-amber-600', icon: Clock },
  failed: { label: 'Échoué', color: 'text-red-600', icon: X },
};

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(url);
}

function isPdfUrl(url: string) {
  return /\.pdf(\?|$)/i.test(url);
}

interface Props {
  paymentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PaymentDetailDialog({ paymentId, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { formatAmount } = useCurrency();

  const { data: payment, isLoading } = usePayment(paymentId);
  const { data: docsData } = usePaymentDocuments(paymentId);
  const updatePayment = useUpdatePayment();
  const uploadDoc = useUploadPaymentDocument(paymentId);
  const deleteDoc = useDeletePaymentDocument(paymentId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const documents = docsData?.data ?? [];
  const [activeDocIndex, setActiveDocIndex] = useState(0);

  function handleStatusChange(status: string) {
    updatePayment.mutate({ id: paymentId, status });
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      uploadDoc.mutate(file);
      e.target.value = '';
    }
  }

  const safeIndex = Math.min(activeDocIndex, Math.max(0, documents.length - 1));
  const activeDoc = documents[safeIndex];

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détails du paiement</DialogTitle>
        </DialogHeader>

        {isLoading || !payment ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-36" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Payment info grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Élève</p>
                <p className="text-sm font-medium">
                  {payment.studentFirstName} {payment.studentLastName}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Classe</p>
                <p className="text-sm font-medium">{payment.className || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Montant</p>
                <p className="text-sm font-semibold">{formatAmount(payment.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm">
                  {new Date(payment.paymentDate).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Méthode</p>
                <p className="text-sm">{methodLabels[payment.paymentMethod ?? ''] || payment.paymentMethod || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="text-sm">{payment.isBookPayment ? 'Livres' : 'Scolarité'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Statut</p>
                {(() => {
                  const cfg = statusConfig[payment.status] ?? statusConfig.pending;
                  const Icon = cfg.icon;
                  return (
                    <span className={`inline-flex items-center gap-1 text-sm font-medium ${cfg.color}`}>
                      <Icon className="h-3.5 w-3.5" /> {cfg.label}
                    </span>
                  );
                })()}
              </div>
              {payment.notes && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{payment.notes}</p>
                </div>
              )}
            </div>

            {/* Admin actions */}
            {isAdmin && payment.status === 'pending' && (
              <>
                <Separator />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange('completed')}
                    disabled={updatePayment.isPending}
                  >
                    {updatePayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Approuver
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleStatusChange('failed')}
                    disabled={updatePayment.isPending}
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Rejeter
                  </Button>
                </div>
              </>
            )}

            {/* Documents — inline preview */}
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">
                  Justificatif{documents.length > 1 ? `s (${documents.length})` : ''}
                </p>
                {isAdmin && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadDoc.isPending}
                    >
                      {uploadDoc.isPending ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Ajouter
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                    />
                  </>
                )}
              </div>

              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun document.</p>
              ) : (
                <div className="space-y-2">
                  {/* Inline preview */}
                  {activeDoc && (
                    <div className="relative rounded-lg border overflow-hidden bg-muted/30">
                      {isImageUrl(activeDoc.documentUrl) ? (
                        <img
                          src={activeDoc.documentUrl}
                          alt="Justificatif de paiement"
                          className="w-full max-h-96 object-contain"
                        />
                      ) : isPdfUrl(activeDoc.documentUrl) ? (
                        <iframe
                          src={activeDoc.documentUrl}
                          title="Justificatif de paiement"
                          className="w-full h-96 border-0"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                          <ZoomIn className="h-8 w-8 mb-2" />
                          <p className="text-sm">Aperçu non disponible</p>
                        </div>
                      )}

                      {/* Navigation + actions overlay */}
                      <div className="flex items-center justify-between p-2 border-t bg-background/80">
                        <div className="flex items-center gap-1">
                          {documents.length > 1 && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                disabled={safeIndex === 0}
                                onClick={() => setActiveDocIndex(safeIndex - 1)}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <span className="text-xs text-muted-foreground px-1">
                                {safeIndex + 1} / {documents.length}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                disabled={safeIndex === documents.length - 1}
                                onClick={() => setActiveDocIndex(safeIndex + 1)}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            render={<a href={activeDoc.documentUrl} target="_blank" rel="noopener noreferrer" />}
                          >
                            <ExternalLink className="h-3 w-3" />
                            Ouvrir
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                deleteDoc.mutate(activeDoc.id);
                                if (safeIndex > 0) setActiveDocIndex(safeIndex - 1);
                              }}
                              disabled={deleteDoc.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
