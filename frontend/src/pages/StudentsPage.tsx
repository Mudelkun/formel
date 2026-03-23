import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth';
import { useStudents, useClasses } from '@/hooks/use-students';
import PageHeader from '@/components/PageHeader';
import CursorPagination from '@/components/CursorPagination';
import StudentStatusBadge from '@/components/students/StudentStatusBadge';
import EmptyState from '@/components/EmptyState';
import CreateStudentDialog from '@/components/students/CreateStudentDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, GraduationCap, Award, RefreshCw, AlertTriangle } from 'lucide-react';

const PAGE_SIZE = 20;

export default function StudentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canCreate = user?.role === 'admin' || user?.role === 'secretary';
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [overdueFilter, setOverdueFilter] = useState(false);
  const [scholarshipFilter, setScholarshipFilter] = useState('');
  // Cursor stack: [undefined, cursor1, cursor2, ...] — index 0 = first page (no cursor)
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);

  const resetPagination = useCallback(() => {
    setCursorStack([undefined]);
    setPageIndex(0);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      resetPagination();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, resetPagination]);

  // Reset pagination on filter change
  useEffect(() => {
    resetPagination();
  }, [enrollmentStatusFilter, classFilter, scholarshipFilter, overdueFilter, resetPagination]);

  const currentCursor = cursorStack[pageIndex];

  const { data, isLoading, refetch, isFetching } = useStudents({
    name: debouncedSearch || undefined,
    enrollmentStatus: enrollmentStatusFilter || undefined,
    overdue: overdueFilter ? 'true' : undefined,
    classId: classFilter || undefined,
    scholarship: scholarshipFilter || undefined,
    cursor: currentCursor,
    limit: PAGE_SIZE,
  });

  const { data: classesData } = useClasses();
  const classes = classesData?.data ?? [];
  const students = data?.data ?? [];
  const pagination = data?.pagination;

  const goToNextPage = useCallback(() => {
    if (!pagination?.nextCursor) return;
    const nextIndex = pageIndex + 1;
    setCursorStack((prev) => {
      const updated = [...prev];
      updated[nextIndex] = pagination.nextCursor!;
      return updated;
    });
    setPageIndex(nextIndex);
  }, [pagination, pageIndex]);

  const goToPrevPage = useCallback(() => {
    if (pageIndex <= 0) return;
    setPageIndex(pageIndex - 1);
  }, [pageIndex]);

  return (
    <>
      <PageHeader
        title="Élèves"
        description="Gérez les dossiers de tous les élèves inscrits."
      >
        {canCreate && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvel élève
          </Button>
        )}
      </PageHeader>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un élève..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="">Toutes les classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={enrollmentStatusFilter}
              onChange={(e) => setEnrollmentStatusFilter(e.target.value)}
            >
              <option value="">Inscrits</option>
              <option value="transferred">Transférés</option>
              <option value="inactive">Inactifs</option>
              <option value="graduated">Diplômés</option>
            </select>
            <select
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={scholarshipFilter}
              onChange={(e) => setScholarshipFilter(e.target.value)}
            >
              <option value="">Toutes les bourses</option>
              <option value="true">Boursiers</option>
              <option value="false">Non boursiers</option>
            </select>
            <Button
              variant={overdueFilter ? 'destructive' : 'outline'}
              size="sm"
              className="h-8 shrink-0 gap-1.5"
              onClick={() => setOverdueFilter((v) => !v)}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              En retard
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : students.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="Aucun élève trouvé"
              description={debouncedSearch || enrollmentStatusFilter || classFilter || scholarshipFilter || overdueFilter
                ? 'Essayez de modifier vos filtres.'
                : 'Commencez par ajouter votre premier élève.'
              }
            >
              {canCreate && !debouncedSearch && !enrollmentStatusFilter && !classFilter && !overdueFilter && (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvel élève
                </Button>
              )}
            </EmptyState>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Élève</TableHead>
                    <TableHead className="hidden md:table-cell">Classe</TableHead>
                    <TableHead className="hidden sm:table-cell">Genre</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow
                      key={student.id}
                      className={`cursor-pointer hover:bg-muted/50 ${
                        student.scholarshipRecipient ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''
                      }`}
                      onClick={() => navigate(`/students/${student.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {student.profilePhotoUrl ? (
                            <img
                              src={student.profilePhotoUrl}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                              {student.lastName.charAt(0)}{student.firstName.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {student.lastName} {student.firstName}
                              {student.scholarshipRecipient && (
                                <Award className="inline ml-2 h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                              )}
                            </p>
                            {student.nie && (
                              <p className="text-xs text-muted-foreground">{student.nie}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {student.className || '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {student.gender === 'male' ? 'M' : 'F'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <StudentStatusBadge status={student.enrollmentStatus ?? 'enrolled'} />
                          {student.enrollmentStatus === 'enrolled' && student.hasOverdue && (
                            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-xs">
                          Voir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {pagination && (
                <CursorPagination
                  hasPreviousPage={pageIndex > 0}
                  hasNextPage={pagination.hasNextPage}
                  onPrevious={goToPrevPage}
                  onNext={goToNextPage}
                  totalCount={pagination.totalCount}
                  pageSize={PAGE_SIZE}
                  pageIndex={pageIndex}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {canCreate && (
        <CreateStudentDialog open={createOpen} onOpenChange={setCreateOpen} />
      )}
    </>
  );
}
