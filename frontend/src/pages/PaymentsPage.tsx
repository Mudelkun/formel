import PageHeader from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Search, Check, Clock, CreditCard, TrendingUp } from 'lucide-react';
import StatCard from '@/components/StatCard';

const mockPayments = [
  { id: '1', student: 'Amadou Diallo', class: 'CP', amount: '50 000 F', date: '15/10/2025', type: 'Scolarité', method: 'Espèces', status: 'completed' },
  { id: '2', student: 'Fatou Sow', class: '6ème', amount: '5 000 F', date: '20/10/2025', type: 'Livres', method: 'Virement', status: 'completed' },
  { id: '3', student: 'Moussa Ba', class: 'CM2', amount: '30 000 F', date: '25/10/2025', type: 'Scolarité', method: 'Espèces', status: 'pending' },
  { id: '4', student: 'Aïssatou Ndiaye', class: 'MS', amount: '15 000 F', date: '01/11/2025', type: 'Scolarité', method: 'Mobile', status: 'completed' },
  { id: '5', student: 'Ousmane Fall', class: '3ème', amount: '35 000 F', date: '05/11/2025', type: 'Scolarité', method: 'Espèces', status: 'pending' },
  { id: '6', student: 'Mariama Diop', class: 'CE1', amount: '8 000 F', date: '10/11/2025', type: 'Livres', method: 'Espèces', status: 'completed' },
];

export default function PaymentsPage() {
  return (
    <>
      <PageHeader
        title="Paiements"
        description="Suivi de tous les paiements enregistrés."
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard label="Total collecté" value="—" icon={CreditCard} trend="Année en cours" />
        <StatCard label="En attente" value="—" icon={Clock} trend="À confirmer" />
        <StatCard label="Taux de recouvrement" value="—" icon={TrendingUp} />
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher par élève..." className="pl-9" />
            </div>
            <Select>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="tuition">Scolarité</SelectItem>
                <SelectItem value="books">Livres</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="completed">Confirmé</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
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
                <TableHead>Élève</TableHead>
                <TableHead className="hidden sm:table-cell">Classe</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="hidden lg:table-cell">Type</TableHead>
                <TableHead className="hidden lg:table-cell">Méthode</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockPayments.map((p) => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{p.student}</TableCell>
                  <TableCell className="hidden sm:table-cell">{p.class}</TableCell>
                  <TableCell className="font-mono text-sm">{p.amount}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{p.date}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant="outline" className="text-xs">{p.type}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">{p.method}</TableCell>
                  <TableCell>
                    {p.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                        <Check className="h-3 w-3" /> Confirmé
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                        <Clock className="h-3 w-3" /> En attente
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
