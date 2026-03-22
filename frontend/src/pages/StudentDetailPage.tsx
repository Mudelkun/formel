import { useParams, Link } from 'react-router-dom';
import { useStudent, useStudentBalance } from '@/hooks/use-students';
import { useCurrency } from '@/hooks/use-currency';
import PageHeader from '@/components/PageHeader';
import StudentPhotoCard from '@/components/students/StudentPhotoCard';
import StudentPersonalInfo from '@/components/students/StudentPersonalInfo';
import StudentEnrollmentCard from '@/components/students/StudentEnrollmentCard';
import StudentContactsCard from '@/components/students/StudentContactsCard';
import StudentDocumentsCard from '@/components/students/StudentDocumentsCard';
import StudentBalanceCard from '@/components/students/StudentBalanceCard';
import StudentPaymentHistory from '@/components/students/StudentPaymentHistory';
import StudentScholarshipCard from '@/components/students/StudentScholarshipCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: student, isLoading, isError } = useStudent(id!);

  if (isLoading) {
    return (
      <>
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </>
    );
  }

  if (isError || !student) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-lg font-medium mb-2">Élève introuvable</p>
        <p className="text-sm text-muted-foreground mb-4">
          L'élève demandé n'existe pas ou a été supprimé.
        </p>
        <Link to="/students">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <Link
          to="/students"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour aux élèves
        </Link>
        <PageHeader
          title={`${student.firstName} ${student.lastName}`}
          description={
            student.currentEnrollment
              ? `${student.currentEnrollment.className} — NIE : ${student.nie || 'Non assigné'}`
              : `NIE : ${student.nie || 'Non assigné'}`
          }
        />
      </div>

      <OverdueAlert studentId={student.id} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <StudentPersonalInfo student={student} />
          <StudentBalanceCard studentId={student.id} />
          <StudentPaymentHistory student={student} />
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          <StudentPhotoCard student={student} />
          <StudentEnrollmentCard student={student} />
          <StudentScholarshipCard student={student} />
          <StudentContactsCard student={student} />
          <StudentDocumentsCard studentId={student.id} />
        </div>
      </div>
    </>
  );
}

function OverdueAlert({ studentId }: { studentId: string }) {
  const { data: balance } = useStudentBalance(studentId);
  const { formatAmount } = useCurrency();

  if (!balance) return null;

  const overdueVersements = balance.versements.filter((v) => v.isOverdue);
  if (overdueVersements.length === 0) return null;

  const totalOverdue = overdueVersements.reduce((s, v) => s + v.amountRemaining, 0);

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
      <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-destructive">
          {overdueVersements.length} versement{overdueVersements.length > 1 ? 's' : ''} en retard
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {overdueVersements.map((v) => v.name).join(', ')} — Total restant : {formatAmount(totalOverdue)}
        </p>
      </div>
    </div>
  );
}
