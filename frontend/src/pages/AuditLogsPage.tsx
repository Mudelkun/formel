import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';

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

const mockLogs = [
  { id: '1', user: 'Admin Principal', action: 'CREATE', table: 'students', date: '18/03/2026 14:32', recordId: 'abc-123' },
  { id: '2', user: 'Secrétaire Marie', action: 'CREATE', table: 'payments', date: '18/03/2026 14:28', recordId: 'def-456' },
  { id: '3', user: 'Admin Principal', action: 'UPDATE', table: 'fee_configs', date: '18/03/2026 13:15', recordId: 'ghi-789' },
  { id: '4', user: 'Admin Principal', action: 'CREATE', table: 'enrollments', date: '18/03/2026 12:45', recordId: 'jkl-012' },
  { id: '5', user: 'Secrétaire Marie', action: 'UPDATE', table: 'students', date: '18/03/2026 11:30', recordId: 'mno-345' },
  { id: '6', user: 'Admin Principal', action: 'DELETE', table: 'users', date: '17/03/2026 16:00', recordId: 'pqr-678' },
];

export default function AuditLogsPage() {
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
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher par utilisateur..." className="pl-9" />
            </div>
            <Select>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="CREATE">Création</SelectItem>
                <SelectItem value="UPDATE">Modification</SelectItem>
                <SelectItem value="DELETE">Suppression</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Table" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {Object.entries(tableLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
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
              {mockLogs.map((log) => {
                const action = actionLabels[log.action] ?? { label: log.action, color: '' };
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{log.date}</TableCell>
                    <TableCell className="font-medium">{log.user}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${action.color}`}>{action.label}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className="text-xs">
                        {tableLabels[log.table] ?? log.table}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                      {log.recordId}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
