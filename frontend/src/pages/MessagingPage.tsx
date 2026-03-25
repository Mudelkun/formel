import { useState } from 'react';
import { useClassGroups } from '@/hooks/use-class-groups';
import PageHeader from '@/components/PageHeader';
import BulkMessageDialog from '@/components/messaging/BulkMessageDialog';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';

export default function MessagingPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: groupsData } = useClassGroups();
  const classGroups = groupsData?.data ?? [];

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

      <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground text-sm">
        <Mail className="h-8 w-8 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Aucun message envoyé récemment.</p>
        <p className="mt-1">Cliquez sur "Nouveau message groupé" pour commencer.</p>
      </div>

      <BulkMessageDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        classGroups={classGroups}
      />
    </div>
  );
}
