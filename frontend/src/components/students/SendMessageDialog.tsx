import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSendMessage } from '@/hooks/use-messaging';
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

interface Template {
  label: string;
  subject: string;
  body: string;
}

const templates: Template[] = [
  {
    label: 'Rappel de paiement',
    subject: 'Rappel de paiement - Formel',
    body: "Cher parent,\n\nNous vous rappelons qu'un versement est en attente pour votre enfant. Merci de bien vouloir régulariser la situation dans les meilleurs délais.\n\nCordialement,\nL'administration",
  },
  {
    label: 'Convocation',
    subject: 'Convocation - Formel',
    body: "Cher parent,\n\nNous vous prions de bien vouloir vous présenter à l'établissement pour une rencontre concernant votre enfant.\n\nCordialement,\nL'administration",
  },
  {
    label: 'Information générale',
    subject: 'Information - Formel',
    body: "Cher parent,\n\nNous souhaitons vous informer d'une mise à jour importante concernant l'établissement.\n\nCordialement,\nL'administration",
  },
  {
    label: 'Personnalisé',
    subject: '',
    body: '',
  },
];

interface Props {
  contact: Contact;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SendMessageDialog({ contact, open, onOpenChange }: Props) {
  const sendMessage = useSendMessage();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      subject: '',
      body: '',
    },
  });

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      reset({ subject: '', body: '' });
    }
  }, [open, reset]);

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  function applyTemplate(template: Template) {
    setValue('subject', template.subject, { shouldValidate: true });
    setValue('body', template.body, { shouldValidate: true });
  }

  async function onSubmit(data: MessageFormData) {
    try {
      await sendMessage.mutateAsync({
        contactId: contact.id,
        subject: data.subject,
        body: data.body,
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
              {templates.map((t) => (
                <Button
                  key={t.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate(t)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="msg-subject">Objet *</Label>
              <Input id="msg-subject" {...register('subject')} />
              {errors.subject && (
                <p className="text-xs text-destructive">{errors.subject.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="msg-body">Message *</Label>
              <Textarea id="msg-body" rows={6} {...register('body')} />
              {errors.body && (
                <p className="text-xs text-destructive">{errors.body.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={sendMessage.isPending}>
                {sendMessage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Envoyer
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
