import { useState } from 'react';
import { useClassGroups } from '@/hooks/use-class-groups';
import { useMessageHistory } from '@/hooks/use-messaging';
import PageHeader from '@/components/PageHeader';
import BulkMessageDialog from '@/components/messaging/BulkMessageDialog';
import MessageHistory from '@/components/messaging/MessageHistory';
import { Button } from '@/components/ui/button';
import { Mail, Loader2 } from 'lucide-react';

export default function MessagingPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: groupsData } = useClassGroups();
  const classGroups = groupsData?.data ?? [];
  const { data: messages, isLoading } = useMessageHistory();

  return (
    <div>
      <PageHeader
        title="Messagerie"
        description="Envoyez des messages groupés aux élèves et à leurs contacts."
      >
        <Button onClick={() => setDialogOpen(true)}>
          <Mail className="h-4 w-4" />
          Nouveau message groupé
        </Button>
      </PageHeader>

      <div>
        <h2 className="text-lg font-semibold mb-3">Historique des messages</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Chargement…
          </div>
        ) : (
          <MessageHistory messages={messages ?? []} />
        )}
      </div>

      <BulkMessageDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        classGroups={classGroups}
      />
    </div>
  );
}
