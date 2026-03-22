import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth';
import { useStudents, useClasses } from '@/hooks/use-students';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
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
import { Plus, Search, GraduationCap, Award, RefreshCw } from 'lucide-react';

export default function StudentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canCreate = user?.role === 'admin' || user?.role === 'secretary';

  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [scholarshipFilter, setScholarshipFilter] = useState('');
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, classFilter, scholarshipFilter]);

  const { data, isLoading, refetch, isFetching } = useStudents({
    name: debouncedSearch || undefined,
    status: statusFilter || undefined,
    classId: classFilter || undefined,
    scholarship: scholarshipFilter || undefined,
    page,
    limit: 20,
  });

  const { data: classesData } = useClasses();
  const classes = classesData?.data ?? [];
  const students = data?.data ?? [];
  const pagination = data?.pagination;

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
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="">Toutes les classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tous les statuts</option>
              <option value="active">Inscrit</option>
              <option value="transfer">Transféré</option>
              <option value="expelled">Expulsé</option>
              <option value="graduated">Diplômé</option>
            </select>
            <select
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={scholarshipFilter}
              onChange={(e) => setScholarshipFilter(e.target.value)}
            >
              <option value="">Toutes les bourses</option>
              <option value="true">Boursiers</option>
              <option value="false">Non boursiers</option>
            </select>
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
              description={debouncedSearch || statusFilter || classFilter || scholarshipFilter
                ? 'Essayez de modifier vos filtres.'
                : 'Commencez par ajouter votre premier élève.'
              }
            >
              {canCreate && !debouncedSearch && !statusFilter && !classFilter && (
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
                    <TableHead>NIE</TableHead>
                    <TableHead>Nom complet</TableHead>
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
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {student.nie || '—'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {student.lastName} {student.firstName}
                        {student.scholarshipRecipient && (
                          <Award className="inline ml-2 h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {student.className || '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {student.gender === 'male' ? 'M' : 'F'}
                      </TableCell>
                      <TableCell>
                        <StudentStatusBadge status={student.status} />
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
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={setPage}
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
