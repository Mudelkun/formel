import { useAuth } from '@/context/auth';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Users, CreditCard, AlertTriangle, TrendingUp, CalendarDays } from 'lucide-react';

const roleGreetings: Record<string, string> = {
  admin: 'Voici un aperçu global de votre établissement.',
  secretary: 'Voici les informations essentielles pour votre journée.',
  teacher: 'Voici un aperçu de vos classes.',
  accountant: 'Voici le résumé financier de l\'établissement.',
};

export default function DashboardPage() {
  const { user } = useAuth();
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
          value="—"
          icon={GraduationCap}
          trend="Année en cours"
        />
        <StatCard
          label="Classes actives"
          value="—"
          icon={Users}
          trend="Tous les niveaux"
        />
        <StatCard
          label="Paiements ce mois"
          value="—"
          icon={CreditCard}
          trend="Mars 2026"
        />
        <StatCard
          label="Versements en retard"
          value="—"
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
              <Badge variant="secondary" className="text-xs">Aujourd'hui</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
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
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-1">
                    <div className="h-3.5 w-36 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                  </div>
                  <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
                </div>
              ))}
            </div>
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
            <div className="flex items-center justify-center h-48 rounded-lg border-2 border-dashed text-sm text-muted-foreground">
              Graphique des recettes — bientôt disponible
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
