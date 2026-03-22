import { useAuth } from '@/context/auth';
import { usePromoteStudent, useDowngradeStudent, useScholarships } from '@/hooks/use-students';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import type { StudentDetail } from '@/types/student';

interface Props {
  student: StudentDetail;
}

export default function StudentEnrollmentCard({ student }: Props) {
  const { user } = useAuth();
  const enrollment = student.currentEnrollment;
  const canManage = user?.role === 'admin' || user?.role === 'secretary';

  const promote = usePromoteStudent(student.id);
  const downgrade = useDowngradeStudent(student.id);
  const { data: scholarships } = useScholarships(enrollment?.enrollmentId);
  const hasScholarship = !!scholarships && scholarships.length > 0;

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
          <div className="space-y-3">
            <dl className="space-y-2">
              <div>
                <dt className="text-xs text-muted-foreground">Classe</dt>
                <dd className="text-sm font-medium">{enrollment.className}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Boursier</dt>
                <dd className="text-sm font-medium">
                  {hasScholarship ? 'Oui' : 'Non'}
                </dd>
              </div>
            </dl>

            {canManage && (
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => promote.mutate()}
                  disabled={promote.isPending || downgrade.isPending}
                >
                  {promote.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowUp className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Promouvoir
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => downgrade.mutate()}
                  disabled={promote.isPending || downgrade.isPending}
                >
                  {downgrade.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowDown className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Rétrograder
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucune inscription pour l'année en cours.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
