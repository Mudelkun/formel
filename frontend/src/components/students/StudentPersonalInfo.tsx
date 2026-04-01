import { useState } from 'react';
import { useAuth } from '@/context/auth';
import { useScholarships } from '@/hooks/use-students';
import EditStudentDialog from './EditStudentDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import type { StudentDetail } from '@/types/student';
import { formatDate } from '@/lib/utils';

interface Props {
  student: StudentDetail;
}

export default function StudentPersonalInfo({ student }: Props) {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'secretary';
  const [editOpen, setEditOpen] = useState(false);
  const { data: scholarships } = useScholarships(student.currentEnrollment?.enrollmentId);
  const hasScholarship = !!scholarships && scholarships.length > 0;

  const fields = [
    { label: 'Prénom', value: student.firstName },
    { label: 'Nom', value: student.lastName },
    { label: 'Genre', value: student.gender === 'male' ? 'Masculin' : 'Féminin' },
    { label: 'Date de naissance', value: formatDate(student.birthDate) },
    { label: 'NIE', value: student.nie || '—' },
    { label: 'Adresse', value: student.address || '—' },
    { label: 'Boursier', value: hasScholarship ? 'Oui' : 'Non' },
  ];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Informations personnelles</CardTitle>
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Modifier
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {fields.map((field) => (
              <div key={field.label}>
                <dt className="text-xs text-muted-foreground">{field.label}</dt>
                <dd className="text-sm font-medium">{field.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {canEdit && (
        <EditStudentDialog
          student={student}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
    </>
  );
}
