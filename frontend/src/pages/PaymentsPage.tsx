import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth';
import { usePayments } from '@/hooks/use-payments';
import { useCurrency } from '@/hooks/use-currency';
import { useFinanceSummary } from '@/hooks/use-finance';
import { useClasses } from '@/hooks/use-students';
import { useClassGroups } from '@/hooks/use-class-groups';
import CreatePaymentDialog from '@/components/payments/CreatePaymentDialog';
import PaymentDetailDialog from '@/components/payments/PaymentDetailDialog';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import CursorPagination from '@/components/CursorPagination';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus, Search, Check, Clock, X, CreditCard, TrendingUp } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; icon: typeof Check }> = {
  completed: { label: 'Confirmé', color: 'text-green-600', icon: Check },
  pending: { label: 'En attente', color: 'text-amber-600', icon: Clock },
  failed: { label: 'Rejeté', color: 'text-red-600', icon: X },
};

export default function PaymentsPage() {
  const { user } = useAuth();
  const { formatAmount } = useCurrency();

  const PAGE_SIZE = 20;
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
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
  }, [statusFilter, classFilter, groupFilter, resetPagination]);

  const currentCursor = cursorStack[pageIndex];

  const { data: classesData } = useClasses();
  const classList = classesData?.data ?? [];
  const { data: groupsData } = useClassGroups();
  const groupList = groupsData?.data ?? [];

  const { data, isLoading } = usePayments({
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    classId: classFilter || undefined,
    classGroupId: groupFilter || undefined,
    cursor: currentCursor,
    limit: PAGE_SIZE,
  });

  const { data: summary } = useFinanceSummary({
    classId: classFilter || undefined,
    classGroupId: groupFilter || undefined,
  });

  const payments = data?.data ?? [];
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

  const canCreate = user?.role === 'admin' || user?.role === 'secretary';

  return (
    <>
      <PageHeader
        title="Paiements"
        description="Suivi de tous les paiements enregistrés."
      >
        {canCreate && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau paiement
          </Button>
        )}
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard
          label="Total collecté"
          value={summary ? formatAmount(summary.total_collected) : '—'}
          icon={CreditCard}
          trend="Année en cours"
        />
        <StatCard
          label="En attente"
          value={summary ? formatAmount(summary.total_pending) : '—'}
          icon={Clock}
          trend="Non confirmé"
        />
        <StatCard
          label="Taux de recouvrement"
          value={
            summary && summary.total_expected > 0
              ? `${Math.round((summary.total_collected / summary.total_expected) * 100)}%`
              : '—'
          }
          icon={TrendingUp}
        />
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par élève..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tous les statuts</option>
              <option value="completed">Confirmé</option>
              <option value="pending">En attente</option>
              <option value="failed">Rejeté</option>
            </select>
            <select
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={groupFilter}
              onChange={(e) => { setGroupFilter(e.target.value); setClassFilter(''); }}
            >
              <option value="">Tous les groupes</option>
              {groupList.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <select
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="">Toutes les classes</option>
              {(groupFilter ? classList.filter((c) => c.classGroupId === groupFilter) : classList).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
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
          ) : payments.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="Aucun paiement trouvé"
              description={
                debouncedSearch || statusFilter
                  ? 'Essayez de modifier vos filtres.'
                  : 'Aucun paiement enregistré pour le moment.'
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Élève</TableHead>
                    <TableHead className="hidden sm:table-cell">Classe</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead className="hidden lg:table-cell">Type</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => {
                    const cfg = statusConfig[p.status] ?? statusConfig.pending;
                    const Icon = cfg.icon;
                    return (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedPaymentId(p.id)}
                      >
                        <TableCell className="font-medium">
                          {p.studentFirstName} {p.studentLastName}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {p.className || '—'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatAmount(p.amount)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {new Date(p.paymentDate).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="outline" className="text-xs">
                            {p.isBookPayment ? 'Livres' : 'Scolarité'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 text-xs ${cfg.color}`}>
                            <Icon className="h-3 w-3" /> {cfg.label}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
        <CreatePaymentDialog open={createOpen} onOpenChange={setCreateOpen} />
      )}

      {selectedPaymentId && (
        <PaymentDetailDialog
          paymentId={selectedPaymentId}
          open={!!selectedPaymentId}
          onOpenChange={(open) => !open && setSelectedPaymentId(null)}
        />
      )}
    </>
  );
}
