import { useState } from 'react';
import { useAuth } from '@/context/auth';
import { useDeleteContact } from '@/hooks/use-students';
import ContactFormDialog from './ContactFormDialog';
import SendMessageDialog from './SendMessageDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Phone, Mail, Send } from 'lucide-react';
import type { Contact, StudentDetail } from '@/types/student';

interface Props {
  student: StudentDetail;
}

export default function StudentContactsCard({ student }: Props) {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'secretary';
  const canDelete = user?.role === 'admin';
  const canMessage = user?.role === 'admin';
  const deleteContact = useDeleteContact(student.id);

  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>();
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [messageContact, setMessageContact] = useState<Contact | null>(null);

  function openEdit(contact: Contact) {
    setEditingContact(contact);
    setFormOpen(true);
  }

  function openCreate() {
    setEditingContact(undefined);
    setFormOpen(true);
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Contacts</CardTitle>
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={openCreate}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Ajouter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {student.contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun contact enregistré.</p>
          ) : (
            <div className="space-y-3">
              {student.contacts.map((contact) => (
                <div key={contact.id} className="flex items-start justify-between rounded-lg border p-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {contact.firstName} {contact.lastName}
                      </p>
                      {contact.isPrimary && (
                        <Badge variant="secondary" className="text-[10px]">Principal</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{contact.relationship}</p>
                    {contact.phone && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" /> {contact.phone}
                      </p>
                    )}
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" /> {contact.email}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {canMessage && contact.email && (
                      <Button variant="ghost" size="icon-sm" onClick={() => setMessageContact(contact)}>
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canEdit && (
                      <>
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(contact)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {canDelete && (
                          <Button variant="ghost" size="icon-sm" onClick={() => setDeletingContact(contact)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ContactFormDialog
        studentId={student.id}
        contact={editingContact}
        open={formOpen}
        onOpenChange={setFormOpen}
      />

      <ConfirmDialog
        open={!!deletingContact}
        onOpenChange={(open) => !open && setDeletingContact(null)}
        title="Supprimer le contact"
        description={`Voulez-vous vraiment supprimer ${deletingContact?.firstName} ${deletingContact?.lastName} ?`}
        onConfirm={() => {
          if (deletingContact) {
            deleteContact.mutate(deletingContact.id, {
              onSuccess: () => setDeletingContact(null),
            });
          }
        }}
        isLoading={deleteContact.isPending}
        variant="destructive"
        confirmLabel="Supprimer"
      />

      {messageContact && (
        <SendMessageDialog
          contact={messageContact}
          open={!!messageContact}
          onOpenChange={(open) => !open && setMessageContact(null)}
        />
      )}
    </>
  );
}
