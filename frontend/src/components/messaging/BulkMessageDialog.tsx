import { useState, useEffect } from 'react';
import { useBulkPreview, useSendBulkMessages } from '@/hooks/use-messaging';
import { useCurrency } from '@/hooks/use-currency';
import type { RecipientType, MessageType, BulkPreviewStudent } from '@/api/messaging';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Mail, AlertTriangle, CheckSquare, Square, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClassGroup {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classGroups: ClassGroup[];
  defaultRecipientType?: RecipientType;
}

type Step = 'compose' | 'students' | 'confirm' | 'result';

const MESSAGE_TEMPLATES = [
  {
    label: 'Rappel de paiement',
    type: 'payment_reminder' as MessageType,
    subject: '',
    body: '',
  },
  {
    label: 'Convocation',
    type: 'custom' as MessageType,
    subject: 'Convocation - Formel',
    body: "Cher parent,\n\nNous vous prions de bien vouloir vous présenter à l'établissement pour une rencontre concernant votre enfant.\n\nCordialement,\nL'administration",
  },
  {
    label: 'Information générale',
    type: 'custom' as MessageType,
    subject: 'Information - Formel',
    body: "Cher parent,\n\nNous souhaitons vous informer d'une mise à jour importante concernant l'établissement.\n\nCordialement,\nL'administration",
  },
  {
    label: 'Personnalisé',
    type: 'custom' as MessageType,
    subject: '',
    body: '',
  },
];

function today() {
  return new Date().toISOString().split('T')[0];
}

export default function BulkMessageDialog({
  open,
  onOpenChange,
  classGroups,
  defaultRecipientType = 'all',
}: Props) {
  const { formatAmount } = useCurrency();

  const [step, setStep] = useState<Step>('compose');
  const [recipientType, setRecipientType] = useState<RecipientType>(defaultRecipientType);
  const [classGroupId, setClassGroupId] = useState('');
  const [dueDateBefore, setDueDateBefore] = useState(today());
  const [sendToAllContacts, setSendToAllContacts] = useState(false);
  const [messageType, setMessageType] = useState<MessageType>('custom');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<{ sent: number; skipped: number; errors: { studentId: string; studentName: string; reason: string }[] } | null>(null);

  const previewEnabled = open && (step === 'compose' || step === 'students');

  const previewParams = {
    recipientType,
    classGroupId: classGroupId || undefined,
    dueDateBefore: recipientType === 'outstanding_balance' ? dueDateBefore : undefined,
    sendToAllContacts,
  };

  const preview = useBulkPreview(previewParams, previewEnabled);
  const sendBulk = useSendBulkMessages();

  // Reset when dialog closes
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setStep('compose');
      setRecipientType(defaultRecipientType);
      setClassGroupId('');
      setDueDateBefore(today());
      setSendToAllContacts(false);
      setMessageType('custom');
      setSubject('');
      setBody('');
      setExcludedIds(new Set());
      setResult(null);
    }
    onOpenChange(nextOpen);
  }

  // Reset excluded when preview changes (new filter applied)
  useEffect(() => {
    setExcludedIds(new Set());
  }, [recipientType, classGroupId, dueDateBefore, sendToAllContacts]);

  function applyTemplate(tpl: typeof MESSAGE_TEMPLATES[number]) {
    setMessageType(tpl.type);
    setSubject(tpl.subject);
    setBody(tpl.body);
  }

  const studentsWithContacts = preview.data?.students.filter((s) => s.hasContacts) ?? [];
  const selectedCount = studentsWithContacts.filter((s) => !excludedIds.has(s.id)).length;
  const isMessageValid =
    messageType === 'payment_reminder' || (subject.trim().length > 0 && body.trim().length > 0);

  async function handleSend() {
    try {
      const res = await sendBulk.mutateAsync({
        recipients: {
          type: recipientType,
          classGroupId: classGroupId || undefined,
          dueDateBefore: recipientType === 'outstanding_balance' ? dueDateBefore : undefined,
        },
        message: {
          type: messageType,
          subject: messageType === 'custom' ? subject : undefined,
          body: messageType === 'custom' ? body : undefined,
        },
        sendToAllContacts,
        excludedStudentIds: Array.from(excludedIds),
      });
      setResult(res);
      setStep('result');
    } catch {
      // error shown inline
    }
  }

  function toggleStudent(id: string) {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setExcludedIds(new Set());
  }

  function deselectAll() {
    setExcludedIds(new Set(studentsWithContacts.map((s) => s.id)));
  }

  const recipientLabel =
    recipientType === 'all'
      ? 'Tous les élèves'
      : recipientType === 'class_group'
      ? classGroups.find((g) => g.id === classGroupId)?.name ?? 'Groupe sélectionné'
      : `Élèves avec solde impayé (avant le ${dueDateBefore})`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* STEP: COMPOSE */}
        {step === 'compose' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> Message groupé
              </DialogTitle>
              <DialogDescription>
                Sélectionnez les destinataires et composez votre message.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-5 py-1 pr-1">
              {/* Recipient type */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Destinataires</Label>
                <div className="grid grid-cols-1 gap-1.5">
                  {(
                    [
                      { value: 'all', label: 'Tous les élèves' },
                      { value: 'class_group', label: 'Par groupe de classes' },
                      { value: 'outstanding_balance', label: 'Élèves avec solde impayé' },
                    ] as { value: RecipientType; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRecipientType(opt.value)}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-sm text-left transition-colors',
                        recipientType === opt.value
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border text-muted-foreground hover:bg-muted/40'
                      )}
                    >
                      <div
                        className={cn(
                          'h-3.5 w-3.5 rounded-full border-2 shrink-0',
                          recipientType === opt.value
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground'
                        )}
                      />
                      {opt.label}
                    </button>
                  ))}
                </div>

                {recipientType === 'class_group' && (
                  <Select value={classGroupId} onValueChange={setClassGroupId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un groupe" />
                    </SelectTrigger>
                    <SelectContent>
                      {classGroups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {recipientType === 'outstanding_balance' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Versements dus avant le</Label>
                    <Input
                      type="date"
                      value={dueDateBefore}
                      onChange={(e) => setDueDateBefore(e.target.value)}
                    />
                  </div>
                )}

                {/* Send to all contacts toggle */}
                <button
                  type="button"
                  onClick={() => setSendToAllContacts((v) => !v)}
                  className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <div
                    className={cn(
                      'relative h-5 w-9 rounded-full border transition-colors shrink-0',
                      sendToAllContacts ? 'bg-primary border-primary' : 'bg-muted border-border'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                        sendToAllContacts ? 'translate-x-4' : 'translate-x-0.5'
                      )}
                    />
                  </div>
                  Envoyer à tous les contacts
                </button>

                {/* Preview count */}
                <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                  {preview.isLoading ? (
                    <Skeleton className="h-4 w-40" />
                  ) : preview.data ? (
                    <span>
                      <span className="font-medium text-foreground">
                        {preview.data.willNotify}
                      </span>{' '}
                      élève{preview.data.willNotify !== 1 ? 's' : ''} seront notifiés
                      {preview.data.skipped > 0 && (
                        <span className="text-muted-foreground">
                          {' '}· {preview.data.skipped} ignoré{preview.data.skipped !== 1 ? 's' : ''} (sans contact)
                        </span>
                      )}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Message section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Message</Label>
                <div className="flex flex-wrap gap-1.5">
                  {MESSAGE_TEMPLATES.map((tpl) => (
                    <Button
                      key={tpl.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        'text-xs',
                        messageType === tpl.type && tpl.type === 'payment_reminder' && subject === '' && body === ''
                          ? 'border-primary text-primary'
                          : ''
                      )}
                      onClick={() => applyTemplate(tpl)}
                    >
                      {tpl.label}
                    </Button>
                  ))}
                </div>

                {messageType === 'payment_reminder' ? (
                  <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-2.5 text-xs text-blue-700 dark:text-blue-300">
                    Un email HTML personnalisé sera généré automatiquement pour chaque élève avec son solde et versement à venir.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="bulk-subject" className="text-xs">Objet *</Label>
                      <Input
                        id="bulk-subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Objet du message"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bulk-body" className="text-xs">Message *</Label>
                      <Textarea
                        id="bulk-body"
                        rows={5}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Contenu du message..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Annuler
              </Button>
              <Button
                disabled={
                  !isMessageValid ||
                  preview.isLoading ||
                  (preview.data?.willNotify ?? 0) === 0 ||
                  (recipientType === 'class_group' && !classGroupId)
                }
                onClick={() => setStep('students')}
              >
                Continuer
              </Button>
            </DialogFooter>
          </>
        )}

        {/* STEP: STUDENTS */}
        {step === 'students' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Confirmer les destinataires
              </DialogTitle>
              <DialogDescription>
                Décochez les élèves que vous souhaitez exclure de l'envoi.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-between text-xs text-muted-foreground py-1">
              <span>
                <span className="font-medium text-foreground">{selectedCount}</span> / {studentsWithContacts.length} sélectionnés
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="hover:text-foreground transition-colors flex items-center gap-1"
                  onClick={selectAll}
                >
                  <CheckSquare className="h-3.5 w-3.5" /> Tout cocher
                </button>
                <button
                  type="button"
                  className="hover:text-foreground transition-colors flex items-center gap-1"
                  onClick={deselectAll}
                >
                  <Square className="h-3.5 w-3.5" /> Tout décocher
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 min-h-0 max-h-64 border rounded-md p-1">
              {studentsWithContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun étudiant avec contact disponible.
                </p>
              ) : (
                studentsWithContacts.map((s: BulkPreviewStudent) => {
                  const checked = !excludedIds.has(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleStudent(s.id)}
                      className={cn(
                        'w-full flex items-start gap-2.5 rounded px-2 py-2 text-left text-sm transition-colors',
                        checked ? 'hover:bg-muted/50' : 'opacity-50 hover:bg-muted/30'
                      )}
                    >
                      <div
                        className={cn(
                          'mt-0.5 h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center',
                          checked ? 'bg-primary border-primary' : 'border-muted-foreground bg-background'
                        )}
                      >
                        {checked && (
                          <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 12 12">
                            <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{s.name}</span>
                          {s.amountRemaining !== null && (
                            <span className="text-xs text-destructive font-medium shrink-0">
                              {formatAmount(s.amountRemaining)}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {s.contactEmails.join(', ')}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setStep('compose')}>
                Retour
              </Button>
              <Button disabled={selectedCount === 0} onClick={() => setStep('confirm')}>
                Continuer
              </Button>
            </DialogFooter>
          </>
        )}

        {/* STEP: CONFIRM */}
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle>Confirmer l'envoi</DialogTitle>
              <DialogDescription>
                Vérifiez les détails avant d'envoyer les messages.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="rounded-md bg-muted/50 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Destinataires</span>
                  <span className="font-medium text-right max-w-xs truncate">{recipientLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Élèves sélectionnés</span>
                  <span className="font-medium">{selectedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type de message</span>
                  <span className="font-medium">
                    {messageType === 'payment_reminder' ? 'Rappel de paiement (personnalisé)' : subject}
                  </span>
                </div>
                {(preview.data?.skipped ?? 0) > 0 && (
                  <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 pt-1">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{preview.data?.skipped} élève{(preview.data?.skipped ?? 0) > 1 ? 's' : ''} seront ignorés (aucun contact avec email).</span>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('students')}>
                Retour
              </Button>
              <Button onClick={handleSend} disabled={sendBulk.isPending}>
                {sendBulk.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Envoyer les messages
              </Button>
            </DialogFooter>
          </>
        )}

        {/* STEP: RESULT */}
        {step === 'result' && result && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-green-600" /> Messages envoyés
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 text-center">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">{result.sent}</p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">Envoyés</p>
                </div>
                <div className="rounded-md bg-muted/50 border p-4 text-center">
                  <p className="text-2xl font-bold">{result.skipped}</p>
                  <p className="text-xs text-muted-foreground mt-1">Ignorés (sans email)</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {result.errors.length} échec{result.errors.length > 1 ? 's' : ''}
                  </div>
                  <div className="max-h-32 overflow-y-auto rounded-md border p-2 space-y-1">
                    {result.errors.map((e, i) => (
                      <div key={i} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{e.studentName}</span> — {e.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Fermer</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
