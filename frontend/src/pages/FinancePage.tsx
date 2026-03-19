import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreditCard, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react';

const mockVersements = [
  {
    group: 'Préscolaire',
    versements: [
      { name: '1er versement', expected: '900 000 F', collected: '720 000 F', rate: '80%', overdue: false },
      { name: '2ème versement', expected: '1 200 000 F', collected: '480 000 F', rate: '40%', overdue: false },
      { name: '3ème versement', expected: '900 000 F', collected: '0 F', rate: '0%', overdue: false },
    ],
  },
  {
    group: 'Primaire',
    versements: [
      { name: '1er versement', expected: '3 375 000 F', collected: '3 037 500 F', rate: '90%', overdue: false },
      { name: '2ème versement', expected: '4 725 000 F', collected: '1 890 000 F', rate: '40%', overdue: true },
      { name: '3ème versement', expected: '3 375 000 F', collected: '0 F', rate: '0%', overdue: false },
    ],
  },
  {
    group: 'Secondaire',
    versements: [
      { name: '1er versement', expected: '4 060 000 F', collected: '3 654 000 F', rate: '90%', overdue: false },
      { name: '2ème versement', expected: '5 800 000 F', collected: '2 320 000 F', rate: '40%', overdue: true },
      { name: '3ème versement', expected: '4 060 000 F', collected: '0 F', rate: '0%', overdue: false },
    ],
  },
];

export default function FinancePage() {
  return (
    <>
      <PageHeader
        title="Aperçu financier"
        description="Vue d'ensemble des recettes et du recouvrement par groupe."
      >
        <Select defaultValue="2025-2026">
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2025-2026">2025-2026</SelectItem>
            <SelectItem value="2024-2025">2024-2025</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      {/* Top stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Total attendu" value="—" icon={CreditCard} />
        <StatCard label="Total collecté" value="—" icon={TrendingUp} />
        <StatCard label="Restant à collecter" value="—" icon={AlertTriangle} />
        <StatCard label="Taux global" value="—" icon={BarChart3} />
      </div>

      {/* Chart placeholder */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Recouvrement par groupe</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-56 rounded-lg border-2 border-dashed text-sm text-muted-foreground">
            Graphique comparatif — bientôt disponible
          </div>
        </CardContent>
      </Card>

      {/* Per-group breakdown */}
      <div className="space-y-6">
        {mockVersements.map((g) => (
          <Card key={g.group}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">{g.group}</CardTitle>
                <Badge variant="outline" className="text-xs">3 versements</Badge>
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
                  {g.versements.map((v) => (
                    <TableRow key={v.name}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell className="font-mono text-sm">{v.expected}</TableCell>
                      <TableCell className="font-mono text-sm">{v.collected}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: v.rate }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{v.rate}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {v.overdue ? (
                          <Badge variant="destructive" className="text-xs">En retard</Badge>
                        ) : v.rate === '0%' ? (
                          <Badge variant="secondary" className="text-xs">À venir</Badge>
                        ) : (
                          <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100">En cours</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
