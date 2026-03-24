import { useState } from 'react';
import { useAuth } from '@/context/auth';
import { useStudentDocuments, useDeleteDocument } from '@/hooks/use-students';
import UploadDocumentDialog from './UploadDocumentDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, FileText, Trash2, ExternalLink } from 'lucide-react';
import type { StudentDocument } from '@/types/student';

interface Props {
  studentId: string;
}

const typeLabels: Record<string, string> = {
  birth_certificate: 'Certificat de naissance',
  id_card: "Carte d'identité",
  transcript: 'Bulletin scolaire',
  medical_record: 'Dossier médical',
  other: 'Autre',
};

export default function StudentDocumentsCard({ studentId }: Props) {
  const { user } = useAuth();
  const canUpload = user?.role === 'admin' || user?.role === 'secretary';
  const canDelete = user?.role === 'admin' || user?.role === 'secretary';
  const { data, isLoading } = useStudentDocuments(studentId);
  const deleteDoc = useDeleteDocument(studentId);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState<StudentDocument | null>(null);

  const documents = data?.data ?? [];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Documents</CardTitle>
            {canUpload && (
              <Button variant="ghost" size="sm" onClick={() => setUploadOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Ajouter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun document enregistré.</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border p-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.documentName}</p>
                      <p className="text-xs text-muted-foreground">
                        {typeLabels[doc.documentType] ?? doc.documentType}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => window.open(doc.documentUrl, '_blank')}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    {canDelete && (
                      <Button variant="ghost" size="icon-sm" onClick={() => setDeletingDoc(doc)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {canUpload && (
        <UploadDocumentDialog
          studentId={studentId}
          open={uploadOpen}
          onOpenChange={setUploadOpen}
        />
      )}

      <ConfirmDialog
        open={!!deletingDoc}
        onOpenChange={(open) => !open && setDeletingDoc(null)}
        title="Supprimer le document"
        description={`Voulez-vous vraiment supprimer "${deletingDoc?.documentName}" ?`}
        onConfirm={() => {
          if (deletingDoc) {
            deleteDoc.mutate(deletingDoc.id, {
              onSuccess: () => setDeletingDoc(null),
            });
          }
        }}
        isLoading={deleteDoc.isPending}
        variant="destructive"
        confirmLabel="Supprimer"
      />
    </>
  );
}
