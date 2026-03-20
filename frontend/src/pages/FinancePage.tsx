import { useFinanceSummary } from '@/hooks/use-finance';
import { useClassGroups, useFees } from '@/hooks/use-class-groups';
import { useSchoolYears } from '@/hooks/use-students';
import { useCurrency } from '@/hooks/use-currency';
import VersementFinanceRow from '@/components/finance/VersementFinanceRow';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreditCard, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react';

function ClassGroupSection({ groupId, groupName, schoolYearId }: { groupId: string; groupName: string; schoolYearId: string }) {
  const { data, isLoading } = useFees(groupId, schoolYearId);
  const versements = data?.versements ?? [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">{groupName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (versements.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">{groupName}</CardTitle>
            <Badge variant="outline" className="text-xs">Aucun versement</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucun frais configuré pour ce groupe.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{groupName}</CardTitle>
          <Badge variant="outline" className="text-xs">
            {versements.length} versement{versements.length > 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Versement</TableHead>
              <TableHead>Attendu</TableHead>
              <TableHead>Collecté</TableHead>
              <TableHead className="hidden sm:table-cell">Taux</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versements.map((v) => (
              <VersementFinanceRow
                key={v.id}
                versementId={v.id}
                versementName={v.name}
                dueDate={v.dueDate}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function FinancePage() {
  const { formatAmount } = useCurrency();

  const { data: schoolYearsData } = useSchoolYears();
  const schoolYears = schoolYearsData?.data ?? [];
  const activeYear = schoolYears.find((y) => y.isActive);

  const { data: summary, isLoading: summaryLoading } = useFinanceSummary();
  const { data: groupsData, isLoading: groupsLoading } = useClassGroups();
  const groups = groupsData?.data ?? [];

  const globalRate =
    summary && summary.total_expected > 0
      ? Math.round((summary.total_collected / summary.total_expected) * 100)
      : 0;

  return (
    <>
      <PageHeader
        title="Aperçu financier"
        description="Vue d'ensemble des recettes et du recouvrement par groupe."
      >
        {activeYear && (
          <Badge variant="outline" className="text-sm">
            {activeYear.year}
          </Badge>
        )}
      </PageHeader>

      {/* Top stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          label="Total attendu"
          value={summaryLoading ? '—' : formatAmount(summary?.total_expected ?? 0)}
          icon={CreditCard}
        />
        <StatCard
          label="Total collecté"
          value={summaryLoading ? '—' : formatAmount(summary?.total_collected ?? 0)}
          icon={TrendingUp}
        />
        <StatCard
          label="Restant à collecter"
          value={summaryLoading ? '—' : formatAmount(summary?.total_remaining ?? 0)}
          icon={AlertTriangle}
        />
        <StatCard
          label="Taux global"
          value={summaryLoading ? '—' : `${globalRate}%`}
          icon={BarChart3}
        />
      </div>

      {/* Chart section - bar-like display */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Recouvrement par groupe</CardTitle>
        </CardHeader>
        <CardContent>
          {groupsLoading || summaryLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun groupe de classes configuré.
            </p>
          ) : (
            <div className="space-y-4">
              {groups.map((g) => (
                <GroupBar key={g.id} groupId={g.id} groupName={g.name} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-group breakdown */}
      <div className="space-y-6">
        {groupsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : activeYear ? (
          groups.map((g) => (
            <ClassGroupSection
              key={g.id}
              groupId={g.id}
              groupName={g.name}
              schoolYearId={activeYear.id}
            />
          ))
        ) : (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground text-center">
                Aucune année scolaire active.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

function GroupBar({ groupId, groupName }: { groupId: string; groupName: string }) {
  const { data, isLoading } = useFinanceSummary({ classGroupId: groupId });
  const { formatAmount } = useCurrency();

  if (isLoading) {
    return <Skeleton className="h-8 w-full" />;
  }

  const expected = data?.total_expected ?? 0;
  const collected = data?.total_collected ?? 0;
  const rate = expected > 0 ? Math.round((collected / expected) * 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{groupName}</span>
        <span className="text-muted-foreground">
          {formatAmount(collected)} / {formatAmount(expected)}
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${rate}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-right">{rate}%</p>
    </div>
  );
}
