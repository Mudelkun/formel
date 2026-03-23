import { useFinanceSummary, useGroupBreakdown, useMonthlyPayments } from '@/hooks/use-finance';
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
import { CreditCard, TrendingUp, AlertTriangle, Gift } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from 'recharts';

const CHART_COLORS = {
  collected: '#10b981',
  remaining: '#ef4444',
  pending: '#f59e0b',
  expected: '#3b82f6',
  scholarships: '#8b5cf6',
};

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
  const { data: groupBreakdown, isLoading: breakdownLoading } = useGroupBreakdown();
  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyPayments();
  const groups = groupsData?.data ?? [];

  const totalScholarships = summary?.total_scholarships ?? 0;
  const collectionRate = summary && summary.total_expected > 0
    ? Math.round((summary.total_collected / summary.total_expected) * 100)
    : 0;

  // Cumulative revenue chart data
  const cumulativeData = (() => {
    if (!monthlyData) return [];
    let cumCollected = 0;
    let cumPending = 0;
    return monthlyData.map((m) => {
      cumCollected += m.collected;
      cumPending += m.pending;
      const parts = m.month.split('-');
      const labels: Record<string, string> = {
        '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr',
        '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Aoû',
        '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc',
      };
      return {
        month: labels[parts[1]] || parts[1],
        collected: Math.round(cumCollected),
        total: Math.round(cumCollected + cumPending),
      };
    });
  })();

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
          trend={summaryLoading ? undefined : `${collectionRate}% collecté`}
        />
        <StatCard
          label="Restant à collecter"
          value={summaryLoading ? '—' : formatAmount(summary?.total_remaining ?? 0)}
          icon={AlertTriangle}
        />
        <StatCard
          label="Total bourses"
          value={summaryLoading ? '—' : formatAmount(totalScholarships)}
          icon={Gift}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Group comparison bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Recouvrement par groupe</CardTitle>
          </CardHeader>
          <CardContent>
            {breakdownLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : !groupBreakdown || groupBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">
                Aucun groupe configuré.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={groupBreakdown}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--popover-foreground))',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [formatAmount(value)]}
                    labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px' }}
                  />
                  <Bar dataKey="collected" name="Collecté" fill={CHART_COLORS.collected} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="remaining" name="Restant" fill={CHART_COLORS.remaining} radius={[4, 4, 0, 0]} opacity={0.7} />
                  <Bar dataKey="scholarships" name="Bourses" fill={CHART_COLORS.scholarships} radius={[4, 4, 0, 0]} opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Cumulative revenue line chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Revenus cumulés</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : cumulativeData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">
                Aucune donnée disponible.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={cumulativeData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--popover-foreground))',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [formatAmount(value)]}
                    labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="collected"
                    name="Collecté"
                    stroke={CHART_COLORS.collected}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: CHART_COLORS.collected }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total (incl. en attente)"
                    stroke={CHART_COLORS.pending}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3, fill: CHART_COLORS.pending }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-group student & rate overview */}
      {!breakdownLoading && groupBreakdown && groupBreakdown.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
          {groupBreakdown.map((g) => {
            const rate = g.expected > 0 ? Math.round((g.collected / g.expected) * 100) : 0;
            return (
              <Card key={g.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium">{g.name}</p>
                    <Badge variant="outline" className="text-xs">
                      {g.studentCount} élève{g.studentCount !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Taux de recouvrement</span>
                      <span className="font-medium">{rate}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${rate}%`,
                          backgroundColor: rate >= 75 ? CHART_COLORS.collected : rate >= 40 ? CHART_COLORS.pending : CHART_COLORS.remaining,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{formatAmount(g.collected)}</span>
                      <span className="text-muted-foreground">{formatAmount(g.expected)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Per-group versement breakdown */}
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
