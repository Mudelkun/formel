import { useAuth } from '@/context/auth';
import { useDashboardStats, useFinanceSummary, useMonthlyPayments, usePaymentMethodBreakdown } from '@/hooks/use-finance';
import { useClassGroups } from '@/hooks/use-class-groups';
import { useCurrency } from '@/hooks/use-currency';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, Users, CreditCard, AlertTriangle, TrendingUp, CalendarDays } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

// Colors chosen to be readable in both light and dark mode
const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ef4444', // red
  '#06b6d4', // cyan
];

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Aoû',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc',
};

function formatMonthLabel(month: string) {
  const parts = month.split('-');
  return MONTH_LABELS[parts[1]] || parts[1];
}

const roleGreetings: Record<string, string> = {
  admin: 'Voici un aperçu global de votre établissement.',
  secretary: 'Voici les informations essentielles pour votre journée.',
  teacher: 'Voici un aperçu de vos classes.',
  accountant: 'Voici le résumé financier de l\'établissement.',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const { data: stats, isLoading } = useDashboardStats();
  const { data: groupsData } = useClassGroups();
  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyPayments();
  const { data: methodsData, isLoading: methodsLoading } = usePaymentMethodBreakdown();
  const groups = groupsData?.data ?? [];

  if (!user) return null;

  const chartData = (monthlyData ?? []).map((m) => ({
    month: formatMonthLabel(m.month),
    collected: m.collected,
    pending: m.pending,
  }));

  const pieData = (methodsData ?? []).filter((m) => m.total > 0);

  return (
    <>
      <PageHeader
        title={`Bonjour, ${user.name.split(' ')[0]}`}
        description={roleGreetings[user.role]}
      />

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          label="Élèves inscrits"
          value={isLoading ? '—' : String(stats?.totalStudents ?? 0)}
          icon={GraduationCap}
          trend="Année en cours"
        />
        <StatCard
          label="Classes actives"
          value={isLoading ? '—' : String(stats?.totalClasses ?? 0)}
          icon={Users}
          trend="Tous les niveaux"
        />
        <StatCard
          label="Paiements ce mois"
          value={isLoading ? '—' : formatAmount(stats?.paymentsThisMonth ?? 0)}
          icon={CreditCard}
        />
        <StatCard
          label="Versements en retard"
          value={isLoading ? '—' : String(stats?.overdueVersements ?? 0)}
          icon={AlertTriangle}
          trend="À surveiller"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* Monthly payment trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Évolution des paiements</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">
                Aucune donnée de paiement disponible.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'currentColor' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'currentColor' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
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
                  <Area
                    type="monotone"
                    dataKey="collected"
                    name="Confirmés"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCollected)"
                  />
                  <Area
                    type="monotone"
                    dataKey="pending"
                    name="En attente"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPending)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment methods pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Méthodes de paiement</CardTitle>
          </CardHeader>
          <CardContent>
            {methodsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">
                Aucune donnée disponible.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="total"
                    nameKey="label"
                    cx="50%"
                    cy="45%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--popover-foreground))',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [formatAmount(value)]}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent payments */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Paiements récents</CardTitle>
              <Badge variant="secondary" className="text-xs">Derniers paiements</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                      <div className="space-y-1">
                        <div className="h-3.5 w-28 rounded bg-muted animate-pulse" />
                        <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                      </div>
                    </div>
                    <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                  </div>
                ))}
              </div>
            ) : !stats?.recentPayments || stats.recentPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun paiement récent.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recentPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                        {p.studentLastName.charAt(0)}{p.studentFirstName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {p.studentLastName} {p.studentFirstName}
                        </p>
                        <p className="text-xs text-muted-foreground">{p.className}</p>
                      </div>
                    </div>
                    <span className="text-sm font-mono font-medium">
                      {formatAmount(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming due dates */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Échéances à venir</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-1">
                      <div className="h-3.5 w-36 rounded bg-muted animate-pulse" />
                      <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                    </div>
                    <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
                  </div>
                ))}
              </div>
            ) : !stats?.upcomingDueDates || stats.upcomingDueDates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucune échéance à venir.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.upcomingDueDates.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Échéance : {new Date(d.dueDate).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono">
                      {formatAmount(d.amount)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue overview */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Aperçu des recettes</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : groups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun groupe de classes configuré.
              </p>
            ) : (
              <div className="space-y-5">
                {groups.map((g) => (
                  <RevenueGroupBar key={g.id} groupId={g.id} groupName={g.name} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function RevenueGroupBar({ groupId, groupName }: { groupId: string; groupName: string }) {
  const { data, isLoading } = useFinanceSummary({ classGroupId: groupId });
  const { formatAmount } = useCurrency();

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  const expected = data?.total_expected ?? 0;
  const collected = data?.total_collected ?? 0;
  const rate = expected > 0 ? Math.round((collected / expected) * 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{groupName}</span>
        <span className="text-xs text-muted-foreground">
          {formatAmount(collected)} / {formatAmount(expected)} ({rate}%)
        </span>
      </div>
      <div className="relative h-4 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${rate}%` }}
        />
      </div>
    </div>
  );
}
