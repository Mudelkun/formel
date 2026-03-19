import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, Layers, Settings, School } from 'lucide-react';
import { useAuth } from '@/context/auth';

const mockGroups = [
  {
    id: '1',
    name: 'Préscolaire',
    classes: ['PPS', 'PS', 'MS'],
    bookFee: '5 000 F',
    versements: [
      { number: 1, name: '1er versement', amount: '15 000 F', dueDate: '15 Oct 2025' },
      { number: 2, name: '2ème versement', amount: '20 000 F', dueDate: '15 Jan 2026' },
      { number: 3, name: '3ème versement', amount: '15 000 F', dueDate: '15 Avr 2026' },
    ],
  },
  {
    id: '2',
    name: 'Primaire',
    classes: ['CP', 'CE1', 'CE2', 'CM1', 'CM2'],
    bookFee: '8 000 F',
    versements: [
      { number: 1, name: '1er versement', amount: '25 000 F', dueDate: '15 Oct 2025' },
      { number: 2, name: '2ème versement', amount: '35 000 F', dueDate: '15 Jan 2026' },
      { number: 3, name: '3ème versement', amount: '25 000 F', dueDate: '15 Avr 2026' },
    ],
  },
  {
    id: '3',
    name: 'Secondaire',
    classes: ['6ème', '5ème', '4ème', '3ème'],
    bookFee: '12 000 F',
    versements: [
      { number: 1, name: '1er versement', amount: '35 000 F', dueDate: '15 Oct 2025' },
      { number: 2, name: '2ème versement', amount: '50 000 F', dueDate: '15 Jan 2026' },
      { number: 3, name: '3ème versement', amount: '35 000 F', dueDate: '15 Avr 2026' },
    ],
  },
];

export default function ClassGroupsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <>
      <PageHeader
        title="Groupes de classes"
        description="Configuration des groupes, versements et frais par année scolaire."
      >
        {isAdmin && (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau groupe
          </Button>
        )}
      </PageHeader>

      <div className="space-y-6">
        {mockGroups.map((group) => {
          const total = group.versements.reduce((s, v) => s + parseInt(v.amount.replace(/\D/g, '')), 0);
          return (
            <Card key={group.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Layers className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">{group.name}</CardTitle>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <School className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          {group.classes.join(', ')}
                        </p>
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button variant="outline" size="sm">
                      <Settings className="mr-2 h-3.5 w-3.5" />
                      Configurer
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {group.versements.map((v) => (
                    <div key={v.number} className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">{v.name}</p>
                      <p className="text-lg font-semibold mt-0.5">{v.amount}</p>
                      <p className="text-xs text-muted-foreground mt-1">Échéance : {v.dueDate}</p>
                    </div>
                  ))}
                  <div className="rounded-lg border p-3 bg-muted/30">
                    <p className="text-xs text-muted-foreground">Frais de livres</p>
                    <p className="text-lg font-semibold mt-0.5">{group.bookFee}</p>
                    <Separator className="my-2" />
                    <p className="text-xs text-muted-foreground">Total annuel</p>
                    <p className="text-sm font-semibold">
                      {(total + parseInt(group.bookFee.replace(/\D/g, ''))).toLocaleString('fr-FR')} F
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
