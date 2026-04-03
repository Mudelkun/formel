import { useState, useRef } from 'react';
import { useUploadDocument } from '@/hooks/use-students';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Upload } from 'lucide-react';

interface Props {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const documentTypes = [
  { value: 'birth_certificate', label: 'Certificat de naissance' },
  { value: 'id_card', label: "Carte d'identité" },
  { value: 'transcript', label: 'Bulletin scolaire' },
  { value: 'medical_record', label: 'Dossier médical' },
  { value: 'other', label: 'Autre' },
];

export default function UploadDocumentDialog({ studentId, open, onOpenChange }: Props) {
  const uploadDoc = useUploadDocument(studentId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [documentType, setDocumentType] = useState('birth_certificate');

  const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30 Mo

  function handleFileChange(selected: File | undefined) {
    if (!selected) { setFile(null); setFileError(''); return; }
    if (selected.size > MAX_FILE_SIZE) {
      setFile(null);
      setFileError('Le fichier dépasse la taille maximale de 30 Mo.');
    } else {
      setFile(selected);
      setFileError('');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    try {
      await uploadDoc.mutateAsync({ file, documentType });
      setFile(null);
      setFileError('');
      setDocumentType('birth_certificate');
      onOpenChange(false);
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || 'Erreur lors de l\'envoi du document';
      setFileError(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un document</DialogTitle>
          <DialogDescription>Sélectionnez le type et le fichier à télécharger.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="doc-type">Type de document</Label>
            <select
              id="doc-type"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {documentTypes.map((dt) => (
                <option key={dt.value} value={dt.value}>{dt.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Fichier</Label>
            <div
              className="flex items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer hover:border-ring/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-center">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {file ? file.name : 'Cliquez pour sélectionner un fichier'}
                </p>
                {file && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} Mo
                  </p>
                )}
                {fileError && (
                  <p className="text-xs text-destructive mt-1">{fileError}</p>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!file || !!fileError || uploadDoc.isPending}>
              {uploadDoc.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Télécharger
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
