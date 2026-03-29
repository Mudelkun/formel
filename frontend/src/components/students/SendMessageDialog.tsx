import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSendMessage, useSendStudentPaymentReminder } from '@/hooks/use-messaging';
import { useSettings } from '@/hooks/use-settings';
import type { Contact } from '@/types/student';
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
import { Loader2 } from 'lucide-react';

const messageSchema = z.object({
  subject: z.string().min(1, 'Objet requis'),
  body: z.string().min(1, 'Message requis'),
});

type MessageFormData = z.infer<typeof messageSchema>;

interface Props {
  contact: Contact;
  studentId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SendMessageDialog({ contact, studentId, open, onOpenChange }: Props) {
  const sendMessage = useSendMessage();
  const sendReminder = useSendStudentPaymentReminder();
  const { data: settings } = useSettings();
  const schoolName = settings?.schoolName || 'Formel';
  const [isPaymentReminder, setIsPaymentReminder] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: { subject: '', body: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ subject: '', body: '' });
      setIsPaymentReminder(false);
    }
  }, [open, reset]);

  function handleClose() {
    reset();
    setIsPaymentReminder(false);
    onOpenChange(false);
  }

  function applyTemplate(subject: string, body: string) {
    setIsPaymentReminder(false);
    setValue('subject', subject, { shouldValidate: true });
    setValue('body', body, { shouldValidate: true });
  }

  async function onSubmit(data: MessageFormData) {
    try {
      await sendMessage.mutateAsync({ contactId: contact.id, subject: data.subject, body: data.body });
      handleClose();
    } catch {
      // Error toast handled by hook
    }
  }

  async function onSendReminder() {
    if (!studentId) return;
    try {
      await sendReminder.mutateAsync(studentId);
      handleClose();
    } catch {
      // Error toast handled by hook
    }
  }

  const isPending = sendMessage.isPending || sendReminder.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Envoyer un message</DialogTitle>
          <DialogDescription>
            À : {contact.firstName} {contact.lastName} ({contact.email})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template selector */}
          <div className="space-y-1.5">
            <Label>Modèle</Label>
            <div className="flex flex-wrap gap-2">
              {studentId && (
                <Button
                  type="button"
                  variant={isPaymentReminder ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsPaymentReminder(true)}
                >
                  Rappel de paiement
                </Button>
              )}
              {[
                {
                  label: 'Convocation',
                  subject: `Convocation – ${schoolName}`,
                  body: "Cher(e) parent / tuteur,\n\nNous avons l'honneur de vous convoquer à une réunion concernant la situation scolaire de votre enfant.\n\nNous vous prions de bien vouloir vous présenter à l'administration à votre plus proche convenance afin de traiter cette affaire en toute confidentialité.\n\nVotre présence est indispensable. Pour convenir d'un rendez-vous ou pour toute information complémentaire, veuillez contacter l'administration directement.\n\nDans l'attente de vous recevoir, nous vous prions d'agréer, cher(e) parent, l'expression de nos salutations distinguées.\n\nL'Administration",
                },
                {
                  label: 'Information générale',
                  subject: `Information importante – ${schoolName}`,
                  body: "Cher(e) parent / tuteur,\n\nNous vous contactons afin de vous faire part d'une information importante concernant notre établissement.\n\nNous vous remercions de l'attention que vous porterez à ce message et restons à votre entière disposition pour tout renseignement complémentaire.\n\nVeuillez agréer, cher(e) parent, l'expression de nos salutations distinguées.\n\nL'Administration",
                },
                { label: 'Personnalisé', subject: '', body: '' },
              ].map((t) => (
                <Button
                  key={t.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate(t.subject, t.body)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          {isPaymentReminder ? (
            <>
              <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-2.5 text-xs text-blue-700 dark:text-blue-300">
                Un email HTML personnalisé sera généré avec le solde et les versements à venir de l'élève.
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>Annuler</Button>
                <Button onClick={onSendReminder} disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Envoyer le rappel
                </Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="msg-subject">Objet *</Label>
                <Input id="msg-subject" {...register('subject')} />
                {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="msg-body">Message *</Label>
                <Textarea id="msg-body" rows={6} {...register('body')} />
                {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>Annuler</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Envoyer
                </Button>
              </DialogFooter>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
