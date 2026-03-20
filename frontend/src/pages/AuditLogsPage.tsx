import { useState, useEffect } from 'react';
import { useAuditLogs } from '@/hooks/use-audit-logs';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import EmptyState from '@/components/EmptyState';
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
import { FileText } from 'lucide-react';

const actionLabels: Record<string, { label: string; color: string }> = {
  CREATE: { label: 'Création', color: 'bg-green-100 text-green-700 hover:bg-green-100' },
  UPDATE: { label: 'Modification', color: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
  DELETE: { label: 'Suppression', color: 'bg-red-100 text-red-700 hover:bg-red-100' },
};

const tableLabels: Record<string, string> = {
  students: 'Élèves',
  payments: 'Paiements',
  enrollments: 'Inscriptions',
  users: 'Utilisateurs',
  classes: 'Classes',
  class_groups: 'Groupes',
  fee_configs: 'Frais',
  versements: 'Versements',
  school_years: 'Années scolaires',
};

export default function AuditLogsPage() {
  const [actionFilter, setActionFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [actionFilter, tableFilter]);

  const { data, isLoading } = useAuditLogs({
    action: actionFilter || undefined,
    tableName: tableFilter || undefined,
    page,
    limit: 20,
  });

  const logs = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <>
      <PageHeader
        title="Journal d'audit"
        description="Historique de toutes les actions effectuées dans le système."
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">Toutes les actions</option>
              <option value="CREATE">Création</option>
              <option value="UPDATE">Modification</option>
              <option value="DELETE">Suppression</option>
            </select>
            <select
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
            >
              <option value="">Toutes les tables</option>
              {Object.entries(tableLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
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
          ) : logs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Aucune entrée trouvée"
              description={
                actionFilter || tableFilter
                  ? 'Essayez de modifier vos filtres.'
                  : "Aucune action enregistrée pour le moment."
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="hidden sm:table-cell">Table</TableHead>
                    <TableHead className="hidden md:table-cell">ID enregistrement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const action = actionLabels[log.action] ?? { label: log.action, color: '' };
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleDateString('fr-FR')}{' '}
                          {new Date(log.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell className="font-medium">{log.userName || '—'}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${action.color}`}>{action.label}</Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className="text-xs">
                            {tableLabels[log.tableName] ?? log.tableName}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                          {log.recordId ? log.recordId.slice(0, 8) : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
    </>
  );
}
