import { useAuth } from '@/context/auth';
import { useDashboardStats, useFinanceSummary } from '@/hooks/use-finance';
import { useClassGroups } from '@/hooks/use-class-groups';
import { useCurrency } from '@/hooks/use-currency';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, Users, CreditCard, AlertTriangle, TrendingUp, CalendarDays } from 'lucide-react';

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
  const groups = groupsData?.data ?? [];

  if (!user) return null;

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
                        {p.studentFirstName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {p.studentFirstName} {p.studentLastName}
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
