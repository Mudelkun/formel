import { useAuth } from '@/context/auth';
import { usePromoteStudent, useDowngradeStudent, useScholarships, useUpdateEnrollmentStatus } from '@/hooks/use-students';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraduationCap, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import type { StudentDetail } from '@/types/student';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  enrolled: { label: 'Inscrit', variant: 'default' },
  transferred: { label: 'Transféré', variant: 'secondary' },
  inactive: { label: 'Inactif', variant: 'destructive' },
  graduated: { label: 'Diplômé', variant: 'outline' },
};

interface Props {
  student: StudentDetail;
}

export default function StudentEnrollmentCard({ student }: Props) {
  const { user } = useAuth();
  const enrollment = student.currentEnrollment;
  const isAdmin = user?.role === 'admin';
  const canManage = isAdmin || user?.role === 'secretary';

  const promote = usePromoteStudent(student.id);
  const downgrade = useDowngradeStudent(student.id);
  const updateStatus = useUpdateEnrollmentStatus(student.id);
  const { data: scholarships } = useScholarships(enrollment?.enrollmentId);
  const hasScholarship = !!scholarships && scholarships.length > 0;

  const currentStatus = enrollment?.enrollmentStatus ?? 'enrolled';
  const statusInfo = statusLabels[currentStatus] ?? statusLabels.enrolled;

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
                <dt className="text-xs text-muted-foreground">Statut</dt>
                <dd className="mt-0.5">
                  <Badge variant={statusInfo.variant} className="text-xs">
                    {statusInfo.label}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Boursier</dt>
                <dd className="text-sm font-medium">
                  {hasScholarship ? 'Oui' : 'Non'}
                </dd>
              </div>
            </dl>

            {isAdmin && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1.5">Changer le statut</p>
                <div className="flex gap-1.5">
                  {(['enrolled', 'transferred', 'inactive', 'graduated'] as const).map((s) => {
                    if (s === currentStatus) return null;
                    const info = statusLabels[s];
                    return (
                      <Button
                        key={s}
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ enrollmentId: enrollment.enrollmentId, status: s })}
                      >
                        {updateStatus.isPending ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : null}
                        {info.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {canManage && currentStatus === 'enrolled' && (
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
