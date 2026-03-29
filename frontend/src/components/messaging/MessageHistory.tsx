import { useState } from 'react';
import {
  Mail,
  Users,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MessageLogEntry } from '@/api/messaging';

const messageTypeLabels: Record<MessageLogEntry['messageType'], string> = {
  payment_reminder: 'Rappel de paiement',
  custom: 'Personnalisé',
};

const messageTypeBadgeClasses: Record<MessageLogEntry['messageType'], string> = {
  payment_reminder:
    'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  custom:
    'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const remaining = s % 60;
  return `${m}m ${remaining}s`;
}

function successRate(sent: number, total: number) {
  if (total === 0) return 0;
  return Math.round((sent / total) * 100);
}

function MessageRow({ msg }: { msg: MessageLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const rate = successRate(msg.sent, msg.totalRecipients);
  const allSuccess = msg.failed === 0;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Row header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3.5 flex items-start sm:items-center gap-3 hover:bg-muted/50 transition-colors cursor-pointer"
      >
        {/* Icon */}
        <div
          className={cn(
            'mt-0.5 sm:mt-0 flex-shrink-0 rounded-full p-2',
            msg.type === 'bulk'
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {msg.type === 'bulk' ? (
            <Users className="h-4 w-4" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-sm truncate max-w-[300px]">
              {msg.subject}
            </span>
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                messageTypeBadgeClasses[msg.messageType]
              )}
            >
              {messageTypeLabels[msg.messageType]}
            </span>
            {msg.type === 'bulk' && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Groupé
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(msg.sentAt)} à {formatTime(msg.sentAt)}
            </span>
            <span>{msg.recipientSummary}</span>
          </div>
        </div>

        {/* Stats + chevron */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Success indicator */}
          <div className="hidden sm:flex items-center gap-2">
            <div
              className={cn(
                'flex items-center gap-1 text-xs font-medium',
                allSuccess
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              )}
            >
              {allSuccess ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {rate}%
            </div>
            <span className="text-xs text-muted-foreground">
              {msg.sent}/{msg.totalRecipients}
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t px-4 py-4 space-y-4 bg-muted/20">
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Destinataires"
              value={msg.totalRecipients}
              icon={<Users className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Envoyés"
              value={msg.sent}
              icon={<Send className="h-3.5 w-3.5" />}
              className="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              label="Échoués"
              value={msg.failed}
              icon={<XCircle className="h-3.5 w-3.5" />}
              className={msg.failed > 0 ? 'text-red-600 dark:text-red-400' : ''}
            />
            <StatCard
              label="Taux de succès"
              value={`${rate}%`}
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              className={
                rate === 100
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : rate >= 90
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-red-600 dark:text-red-400'
              }
            />
          </div>

          {/* Duration */}
          {msg.finishedAt && (
            <p className="text-xs text-muted-foreground">
              Durée d'envoi : {formatDuration(msg.sentAt, msg.finishedAt)}
            </p>
          )}

          {/* Message content */}
          {msg.body && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">
                Contenu du message
              </p>
              <div className="rounded-md border bg-background p-3 text-sm leading-relaxed whitespace-pre-wrap">
                {msg.body}
              </div>
            </div>
          )}

          {/* Errors */}
          {msg.errors.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1.5">
                Erreurs ({msg.errors.length})
              </p>
              <div className="rounded-md border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 divide-y divide-red-100 dark:divide-red-900/30">
                {msg.errors.map((err: { studentName?: string; reason: string }, i: number) => (
                  <div key={i} className="px-3 py-2 text-xs flex justify-between">
                    <span className="font-medium">{err.studentName}</span>
                    <span className="text-red-600/70 dark:text-red-400/70">
                      {err.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="rounded-md border bg-background px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
      <div className={cn('flex items-center gap-1.5 font-semibold text-lg', className)}>
        {icon}
        {value}
      </div>
    </div>
  );
}

export default function MessageHistory({
  messages,
}: {
  messages: MessageLogEntry[];
}) {
  if (messages.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground text-sm">
        <Mail className="h-8 w-8 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Aucun message envoyé récemment.</p>
        <p className="mt-1">
          Cliquez sur &quot;Nouveau message groupé&quot; pour commencer.
        </p>
      </div>
    );
  }

  // Summary stats
  const totalMessages = messages.length;
  const totalRecipients = messages.reduce((s, m) => s + m.totalRecipients, 0);
  const totalSent = messages.reduce((s, m) => s + m.sent, 0);
  const totalFailed = messages.reduce((s, m) => s + m.failed, 0);
  const overallRate = successRate(totalSent, totalRecipients);

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-background px-4 py-3">
          <p className="text-xs text-muted-foreground">Messages envoyés</p>
          <p className="text-2xl font-semibold mt-0.5">{totalMessages}</p>
        </div>
        <div className="rounded-lg border bg-background px-4 py-3">
          <p className="text-xs text-muted-foreground">Total destinataires</p>
          <p className="text-2xl font-semibold mt-0.5">{totalRecipients}</p>
        </div>
        <div className="rounded-lg border bg-background px-4 py-3">
          <p className="text-xs text-muted-foreground">Livrés / Échoués</p>
          <p className="mt-0.5">
            <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
              {totalSent}
            </span>
            <span className="text-muted-foreground mx-1">/</span>
            <span
              className={cn(
                'text-2xl font-semibold',
                totalFailed > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-muted-foreground'
              )}
            >
              {totalFailed}
            </span>
          </p>
        </div>
        <div className="rounded-lg border bg-background px-4 py-3">
          <p className="text-xs text-muted-foreground">Taux de succès global</p>
          <p
            className={cn(
              'text-2xl font-semibold mt-0.5',
              overallRate === 100
                ? 'text-emerald-600 dark:text-emerald-400'
                : overallRate >= 90
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-600 dark:text-red-400'
            )}
          >
            {overallRate}%
          </p>
        </div>
      </div>

      {/* Message list */}
      <div className="space-y-2">
        {messages.map((msg) => (
          <MessageRow key={msg.id} msg={msg} />
        ))}
      </div>
    </div>
  );
}
