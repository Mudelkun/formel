import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
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
import { Plus, Search } from 'lucide-react';
import StatCard from '@/components/StatCard';
import { UserPlus, GraduationCap, School } from 'lucide-react';

const mockEnrollments = [
  { id: '1', student: 'Amadou Diallo', class: 'CP', group: 'Primaire', year: '2025-2026', scholarship: false },
  { id: '2', student: 'Fatou Sow', class: '6ème', group: 'Secondaire', year: '2025-2026', scholarship: true },
  { id: '3', student: 'Moussa Ba', class: 'CM2', group: 'Primaire', year: '2025-2026', scholarship: false },
  { id: '4', student: 'Aïssatou Ndiaye', class: 'MS', group: 'Préscolaire', year: '2025-2026', scholarship: false },
  { id: '5', student: 'Ousmane Fall', class: '3ème', group: 'Secondaire', year: '2025-2026', scholarship: true },
];

export default function EnrollmentsPage() {
  return (
    <>
      <PageHeader
        title="Inscriptions"
        description="Gérez les inscriptions des élèves pour l'année scolaire en cours."
      >
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle inscription
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <StatCard label="Total inscriptions" value="—" icon={UserPlus} />
        <StatCard label="Élèves boursiers" value="—" icon={GraduationCap} />
        <StatCard label="Classes complètes" value="—" icon={School} />
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher un élève..." className="pl-9" />
            </div>
            <Select>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Classe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les classes</SelectItem>
                <SelectItem value="cp">CP</SelectItem>
                <SelectItem value="6eme">6ème</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Groupe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les groupes</SelectItem>
                <SelectItem value="prescolaire">Préscolaire</SelectItem>
                <SelectItem value="primaire">Primaire</SelectItem>
                <SelectItem value="secondaire">Secondaire</SelectItem>
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
                <TableHead>Classe</TableHead>
                <TableHead className="hidden sm:table-cell">Groupe</TableHead>
                <TableHead className="hidden md:table-cell">Année</TableHead>
                <TableHead>Bourse</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockEnrollments.map((e) => (
                <TableRow key={e.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{e.student}</TableCell>
                  <TableCell>{e.class}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className="text-xs">{e.group}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{e.year}</TableCell>
                  <TableCell>
                    {e.scholarship ? (
                      <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100">Oui</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Non</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-xs">Voir</Button>
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
