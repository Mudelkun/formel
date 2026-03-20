import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';
import type { StudentDetail } from '@/types/student';

interface Props {
  student: StudentDetail;
}

export default function StudentEnrollmentCard({ student }: Props) {
  const enrollment = student.currentEnrollment;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <GraduationCap className="h-4 w-4" />
          Inscription
        </CardTitle>
      </CardHeader>
      <CardContent>
        {enrollment ? (
          <dl className="space-y-2">
            <div>
              <dt className="text-xs text-muted-foreground">Classe</dt>
              <dd className="text-sm font-medium">{enrollment.className}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Boursier</dt>
              <dd className="text-sm font-medium">
                {student.scholarshipRecipient ? 'Oui' : 'Non'}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucune inscription pour l'année en cours.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
