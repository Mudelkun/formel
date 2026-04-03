import { useRef, useState } from 'react';
import { useAuth } from '@/context/auth';
import { useUploadPhoto, useDeletePhoto, useUpdateStudent } from '@/hooks/use-students';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Trash2 } from 'lucide-react';
import type { StudentDetail } from '@/types/student';
import AuthImage from '@/components/AuthImage';

interface Props {
  student: StudentDetail;
}

const statusOptions = [
  { value: 'active', label: 'Inscrit' },
  { value: 'transfer', label: 'Transféré' },
  { value: 'expelled', label: 'Expulsé' },
  { value: 'graduated', label: 'Diplômé' },
] as const;

export default function StudentPhotoCard({ student }: Props) {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'secretary';
  const uploadPhoto = useUploadPhoto(student.id);
  const deletePhoto = useDeletePhoto(student.id);
  const updateStudent = useUpdateStudent(student.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusConfirm, setStatusConfirm] = useState<string | null>(null);
  const [deletePhotoConfirm, setDeletePhotoConfirm] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Format accepté : JPEG, PNG ou WebP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La photo ne doit pas dépasser 5 Mo');
      return;
    }

    uploadPhoto.mutate(file);
    e.target.value = '';
  }

  function confirmStatusChange() {
    if (!statusConfirm) return;
    updateStudent.mutate({ status: statusConfirm as StudentDetail['status'] }, {
      onSuccess: () => setStatusConfirm(null),
    });
  }

  const initials = `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase();

  return (
    <>
      <Card>
        <CardContent className="p-5 flex flex-col items-center text-center">
          {/* Avatar / Photo */}
          <div className="relative mb-1">
            <AuthImage
              storedUrl={student.profilePhotoUrl}
              alt={`${student.firstName} ${student.lastName}`}
              className="h-24 w-24 rounded-full object-cover"
              fallback={
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted text-2xl font-semibold">
                  {initials}
                </div>
              }
            />
            {canEdit && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {canEdit && student.profilePhotoUrl && (
            <button
              type="button"
              onClick={() => setDeletePhotoConfirm(true)}
              className="mb-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Supprimer la photo
            </button>
          )}

          <p className="font-semibold">{student.firstName} {student.lastName}</p>
          {student.currentEnrollment && (
            <p className="text-sm text-muted-foreground">{student.currentEnrollment.className}</p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!statusConfirm}
        onOpenChange={(open) => !open && setStatusConfirm(null)}
        title="Changer le statut"
        description={`Voulez-vous vraiment changer le statut de cet élève en "${statusOptions.find((o) => o.value === statusConfirm)?.label}" ?`}
        onConfirm={confirmStatusChange}
        isLoading={updateStudent.isPending}
        confirmLabel="Confirmer"
      />

      <ConfirmDialog
        open={deletePhotoConfirm}
        onOpenChange={setDeletePhotoConfirm}
        title="Supprimer la photo"
        description="Voulez-vous vraiment supprimer la photo de profil de cet élève ?"
        onConfirm={() => deletePhoto.mutate(undefined, { onSuccess: () => setDeletePhotoConfirm(false) })}
        isLoading={deletePhoto.isPending}
        confirmLabel="Supprimer"
      />
    </>
  );
}
