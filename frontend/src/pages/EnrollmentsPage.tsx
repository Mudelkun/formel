import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { listEnrollments } from '@/api/enrollments';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Pagination from '@/components/Pagination';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useClasses, useSchoolYears } from '@/hooks/use-students';
import { UserPlus } from 'lucide-react';

export default function EnrollmentsPage() {
  const navigate = useNavigate();
  const { data: classesData } = useClasses();
  const { data: yearsData, isLoading: yearsLoading } = useSchoolYears();

  const classes = classesData?.data ?? [];
  const years = yearsData?.data ?? [];
  const activeYear = years.find((y) => y.isActive);

  const [schoolYearId, setSchoolYearId] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [page, setPage] = useState(1);

  // Default to active year once loaded
  const effectiveYearId = schoolYearId || activeYear?.id || '';

  const { data: enrollmentsData, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['enrollments', 'list', { schoolYearId: effectiveYearId, classId: classId || undefined, page }],
    queryFn: () =>
      listEnrollments({
        schoolYearId: effectiveYearId || undefined,
        classId: classId || undefined,
        page,
        limit: 20,
      }),
    placeholderData: keepPreviousData,
    enabled: !yearsLoading,
  });

  const enrollments = enrollmentsData?.data ?? [];
  const pagination = enrollmentsData?.pagination;

  const isLoading = yearsLoading || enrollmentsLoading;

  return (
    <>
      <PageHeader
        title="Inscriptions"
        description="Consultez les inscriptions des élèves par année scolaire."
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={schoolYearId || effectiveYearId}
              onChange={(e) => {
                setSchoolYearId(e.target.value);
                setPage(1);
              }}
              className="h-8 w-full sm:w-48 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Toutes les années</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.year}{y.isActive ? ' (Active)' : ''}
                </option>
              ))}
            </select>
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setPage(1);
              }}
              className="h-8 w-full sm:w-48 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Toutes les classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : enrollments.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="Aucune inscription"
          description="Aucune inscription trouvée pour les filtres sélectionnés."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Élève</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead className="hidden md:table-cell">Année</TableHead>
                  <TableHead>Bourse</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((e) => (
                  <TableRow
                    key={e.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/students/${e.studentId}`)}
                  >
                    <TableCell className="font-medium">
                      {e.studentFirstName} {e.studentLastName}
                    </TableCell>
                    <TableCell>{e.className}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {e.schoolYear}
                    </TableCell>
                    <TableCell>
                      {e.scholarshipRecipient ? (
                        <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100">Oui</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Non</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {pagination && (
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
