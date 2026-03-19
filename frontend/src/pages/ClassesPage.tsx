import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, School, Users } from 'lucide-react';
import { useAuth } from '@/context/auth';

const mockClasses = [
  { id: '1', name: 'PPS', gradeLevel: 1, group: 'Préscolaire', studentCount: 18 },
  { id: '2', name: 'PS', gradeLevel: 2, group: 'Préscolaire', studentCount: 22 },
  { id: '3', name: 'MS', gradeLevel: 3, group: 'Préscolaire', studentCount: 20 },
  { id: '4', name: 'CP', gradeLevel: 4, group: 'Primaire', studentCount: 30 },
  { id: '5', name: 'CE1', gradeLevel: 5, group: 'Primaire', studentCount: 28 },
  { id: '6', name: 'CE2', gradeLevel: 6, group: 'Primaire', studentCount: 25 },
  { id: '7', name: 'CM1', gradeLevel: 7, group: 'Primaire', studentCount: 27 },
  { id: '8', name: 'CM2', gradeLevel: 8, group: 'Primaire', studentCount: 24 },
  { id: '9', name: '6ème', gradeLevel: 9, group: 'Secondaire', studentCount: 32 },
  { id: '10', name: '5ème', gradeLevel: 10, group: 'Secondaire', studentCount: 30 },
  { id: '11', name: '4ème', gradeLevel: 11, group: 'Secondaire', studentCount: 28 },
  { id: '12', name: '3ème', gradeLevel: 12, group: 'Secondaire', studentCount: 26 },
];

const groupColors: Record<string, string> = {
  'Préscolaire': 'bg-amber-50 text-amber-700 border-amber-200',
  'Primaire': 'bg-blue-50 text-blue-700 border-blue-200',
  'Secondaire': 'bg-violet-50 text-violet-700 border-violet-200',
};

export default function ClassesPage() {
  const { user } = useAuth();

  // Group classes by class group
  const grouped = mockClasses.reduce<Record<string, typeof mockClasses>>((acc, cls) => {
    (acc[cls.group] ??= []).push(cls);
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="Classes"
        description="Toutes les classes de l'établissement par groupe."
      >
        {user?.role === 'admin' && (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle classe
          </Button>
        )}
      </PageHeader>

      <div className="space-y-8">
        {Object.entries(grouped).map(([group, classes]) => (
          <div key={group}>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </h2>
              <Badge variant="outline" className="text-xs">{classes.length} classes</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {classes.map((cls) => (
                <Card key={cls.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${groupColors[cls.group]}`}>
                        <School className="h-5 w-5" />
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Niv. {cls.gradeLevel}
                      </Badge>
                    </div>
                    <p className="font-semibold">{cls.name}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{cls.group}</p>
                    <div className="flex items-center gap-1.5 mt-3 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {cls.studentCount} élèves
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
