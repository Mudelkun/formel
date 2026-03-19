import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, CalendarDays, Check } from 'lucide-react';
import { useAuth } from '@/context/auth';

const mockYears = [
  { id: '1', year: '2025-2026', startDate: '1 Sept 2025', endDate: '30 Juin 2026', isActive: true },
  { id: '2', year: '2024-2025', startDate: '2 Sept 2024', endDate: '28 Juin 2025', isActive: false },
  { id: '3', year: '2023-2024', startDate: '4 Sept 2023', endDate: '29 Juin 2024', isActive: false },
];

export default function SchoolYearsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <>
      <PageHeader
        title="Années scolaires"
        description="Gérez les années scolaires et activez l'année en cours."
      >
        {isAdmin && (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle année
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockYears.map((year) => (
          <Card
            key={year.id}
            className={year.isActive ? 'border-primary/50 shadow-sm' : ''}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <CalendarDays className="h-5 w-5 text-muted-foreground" />
                </div>
                {year.isActive ? (
                  <Badge className="text-xs">
                    <Check className="mr-1 h-3 w-3" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Inactive</Badge>
                )}
              </div>
              <p className="text-lg font-semibold">{year.year}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {year.startDate} — {year.endDate}
              </p>
              {isAdmin && !year.isActive && (
                <Button variant="outline" size="sm" className="mt-4 w-full">
                  Activer cette année
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
